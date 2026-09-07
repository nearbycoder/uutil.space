import { expect, test } from "vitest";
import { sortJson, tool } from "./json-key-sorter";
import { defaults, execute } from "./types";

test("sorts nested and numeric-looking keys without changing arrays", () => {
	expect(sortJson({ "2": 2, "10": 10 }, false, 0)).toBe('{"10":10,"2":2}');
	expect(sortJson({ a: 1, z: 2 }, true, 0)).toBe('{"z":2,"a":1}');
	expect(JSON.parse(execute(tool, defaults(tool)))).toEqual(
		JSON.parse(defaults(tool).input),
	);
	expect(sortJson([3, 1, 2], false, 0)).toBe("[3,1,2]");
	expect(sortJson(null)).toBe("null");
});
test("validates format settings and malformed input", () => {
	expect(() => execute(tool, { ...defaults(tool), indent: "100" })).toThrow();
	expect(() => execute(tool, { ...defaults(tool), input: "{" })).toThrow();
});
