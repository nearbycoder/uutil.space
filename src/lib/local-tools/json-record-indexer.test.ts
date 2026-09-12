import { describe, expect, it } from "vitest";
import { tool } from "./json-record-indexer";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("record indexer", () => {
	it("groups repeated keys without dropping records", () => {
		expect(run().index["string:a"]).toHaveLength(2);
		expect(run().keyCount).toBe(2);
	});
	it("implements first, last and error", () => {
		expect(run({ duplicates: "First wins" }).index["string:a"].name).toBe(
			"Alex",
		);
		expect(run({ duplicates: "Last wins" }).index["string:a"].name).toBe(
			"Riley",
		);
		expect(() => run({ duplicates: "Error" })).toThrow(/Duplicate/);
	});
	it("separates typed values and preserves unsafe property names", () => {
		expect(run({ input: '[{"id":1},{"id":"1"},{"id":false}]' }).keyCount).toBe(
			3,
		);
		expect(
			Object.values(
				run({
					input: '[{"id":"__proto__"},{"id":"constructor"}]',
					encoding: "Plain strings",
				}).index,
			)[0],
		).toEqual([{ id: "__proto__" }]);
	});
	it("applies missing policy and validates records and key types", () => {
		expect(
			run({ input: '[{},{"id":null},{"id":""}]', missing: "Skip" }),
		).toMatchObject({ skippedCount: 2, keyCount: 1 });
		expect(() => run({ input: "[{}]" })).toThrow(/missing/);
		expect(() => run({ input: '[{"id":[]}]' })).toThrow();
		expect(() =>
			run({ input: '[{"id":1}]', encoding: "Plain strings" }),
		).toThrow();
		expect(() => run({ input: "[null]" })).toThrow();
	});
});
