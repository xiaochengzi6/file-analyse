import { parseModule, generateCode } from '../src/index';

const mod = parseModule(`
export * from 'bar'
export foo from 'Foo'
export {add as Add} from 'build'

import react from 'React'
import {obj as Obj} from 'obj'
`);

console.log(mod.analyse)
