import { describe, expect, it } from "vitest";
import { tool } from "./csv-multi-sort";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("CSV Multi-column Sort", () => {
	it("sorts multiple typed keys and keeps stable ties", () =>
		expect(run()).toBe(
			"name,team,score\nAlex,Design,92\nAlex,Design,92\nRiley,Design,\nSam,Engineering,88",
		));
	it("sorts numbers numerically and blanks independently", () =>
		expect(
			run({
				input: "n,id\n2,a\n10,b\n,c",
				keys: '[{"column":"n","type":"Number","direction":"Descending"}]',
				blanks: "First",
			}),
		).toBe("n,id\n,c\n10,b\n2,a"));
	it("supports natural sorting without modifying cells", () =>
		expect(
			run({
				input: "name\nitem10\nitem2",
				keys: '[{"column":"name","type":"Natural","direction":"Ascending"}]',
			}),
		).toBe("name\nitem2\nitem10"));
	it("rejects malformed configuration and numeric data", () => {
		for (const input of ["x\nNaN", "x\n0x10", "x\n9007199254740992"])
			expect(() =>
				run({
					input,
					keys: '[{"column":"x","type":"Number","direction":"Ascending"}]',
				}),
			).toThrow();
		expect(() => run({ keys: "[]" })).toThrow();
		expect(() => run({ input: " " })).toThrow();
	});
});
