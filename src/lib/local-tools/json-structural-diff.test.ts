import { expect, test } from "vitest";
import { tool } from "./json-structural-diff";
import { defaults, execute } from "./types";

test("diff reports typed changes and ignores key order", () => {
	expect(JSON.parse(execute(tool, defaults(tool))).count).toBe(3);
	expect(
		JSON.parse(
			execute(tool, { before: '{"a":1,"b":2}', after: '{"b":2,"a":1}' }),
		).equal,
	).toBe(true);
	expect(
		JSON.parse(
			execute(tool, { before: '{"a/b":null}', after: '{"a/b":false}' }),
		).changes[0].path,
	).toBe("/a~1b");
	expect(
		JSON.parse(execute(tool, { before: "[1,2]", after: "[1]" })).changes[0]
			.kind,
	).toBe("removed");
});
test("diff rejects malformed, missing, oversized and unsafe numeric input", () => {
	for (const before of ["", "{", "1".repeat(200001), "9007199254740993"])
		expect(() => execute(tool, { before, after: "{}" })).toThrow();
});
