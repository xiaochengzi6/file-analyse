/* eslint-disable unicorn/no-nested-ternary */
import { ParsedFileNode } from "../types";
import { MagicastError } from "../error";
import { generateCode } from "../code";
import { ProxifiedModule } from "./types";
import { createImportsProxy } from "./imports";
import { createExportsProxy } from "./exports";
import { createProxy } from "./_utils";
import { analyse } from "./analyse";
import stringifyObject from 'stringify-object';

export function proxifyModule<T extends object>(
  ast: ParsedFileNode,
  code: string
): ProxifiedModule<T> {
  const root = ast.program;
  if (root.type !== "Program") {
    throw new MagicastError(`Cannot proxify ${ast.type} as module`);
  }

  const util = {
    $code: code,
    $type: "module",
  } as ProxifiedModule<T>;

  util.toJSON = new Proxy({}, {
    get(_, key) {
      if (key in util) {
        // @ts-ignore
        return stringifyObject(util[key])
      }
    }
  })

  const mod = createProxy(root, util, {}) as ProxifiedModule<T>;

  const { imports, exports } = analyse(root)

  util.exports = createExportsProxy(root, mod, exports) as any;
  util.imports = createImportsProxy(root, mod, imports) as any;
  util.generate = (options) => generateCode(mod, options);

  return mod;
}
