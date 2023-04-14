import { parseModule, generateCode} from '../dist/index.mjs';


const mod = parseModule(`
const foo = 1
export {foo}`);


mod.exports.foo = 2
console.log(generateCode(mod))
