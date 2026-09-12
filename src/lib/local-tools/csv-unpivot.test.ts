import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { tool } from "./csv-unpivot";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("CSV unpivot", () => {
	it("rejects formula-protected heading collisions", () => {
		expect(() => run({ variable: "=x", value: "'=x" })).toThrow(/unique/);
	});
	it("preserves row and measurement order", () => {
		expect(run()).toBe(
			"name,month,amount\nAlex,jan,10\nAlex,feb,12\nSam,jan,7\nSam,feb,9",
		);
	});
	it("allows no identifiers and skips only empty cells", () => {
		expect(
			parseCsv(
				run({ input: "a,b\n, \n1,2", ids: "[]", blank: "Skip" }),
				"Comma",
			).rows,
		).toEqual([
			["b", " "],
			["a", "1"],
			["b", "2"],
		]);
	});
	it("handles quotes, tabs and formula protection", () => {
		const x = run({ input: 'name\tjan\n"A, B"\t=1+1', delimiter: "Tab" });
		expect(parseCsv(x, "Comma").rows[0]).toEqual(["A, B", "jan", "'=1+1"]);
		expect(run({ input: "name,jan\nX,=2", formulas: "Preserve" })).toContain(
			"X,jan,=2",
		);
	});
	it("rejects ambiguous headings, missing identifiers and all-identifier tables", () => {
		expect(() => run({ variable: "name" })).toThrow();
		expect(() => run({ ids: '["missing"]' })).toThrow();
		expect(() => run({ ids: '["name","jan","feb"]' })).toThrow(/measurement/);
		expect(() => run({ ids: '["name","name"]' })).toThrow();
	});
});
