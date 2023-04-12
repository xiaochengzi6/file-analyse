import * as recast from "recast";
import { Program } from "@babel/types";
import { createProxy, literalToAst } from "./_utils";
import { proxify } from "./proxify";
import { ProxifiedModule } from "./types";

const b = recast.types.builders;

export function createExportsProxy(root: Program, mod: ProxifiedModule) {
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

  const updateOrAddExport = (key: string, value: any) => {
    const type =
      key === "default" ? "ExportDefaultDeclaration" : "ExportNamedDeclaration";

    const node = literalToAst(value) as any;
    for (const n of root.body) {
      if (n.type === type) {  
        // export default Idenfirter
        if (key === "default") {
          n.declaration = node;
          return;
        }
        // export var/const/let a = 1 or function a (){}
        if (n.declaration && "declarations" in n.declaration) {
          const dec = n.declaration.declarations[0];
          if ("name" in dec.id && dec.id.name === key) {
            dec.init = node;
            return;
          }
        }
        /**
         * todo 
         * 处理 declaration: null 的情况
         * `const foo = 1; export {foo}`
         */
      }
    }

    /**
     * 这里处理 当使用 mod.exports.foo = 1 
     * 类似这种直接设置修改
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


  // TODO:
  // mod 是上层传入的 当前 需要往 createProxy 第二参数传入处理好的 exports 对象
  // exports 对象需要在这里去挂载上属性
  // 当目前是 { $type: "exports" }

  return createProxy(
    root,
    {
      $type: "exports",
    },
    {
      get(_, prop) {
        const node = findExport(prop as string);
        if (node) {
          return proxify(node, mod);
        }
      },
      set(_, prop, value) {
        updateOrAddExport(prop as string, value);
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
