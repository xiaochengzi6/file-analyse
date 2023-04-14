import { Program } from "@babel/types";
import { ExportsItemInput, ImportsItemInput } from "./types";

export function analyse(root: Program) {
  const exports: ExportsItemInput = { $type: "exports" }
  const imports: ImportsItemInput = { $type: "imports" }

  root.body.forEach(node => {
    // import 
    if(node.type === 'ImportDeclaration'){
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

        imports[localName] = {
          source: node.source.value,
          name,
          localName,
          _node: specifier
        }
      })
    }

    // export 
    else if (node.type === "ExportDefaultDeclaration") {
      const isDeclaration = /Declarations$/.test(node.declaration.type)

      exports.default = {
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
          // 处理
          // export Identifier1 as Identifier2 from 'filePath'
          if (specifier.type === 'ExportSpecifier') {
            // 导入名称
            let localName = specifier.local.name, exportedName

            // 适用名称
            // @ts-ignore
            exportedName = specifier.exported.name

            exports[exportedName] = {
              localName,
              exportedName,
              _node: node 
            }

            // 处理 from 'filePath'
            const source = node.source?.value 
            if (source) {
              imports[localName] = {
                source,
                localName,
                name: exportedName,
                _node: node 
              }
            }
          }

          //  处理
          // expoort * as localName from 'filePath'
          else if(specifier.type === 'ExportNamespaceSpecifier'){
            const localName = specifier.exported.name 

            exports[localName] = {
              localName,
              exportedName: localName,
              _node: node 
            }

            // 处理 from 'filePath'
            const source = node.source?.value 
            if(source) {
              imports[localName] = {
                isAll: true,
                source,
                name: '*',
                localName,
                _node: node 
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

          exports[name] = {
            localName: name,
            expression: node.declaration,
            _node: node 
          }
        }
      }
    }

    else if(node.type === 'ExportAllDeclaration'){
      const source = node.source.value 
      imports[source] = {
        source: source,
        // 标记为 isAll 不会对其进行摇树优化
        isAll: true,
        name: '*',
        _node: node, 
      }
    }

  })

  return {
    exports,
    imports
  }
}