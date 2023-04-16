import stringifyObject from 'stringify-object';
import { parseModule, generateCode } from '../dist/index.mjs';

const mod = parseModule(`export const a = 1`);
console.log(mod.exports.default)
console.log(mod.analyse.exports)