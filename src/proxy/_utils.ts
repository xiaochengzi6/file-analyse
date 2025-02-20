import * as recast from "recast";
import { MagicastError } from "../error";
import type { ASTNode } from "../types";
import generate from '@babel/generator'

export const LITERALS_AST = new Set([
  "Literal",
  "StringLiteral",
  "NumericLiteral",
  "BooleanLiteral",
  "NullLiteral",
  "RegExpLiteral",
  "BigIntLiteral",
]);

export const LITERALS_TYPEOF = new Set([
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "undefined",
]);

const b = recast.types.builders;

export function isValidPropName(name: string) {
  return /^[$A-Z_a-z][\w$]*$/.test(name);
}

const PROXY_KEY = "__magicast_proxy";

/**
 * 根据 value 类型创建并返回 ast 节点
 * @param value 
 * @param seen 
 * @returns 
 */
export function literalToAst(value: any, seen = new Set()): ASTNode {
  if (value === undefined) {
    return b.identifier("undefined") as any;
  }
  if (value === null) {
    // eslint-disable-next-line unicorn/no-null
    return b.nullLiteral()
  }
  if (LITERALS_TYPEOF.has(typeof value)) {

    if(typeof value === 'string'){
      return b.stringLiteral(value)
    }
    if(typeof value === 'number'){
      return b.numericLiteral(value)
    }
    if(typeof value === 'boolean'){
      return b.booleanLiteral(value)
    }
    if(typeof value === 'bigint'){
      return b.bigIntLiteral(value as any) as any 
    }
   
    return b.literal(value) as any;
  }
  // 存在 相互引用关系 抛错
  if (seen.has(value)) {
    throw new MagicastError("Can not serialize circular reference");
  }
  seen.add(value);

  // forward proxy
  if (value[PROXY_KEY]) {
    return value.$ast;
  }

  if (value instanceof RegExp) {
    const regex = b.regExpLiteral(value.source, value.flags) as any;
    // seems to be a bug in recast
    delete regex.extra.raw;
    return regex;
  }
  if (value instanceof Set) {
    return b.newExpression(b.identifier("Set"), [
      b.arrayExpression([...value].map((n) => literalToAst(n, seen)) as any),
    ]) as any;
  }
  if (value instanceof Date) {
    return b.newExpression(b.identifier("Date"), [
      b.literal(value.toISOString()),
    ]) as any;
  }
  if (value instanceof Map) {
    return b.newExpression(b.identifier("Map"), [
      b.arrayExpression(
        [...value].map(([key, value]) => {
          return b.arrayExpression([
            literalToAst(key, seen) as any,
            literalToAst(value, seen) as any,
          ]) as any;
        }) as any
      ),
    ]) as any;
  }
  if (Array.isArray(value)) {
    return b.arrayExpression(
      value.map((n) => literalToAst(n, seen)) as any
    ) as any;
  }
  if (typeof value === "object") {
    return b.objectExpression(
      Object.entries(value).map(([key, value]) => {
        return b.property(
          "init",
          b.identifier(key),
          literalToAst(value, seen) as any
        ) as any;
      })
    ) as any;
  }
  
  return b.literal(value) as any;
}

export function makeProxyUtils<T extends object>(
  node: ASTNode,
  extend: T = {} as T
): Record<string, any> {
  const obj = extend as any
  obj[PROXY_KEY] = true
  obj.$ast = node
  obj.$type ||= "object"
  return obj
}

const propertyDescriptor = {
  enumerable: true,
  configurable: true,
};

export function createProxy<T>(
  node: ASTNode,
  extend: any,
  handler: ProxyHandler<object>
): T {
  const utils = makeProxyUtils(node, extend);
  return new Proxy(
    utils,
    {
      ownKeys() {
        return Object.keys(utils).filter(
          (i) => i !== PROXY_KEY && !i.startsWith("$")
        );
      },
      getOwnPropertyDescriptor() {
        return propertyDescriptor;
      },
      ...handler,
      get(target: any, key: string | symbol, receiver: any) {
        if (handler.get) {
          // 解决 属性 找不到的情况
          if(key in utils) {
            return (utils as any)[key]; 
          }
          return handler.get(target, key, receiver);
        }
        if (key in utils) {
          return (utils as any)[key];
        }
      },
      set(target: any, key: string | symbol, value: any, receiver: any) {
        if (key in utils) {
          (utils as any)[key] = value;
          return true;
        }
        if (handler.set) {
          return handler.set(target, key, value, receiver);
        }
        return false;
      },
    }
  ) as T;
}

export function getCodeValue(ast: ASTNode | null | undefined) {
  if(ast == null) {
    throw new MagicastError('No parameter')
  }

  const {code} = generate(ast)

  return code 
}
