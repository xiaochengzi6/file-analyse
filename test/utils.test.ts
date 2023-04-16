import { describe, it, expect } from "vitest";
import { print } from "recast";
import { parseModule, builders } from "../src";

describe("literalToAst", () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  function run(value: any) {
    return print(builders.literal(value)).code;
  }

  it("basic", () => {
    expect(run(1)).toMatchInlineSnapshot('"1"');
    expect(run(true)).toMatchInlineSnapshot('"true"');
    expect(run(undefined)).toMatchInlineSnapshot('"undefined"');
    // eslint-disable-next-line unicorn/no-null
    expect(run(null)).toMatchInlineSnapshot('"null"');
    expect(run([undefined, 1, { foo: "bar" }])).toMatchInlineSnapshot(`
      "[undefined, 1, {
          foo: \\"bar\\"
      }]"
    `);
  });

  it("built-in objects", () => {
    expect(run(new Set(["foo", 1]))).toMatchInlineSnapshot(
      '"new Set([\\"foo\\", 1])"'
    );

    expect(run(new Date("2010-01-01"))).toMatchInlineSnapshot(
      '"new Date(\\"2010-01-01T00:00:00.000Z\\")"'
    );

    const map = new Map();
    map.set(1, "foo");
    map.set(2, "bar");
    expect(run(map)).toMatchInlineSnapshot(
      '"new Map([[1, \\"foo\\"], [2, \\"bar\\"]])"'
    );
  });

  it("forward proxy", () => {
    const mod = parseModule(`export default { foo: 1 }`);

    // @ts-ignore
    const _node = mod.analyse.exports._node as any 

    expect(builders.literal({foo:1})).toMatchInlineSnapshot(_node,`
      {
        "comments": null,
        "loc": null,
        "properties": [
          {
            "comments": null,
            "computed": false,
            "decorators": null,
            "key": {
              "comments": null,
              "loc": null,
              "name": "foo",
              "optional": false,
              "type": "Identifier",
              "typeAnnotation": null,
            },
            "kind": "init",
            "loc": null,
            "method": false,
            "shorthand": false,
            "type": "Property",
            "value": {
              "comments": null,
              "extra": {
                "raw": "1",
                "rawValue": 1,
              },
              "loc": null,
              "raw": null,
              "type": "NumericLiteral",
              "value": 1,
            },
          },
        ],
        "type": "ObjectExpression",
      }
    `);
  });

  it("circular reference", () => {
    const obj: any = {};
    obj.foo = obj;
    expect(() => run(obj)).toThrowError("Can not serialize circular reference");
  });
});
