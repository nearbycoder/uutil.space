import { expect, test } from "vitest";
import { editPointer, tool } from "./json-pointer-editor";
import { defaults, execute } from "./types";

test("pointer reads escaped keys, edits arrays and handles root", () => {
	expect(execute(tool, defaults(tool))).toContain("Sam");
	expect(editPointer({ "a/b": { "~": 2 } }, "/a~1b/~0", "Read", null)).toBe(2);
	expect(editPointer([1], "/-", "Set", 2)).toEqual([1, 2]);
	expect(editPointer([1, 2], "/0", "Remove", null)).toEqual([2]);
	expect(editPointer({}, "", "Set", null)).toBeNull();
});
test("pointer rejects missing paths and malformed indexes without prototype mutation", () => {
	for (const path of ["/01", "/3", "/a~2b"])
		expect(() => editPointer([1], path, "Read", null)).toThrow();
	expect(() => editPointer({}, "/a/b", "Set", 1)).toThrow();
	const result = editPointer({}, "/__proto__", "Set", { safe: true });
	expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
	expect(Object.hasOwn(result as object, "__proto__")).toBe(true);
	expect(() => editPointer({}, "", "Remove", null)).toThrow();
});
