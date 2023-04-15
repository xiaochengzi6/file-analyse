import { ASTNode } from "../types";
import { MagicastError } from "../error";
import { createProxy } from "./_utils";
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

    return  proxifyArrayElements<T>(node, args, mod);
  }

  const argumentsProxy = getArgumentValue(node)

  return createProxy(
    node,
    {
      $type: "function-call",
      $callee: stringifyExpression(node.callee as any),
      $args: argumentsProxy,
    },
    {}
  ) as ProxifiedFunctionCall<T>;
}
