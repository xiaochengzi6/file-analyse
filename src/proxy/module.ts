/* eslint-disable unicorn/no-nested-ternary */
import { ParsedFileNode } from "../types";
import { MagicastError } from "../error";
import { generateCode } from "../code";
import { ProxifiedModule } from "./types";
import { createImportsProxy } from "./imports";
import { createExportsProxy } from "./exports";
import { createProxy } from "./_utils";
import { FileAnalyse } from "./analyse";
import stringifyObject from 'stringify-object';
import { Program } from '@babel/types';


export function createModule(
  root: Program,
  mod: ProxifiedModule,
  analyse: FileAnalyse
) {

  const makeProxyUtils = (extend: Record<string, any> = {}) => {
    const obj = extend as any
    obj.$ast = root
    obj.analyse = analyse
    obj.toJSON = new Proxy({}, {
      get(_, key) {
        
        if (key in extend) {
          // @ts-ignore
          return stringifyObject(extend[key])
        }
      }
    })

    return obj
  }

  const utils = makeProxyUtils(mod)

  return createProxy(
    root,
    utils,
    {}
  )
}

export function proxifyModule<T extends object>(
  ast: ParsedFileNode,
  code: string
): ProxifiedModule<T> {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new MagicastError(`Cannot proxify ${ast.type} as module`);
  }

  const analyse = new FileAnalyse(root)

  const util = {
    $code: code,
    $type: "module",
  } as ProxifiedModule<T>

  const mod = createModule(root, util, analyse) as ProxifiedModule<T>

  util.exports = createExportsProxy(root, mod, analyse) as any
  util.imports = createImportsProxy(root, mod, analyse)
  util.generate = (options) => generateCode(mod, options)

  return mod;
}
