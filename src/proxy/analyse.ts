import { Program } from "@babel/types";
import { ExportsItemInput, ImportsItemInput } from "./types";

export class FileAnalyse {
  exports: ExportsItemInput
  imports: ImportsItemInput

  constructor(root?: Program) {
    this.exports = {}
    this.imports = {}

    if (root) {
      this.analyse(root)
    }
  }

  update(root: Program) {
    this.clear()
    // TODO diff 对比
    return this.analyse(root)
  }

  getFileData() {
    return {
      exports: this.exports,
      imports: this.imports
    }
  }

  clear() {
    this.exports = {}
    this.imports = {}
  }

  analyse(root: Program) {
    // TODO 缓存

    root.body.forEach(node => {
      if (node.type === 'ImportDeclaration') {
        node.specifiers.forEach(specifier => {
          const isDefault = specifier.type === 'ImportDefaultSpecifier'
          const isNamespace = specifier.type === 'ImportNamespaceSpecifier'

          const localName = specifier.local.name

          const name = isDefault
            ? 'default'
            : isNamespace
              ? '*'
              // @ts-ignore
              : specifier.imported.name

          this.imports[localName] = {
            from: node.source.value,
            imported: name,
            local: localName,
          }
        })
      }

      else if (node.type === "ExportDefaultDeclaration") {
        const isDeclaration = /Declarations$/.test(node.declaration.type)

        this.exports.default = {
          name: 'default',
          // @ts-ignore
          localName: isDeclaration ? node.declaration.id.name : node.declaration.name || 'default',
          isDeclaration,
          _node: node
        }
      }

      else if (node.type === "ExportNamedDeclaration") {
        if (node.specifiers.length) {
          node.specifiers.forEach(specifier => {
            // export {Identifier1 as Identifier2} from 'filePath'
            if (specifier.type === 'ExportSpecifier') {
              let localName = specifier.local.name, exportedName
              // @ts-ignore
              exportedName = specifier.exported.name

              this.exports[exportedName] = {
                localName,
                exportedName,
              }

              //  from 'filePath'
              const source = node.source?.value
              if (source) {
                this.imports[localName] = {
                  from: source,
                  local: localName,
                }
              }
            }

            // export * as localName from 'filePath'
            else if (specifier.type === 'ExportNamespaceSpecifier') {
              const localName = specifier.exported.name

              this.exports[localName] = {
                localName,
                exportedName: localName,
              }

              // 处理 from 'filePath'
              const source = node.source?.value
              if (source) {
                this.imports[localName] = {
                  isAll: true,
                  from: source,
                  imported: '*',
                  local: localName,
                }
              }
            }

            // export Identifier from 'filePath'
            else if (specifier.type === 'ExportDefaultSpecifier') {
              const localName = specifier.exported.name

              this.exports[localName] = {
                localName,
                exportedName: localName
              }

              const source = node.source?.value
              if (source) {
                this.imports[localName] = {
                  local: localName,
                  from: source,
                  imported: 'default'
                }
              }
            }
          })
        }

        // 处理
        // export var/const/let/ Identifier = value || export function Identifier() {}
        else {
          let name

          if (node.declaration) {
            if (node.declaration.type === 'VariableDeclaration') {
              // @ts-ignore
              name = node.declaration.declarations[0].id.name
            } else {
              // function || class 
              // @ts-ignore
              name = node.declaration.id.name
            }

            this.exports[name] = {
              localName: name,
              expression: node.declaration,
            }
          }
        }
      }

      else if (node.type === 'ExportAllDeclaration') {
        const source = node.source.value
        this.imports[source] = {
          from: source,
          // 标记为 isAll 不会对其进行摇树优化
          isAll: true,
          imported: '*',
        }
      }

    })

  }
}
