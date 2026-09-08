import { describe, expect, it } from "vitest";
import { tool } from "./json-array-query";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("JSON Array Query", () => {
	it("filters, projects, sorts and reports counts", () => {
		const x = run();
		expect(x.matched).toBe(2);
		expect(x.rows).toEqual([
			{ name: "Riley", score: 95 },
			{ name: "Alex", score: 92 },
		]);
	});
	it("distinguishes missing, null and types", () => {
		expect(
			run({
				input: '[{"x":null},{},{"x":"1"},{"x":1}]',
				key: "x",
				operator: "Equals",
				value: "1",
				columns: "",
				sort: "",
			}).rows,
		).toEqual([{ x: 1 }]);
		expect(
			run({
				input: '[{},{"x":null}]',
				key: "x",
				operator: "Missing",
				sort: "",
				columns: "",
			}).rows,
		).toEqual([{}]);
	});
	it("sorts nulls last and limits output", () => {
		const x = run({
			input: '[{"x":null},{"x":2},{"x":1},{}]',
			key: "",
			sort: "x",
			columns: "",
			order: "Ascending",
			limit: "2",
		});
		expect(x.rows).toEqual([{ x: 1 }, { x: 2 }]);
		expect(x.truncated).toBe(true);
	});
	it("rejects invalid records, sort types and numeric comparisons", () => {
		const invalid: Record<string, string>[] = [
			{ input: "{}" },
			{ input: " " },
			{ key: "", sort: "x", input: '[{"x":1},{"x":"2"}]' },
			{ operator: "Greater than", value: '"2"' },
			{ limit: "0" },
		];
		for (const v of invalid) expect(() => run(v)).toThrow();
	});
});
