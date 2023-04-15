import * as recast from "recast";
import { Program } from "@babel/types";
import { createProxy, literalToAst } from "./_utils";
import { proxify } from "./proxify";
import { ExportsItemInput, ProxifiedModule } from "./types";

const b = recast.types.builders;

export function createExportsProxy(
  root: Program,
  mod: ProxifiedModule,
  exports: ExportsItemInput
) {
  const findExport = (key: string) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    for (const n of root.body) {
      if (n.type === type) {
        if (key === "default") {
          return n.declaration;
        }
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            return dec.init as any;
          }
        }
      }
    }
  };

  /**
   * 更新 exports 属性
   * 
   * 不能适用所有的 export 的规则
   * 目前支持修改 
   * 1. export default Identifier
   * 2. export var/const/let Identifier = value 
   * 
   * 不能支持的操作
   * 1. export var Identifier1 = value1, Identifier2 = value2
   * 2. export function a () {}
   * 3. export * from 'filenamePath'
   * 4. export {Identifier1, Identifier2}
   * @param key 
   * @param value 
   * @returns 
   */
  const updateOrAddExport = (key: string, value: any) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    const node = literalToAst(value) as any;
    for (const n of root.body) {
      if (n.type === type) {
        if (key === 'default') {
          n.declaration = node
          return;
        }

        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0]
          if ("name" in dec.id && dec.id.name === key) {
            dec.init = node
            return;
          }
        }

      }
    }

    /**
     * 针对一些新添加的导出变量
     */
    root.body.push(
      key === "default"
        ? b.exportDefaultDeclaration(node)
        : (b.exportNamedDeclaration(
          b.variableDeclaration("const", [
            b.variableDeclarator(b.identifier(key), node),
          ])
        ) as any)
    );
  };

  return createProxy(
    root,
    // todo 
    // 不应该直接挂载在这里
    exports,
    {
      get(_, prop) {
        const node = findExport(prop as string);
        if (node) {
          return proxify(node, mod);
        }
      },
      set(_, prop, value) {
        updateOrAddExport(prop as string, value);
        // TODO ast 树更新 需要重新计算 exports 值

        return true;
      },
      ownKeys() {
        return root.body
          .flatMap((i) => {
            if (i.type === "ExportDefaultDeclaration") {
              return ["default"];
            }
            if (
              i.type === "ExportNamedDeclaration" &&
              i.declaration &&
              "declarations" in i.declaration
            ) {
              return i.declaration.declarations.map((d) =>
                "name" in d.id ? d.id.name : ""
              );
            }
            return [];
          })
          .filter(Boolean);
      },
      deleteProperty(_, prop) {
        const type =
          prop === "default"
            ? "ExportDefaultDeclaration"
            : "ExportNamedDeclaration";

        for (let i = 0; i < root.body.length; i++) {
          const n = root.body[i];
          if (n.type === type) {
            if (prop === "default") {
              root.body.splice(i, 1);
              return true;
            }
            if (n.declaration && "declarations" in n.declaration) {
              const dec = n.declaration.declarations[0];
              if ("name" in dec.id && dec.id.name === prop) {
                root.body.splice(i, 1);
                return true;
              }
            }
          }
        }
        return false;
      },
    }
  );
}
