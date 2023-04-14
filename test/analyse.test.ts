import { describe, expect, it } from 'vitest'
import { analyse } from './../src/proxy/analyse';
import { getBabelParser } from './../src/babel';

const getResult = (code) => {
  const parser = getBabelParser()
  const ast = parser.parse(code).program
  return analyse(ast)
}

describe("analyse", () => {
  it("checkout exports", () => {
    expect(getResult('export default foo')).toEqual({
      imports: {
        $type: 'imports'
      },
      exports: {
        $type: 'exports',

        default: expect.objectContaining({
          name: 'default',
          localName: 'foo',
          isDeclaration: false,
        })
      }
    })

    expect(getResult('export const a = 1')).toEqual({
      imports: {
        $type: 'imports'
      },
      exports: {
        $type: 'exports',
        a: {
          localName: 'a',
          expression: expect.objectContaining({
            "type": "VariableDeclaration",
            "kind": "const"
          }),
          _node: expect.objectContaining({
            "type": "ExportNamedDeclaration",
            "specifiers": [],
            "source": null,
            "assertions": [],
            "exportKind": "value"
          })
        }
      }
    })

    const testBuild = `
      const build = 'Hellow';
      export {build}
    `
    expect(getResult(testBuild)).toEqual({
      imports: {
        $type: 'imports'
      },
      exports: {
        $type: 'exports',

        build: expect.objectContaining({
          "localName": 'build',
          "exportedName": 'build',
        })
      }
    })

    expect(getResult('export * from "filePath"')).toEqual({
      exports: {
        $type: 'exports'
      },
      imports: {
        $type: 'imports',
        filePath: expect.objectContaining({
          source: "filePath",
          isAll: true,
          name: '*',
        })
      }
    })

    expect(getResult('export * as FileName from "filePath"')).toEqual({
      exports: {
        $type: 'exports',
        FileName: expect.objectContaining({
          localName: 'FileName',
          exportedName: 'FileName',
        })
      },
      imports: {
        $type: 'imports',
        FileName: expect.objectContaining({
          source: "filePath",
          // name 是导入文件的名称
          name: '*',
          localName: 'FileName',
          isAll: true,
        })
      }
    })

    expect(getResult('export {bar as foo} from "fileNamePath"')).toEqual({
      imports: {
        $type: 'imports',
        bar: expect.objectContaining({
          name: 'foo',
          localName: 'bar',
          source: 'fileNamePath'
        })
      },
      exports: {
        $type: 'exports',

        foo: expect.objectContaining({
          "localName": 'bar',
          "exportedName": 'foo',
        })
      }
    })
  })

  it('checkout imports', () => {
    expect(getResult('import bar from "bar"')).toEqual({
      imports: {
        $type: 'imports',
        bar: expect.objectContaining({
          source: 'bar',
          name: 'default',
          localName: 'bar',
        })
      },
      exports: {
        $type: 'exports'
      }
    })

    expect(getResult('import * as bar from "Bar"')).toEqual({
      imports: {
        $type: 'imports',
        bar: expect.objectContaining({
          source: 'Bar',
          name: '*',
          localName: 'bar',
        })
      },
      exports: {
        $type: 'exports'
      }
    })
  })


})