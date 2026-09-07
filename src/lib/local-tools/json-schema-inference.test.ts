import { Validator } from "jsonschema";
import { expect, test } from "vitest";
import { inferSchema, tool } from "./json-schema-inference";
import { defaults, execute } from "./types";

test("inferred schema validates its source and handles optional keys", () => {
	const values = defaults(tool),
		schema = JSON.parse(execute(tool, values));
	expect(new Validator().validate(JSON.parse(values.input), schema).valid).toBe(
		true,
	);
	expect(schema.items.required).toEqual(["id", "name"]);
	expect(inferSchema([1, 1.5], false, true)).toEqual({ type: "number" });
	expect(inferSchema([[]], false, true)).toEqual({ type: "array", items: {} });
});
test("supports unions, closed objects and prototype-named keys", () => {
	expect(inferSchema([1, null], false, true)).toEqual({
		anyOf: [{ type: "integer" }, { type: "null" }],
	});
	const schema = JSON.parse(
		execute(tool, {
			...defaults(tool),
			input: '{"__proto__":1}',
			extra: "Disallow",
		}),
	);
	expect(Object.hasOwn(schema.properties, "__proto__")).toBe(true);
	expect(schema.additionalProperties).toBe(false);
	expect(() => execute(tool, { ...defaults(tool), input: "bad" })).toThrow();
});
