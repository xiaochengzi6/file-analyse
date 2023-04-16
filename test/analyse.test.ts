import { describe, expect, it } from 'vitest'
import { FileAnalyse } from '../src/proxy/analyse';
import { getBabelParser } from '../src/babel';

const analyse = new FileAnalyse()

const getResult = (code) => {
  const parser = getBabelParser()
  const ast = parser.parse(code).program
  analyse.update(ast)

  return analyse
}

describe("analyse", () => {
  it("checkout exports", () => {
    expect(getResult('export default foo')).toEqual({
      imports: {},
      exports: {
        default: expect.objectContaining({
          name: 'default',
          localName: 'foo',
          isDeclaration: false,
        })
      }
    })

    expect(getResult('export const a = 1')).toEqual({
      imports: {},
      exports: {
        a: expect.objectContaining({
          localName: 'a',
        })
      }
    })

    const testBuild = `
      const build = 'Hellow';
      export {build}
    `
    expect(getResult(testBuild)).toEqual({
      imports: {},
      exports: {
        build: expect.objectContaining({
          "localName": 'build',
          "exportedName": 'build',
        })
      }
    })

    expect(getResult('export * from "filePath"')).toEqual({
      exports: {},
      imports: {
        filePath: expect.objectContaining({
          from: "filePath",
          isAll: true,
          imported: '*',
        })
      }
    })

    expect(getResult('export foo from "FOO"')).toEqual({
      exports: {
        foo: {
          exportedName: 'foo',
          localName: 'foo',
        },
      },
      imports: {
        foo: {
          from: 'FOO',
          local: 'foo',
          imported: 'default'
        }
      }
    })

    expect(getResult('export * as FileName from "filePath"')).toEqual({
      exports: {
        FileName: expect.objectContaining({
          localName: 'FileName',
          exportedName: 'FileName',
        })
      },
      imports: {
        FileName: expect.objectContaining({
          from: "filePath",
          // name 是导入文件的名称
          imported: '*',
          local: 'FileName',
          isAll: true,
        })
      }
    })

    expect(getResult('export {bar as foo} from "fileNamePath"')).toEqual({
      imports: {
        bar: expect.objectContaining({
          local: 'bar',
          from: 'fileNamePath'
        })
      },
      exports: {
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
        bar: {
          from: 'bar',
          imported: 'default',
          local: 'bar',
        }
      },
      exports: {}
    })

    expect(getResult('import * as bar from "Bar"')).toEqual({
      imports: {
        bar: {
          from: 'Bar',
          imported: '*',
          local: 'bar',
        }
      },
      exports: {}
    })
  })


})