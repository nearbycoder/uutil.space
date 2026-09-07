import { expect, test } from "vitest";
import { mergePatch, tool } from "./json-merge-patch";
import { defaults, execute } from "./types";

test("merge patch deletes, recursively merges and replaces arrays", () => {
	expect(JSON.parse(execute(tool, defaults(tool)))).toEqual({
		title: "Published",
		author: { name: "Alex" },
		tags: ["new"],
	});
	expect(mergePatch([1, 2], [3])).toEqual([3]);
	expect(mergePatch({ a: 1 }, null)).toBeNull();
	expect(mergePatch(1, { a: 2 })).toEqual({ a: 2 });
	expect(mergePatch({ a: 1 }, { b: null })).toEqual({ a: 1 });
});
test("prototype names are ordinary data and malformed patches fail", () => {
	const result = mergePatch({}, JSON.parse('{"__proto__":{"polluted":true}}'));
	expect(Object.getPrototypeOf(result)).toBeNull();
	expect(JSON.stringify(result)).toContain("__proto__");
	expect(() => execute(tool, { target: "{}", patch: "{" })).toThrow();
});
