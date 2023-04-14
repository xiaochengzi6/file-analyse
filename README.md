## file-analyse
将基于 magicase V0.2.3 项目开发，专注于文件解析工作。

它将具备
1. 文件依赖分析
2. 命名冲突
3. Tree shaking optimization
4. 当然还具备 [magicase 的功能](https://github.com/unjs/magicast)
## 使用
由于还未发布，只能先克隆本仓库 `git clone https://github.com/xiaochengzi6/file-analyse.git`

~~~
git clone https://github.com/xiaochengzi6/file-analyse.git

cd file-analyse

pnpm install 
~~~
## 例子
> 在使用之前先执行 `pnpm build` 
~~~ts
import { parseModule, generateCode } from '../dist/index.mjs';

const mod = parseModule(
` const foo = 1
  export {foo}
`)

console.log(mod)
// =============== 输出 =================
{
  '$code': '\nconst foo = 1\nexport {foo}',
  '$type': 'module',
  __magicast_proxy: true,
  '$ast': Node {
    type: 'Program',
    start: 0,
    end: 29,
    loc: SourceLocation {
      start: [Object],
      end: [Object],
      filename: undefined,
      identifierName: undefined,
      lines: [Lines],
      tokens: [Array],
      indent: 0
    },
    sourceType: 'module',
    interpreter: null,
    body: [ [Node], [Node] ],
    directives: []
  },
  exports: {
    '$type': 'exports',
    foo: { localName: 'foo', exportedName: 'foo', _node: [Node] },
    __magicast_proxy: true,
    '$ast': Node {
      type: 'Program',
      start: 0,
      end: 29,
      loc: [SourceLocation],
      sourceType: 'module',
      interpreter: null,
      body: [Array],
      directives: []
    }
  },
  imports: {
    '$type': 'imports',
    '$add': [Function (anonymous)],
    toJSON: [Function (anonymous)],
    '$items': [Function (anonymous)],
    '$loadFile': [Function (anonymous)],
    __magicast_proxy: true,
    '$ast': Node {
      type: 'Program',
      start: 0,
      end: 29,
      loc: [SourceLocation],
      sourceType: 'module',
      interpreter: null,
      body: [Array],
      directives: []
    }
  },
  generate: [Function (anonymous)]
}


console.log(generateCode(mod)) 
// =============== 输出 =================
{ code: 'const foo = 1\r\nexport {foo}', map: undefined }
~~~


## 任务
1. 处理 `import` && `export` 关键词
2. 根据 `import` 导入加载文件
3. tree shaking 
4. 命名冲突