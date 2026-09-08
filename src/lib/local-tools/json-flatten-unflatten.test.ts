import { describe, expect, it } from "vitest";
import { flatten, tool, unflatten } from "./json-flatten-unflatten";
import { defaults, execute } from "./types";

describe("JSON flatten/unflatten", () => {
	it("runs the example and validates required input", () => {
		expect(execute(tool, defaults(tool))).toContain(tool.smoke);
		expect(() => execute(tool, { ...defaults(tool), input: " " })).toThrow(
			/required/,
		);
	});
	it("round-trips roots, empty containers, numeric keys and escapes", () => {
		for (const input of [
			null,
			0,
			"hello",
			[],
			{},
			{ "0": [], "a/b": { "~": true }, "": {} },
		])
			expect(unflatten(flatten(input).reverse())).toEqual(input);
	});
	it("keeps prototype-looking names as own data", () => {
		const input = JSON.parse('{"__proto__":{"polluted":true},"constructor":1}');
		expect(unflatten(flatten(input))).toEqual(input);
		expect(Object.hasOwn({}, "polluted")).toBe(false);
	});
	it("rejects missing parents, duplicate paths, sparse arrays and invalid escapes", () => {
		for (const rows of [
			[{ pointer: "/x", type: "null", value: null }],
			[
				{ pointer: "", type: "object" },
				{ pointer: "", type: "object" },
			],
			[
				{ pointer: "", type: "array" },
				{ pointer: "/1", type: "null", value: null },
			],
			[
				{ pointer: "", type: "object" },
				{ pointer: "/~2", type: "null", value: null },
			],
		])
			expect(() => unflatten(rows)).toThrow();
	});
});
