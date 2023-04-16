## file-analyse
将基于 magicast V0.2.3 项目开发，专注于文件解析工作。

它将具备
1. 文件依赖分析
2. 命名冲突
3. Tree shaking optimization
4. 当然还具备 [magicase 的功能](https://github.com/unjs/magicast)
## 下载使用
由于还未发布，只能先克隆本仓库 `git clone https://github.com/xiaochengzi6/file-analyse.git`

~~~
git clone https://github.com/xiaochengzi6/file-analyse.git

cd file-analyse

pnpm install 
~~~

导入
> 由于并未发布所以在只用之前需要先对项目进行打包
~~~js
// ESM / Bundler
import { parseModule, generateCode, builders, createNode } from "dist/index.mjs";

// CommonJS
const { parseModule, generateCode, builders, createNode } = require("dist/index.cjs");
~~~

## Examples
> file-analyse 功能
**Example**: 获得全部 value 值 
~~~js
const mod = parseModule(`export const a = 1`);

mod.toJSON.exports 
/**
 * {
 *   a: 1
 * }
*/
~~~

**Example**: 收集 `import` && `extend` 信息
~~~js
const mod = parseModule(`
export * from 'bar'
export foo from 'Foo'
export {add as Add} form 'build'

import react from 'React'
import {obj as Obj} from 'obj'
`)

mod.analyse

// console
{
  exports: {
    foo: { localName: 'foo', exportedName: 'foo' },
    Add: { localName: 'add', exportedName: 'Add' }
  },
  imports: {
    bar: { from: 'bar', isAll: true, imported: '*' },
    foo: { local: 'foo', from: 'Foo', imported: 'default' },
    add: { from: 'build', local: 'add' },
    react: { from: 'React', imported: 'default', local: 'react' },
    Obj: { from: 'obj', imported: 'obj', local: 'Obj' }
  }
}
~~~

> magicast 功能
**Example**: Modify a file:

`config.js`:
~~~js
export default {
  foo: ["a"],
};
~~~

Code to modify and append `b` to `foo` prop of defaultExport:

~~~js
const mod = await loadFile("config.js");

mod.exports.default.foo.push("b");

await writeFile(mod);
~~~

Updated `config.js`:

~~~js
export default {
  foo: ["a", "b"],
};
~~~

**Example:** Directly use AST utils:

```js
// Parse to AST
const mod = parseModule(`export default { }`);

// Ensure foo is an array
mod.exports.default.foo ||= [];
// Add a new array member
mod.exports.default.foo.push("b");
mod.exports.default.foo.unshift("a");

// Generate code
const { code, map } = generateCode(mod);
```

Generated code:

```js
export default {
  foo: ["a", "b"],
};
```

**Example:** Get the AST directly:

```js
const mod = parseModule(`export default { }`);

const ast = mod.exports.default.$ast
// do something with ast
```

**Example:** Function parameters:

```js
const mod = parseModule(`export default defineConfig({ foo: 'bar' })`);

// Support for both bare object export and `defineConfig` wrapper
const options = mod.exports.default.$type === 'function-call'
  ? mod.exports.default.$args[0]
  : mod.exports.default;

console.log(options.foo) // bar
```

**Example:** Create a function call:

```js
const mod = parseModule(`export default {}`);

const options = mod.exports.default.list = builders.functionCall('create', [1, 2, 3])

console.log(mod.generateCode()) // export default { list: create([1, 2, 3]) }
```
