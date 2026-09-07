import { expect, test } from "vitest";
import { tool } from "./csv-deduplicator";
import { defaults, execute } from "./types";

test("deduplicates by keys with explicit retention rules", () => {
	const v = { ...defaults(tool), input: "name,value\nAlex,1\nSam,2\nAlex,3" };
	expect(execute(tool, v)).toBe("name,value\nAlex,1\nSam,2");
	expect(execute(tool, { ...v, mode: "Last occurrence" })).toBe(
		"name,value\nSam,2\nAlex,3",
	);
	expect(execute(tool, { ...v, mode: "Duplicate groups" })).toBe(
		"name,value\nAlex,1\nAlex,3",
	);
	expect(execute(tool, { ...v, mode: "Unique only" })).toBe(
		"name,value\nSam,2",
	);
});
test("normalizes comparison only and rejects unknown keys", () => {
	const v = {
		...defaults(tool),
		input: "name\n Alex \nalex",
		compare: "Trim and ignore case",
	};
	expect(execute(tool, v)).toBe('name\n" Alex "');
	expect(() => execute(tool, { ...v, keys: "missing" })).toThrow();
});
