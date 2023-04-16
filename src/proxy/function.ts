import { ASTNode } from "../types";
import { MagicastError } from "../error";
import { createProxy, getCodeValue } from "./_utils";
import { proxifyArrayElements } from "./array";
import { ProxifiedFunctionCall, ProxifiedModule } from "./types";
import { CallExpression } from "@babel/types";
import { proxify } from './proxify';

/**
 * 处理 type: CallExpression ast节点
 * @param node 
 * @param mod 
 * @returns 
 */
export function proxifyFunctionCall<T extends []>(
  node: ASTNode,
  mod?: ProxifiedModule
): ProxifiedFunctionCall<T> {
  if (node.type !== "CallExpression") {
    throw new MagicastError("Not a function call");
  }

  function stringifyExpression(node: ASTNode): string {
    if (node.type === "Identifier") {
      return node.name;
    }

    /**
     * x.y 形式
     * node.object = x
     * node.property = y
     */
    if (node.type === "MemberExpression") {
      return `${stringifyExpression(node.object)}.${stringifyExpression(
        node.property
      )}`;
    }

    throw new MagicastError("Not implemented");
  }

  const getArgumentValue = (node: CallExpression) => {
    const args = [] as any[]

    node.arguments.forEach(arg => {
      args.push(proxify(arg, mod))
    })

    return proxifyArrayElements<T>(node, args, mod);
  }

  const argumentsProxy = getArgumentValue(node)

  const makeProxyUtils = () => {
    const obj = {
      $type: "function-call",
      $callee: stringifyExpression(node.callee as any),
      $args: argumentsProxy,
    } as any 

    if('name' in node.callee){
      const name = node.callee.name 
      obj[name] = argumentsProxy
    }

    return obj 
  }

  const utils = makeProxyUtils()
  
  return createProxy(
    node,
    utils,
    {
      ownKeys() {
        if('name' in node.callee){
         return [node.callee.name] 
        }
        return []
      }
    }
  ) as ProxifiedFunctionCall<T>;
}


export function proxifyFunctionDeclaration<T extends []>(
  node: ASTNode,
  mod?: ProxifiedModule
) {


  return createProxy(
    node,
    {
      $type: 'function-declation',
      $args: ''
    },
    {}
  )
}