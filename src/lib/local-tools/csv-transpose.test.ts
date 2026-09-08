import { describe, expect, it } from "vitest";
import { tool } from "./csv-transpose";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("CSV Transpose", () => {
	it("transposes every original column", () =>
		expect(run({ input: "name,score\nAlex,2\nSam,3" })).toBe(
			"field,row_1,row_2\nname,Alex,Sam\nscore,2,3",
		));
	it("uses source headings and optionally retains their row", () => {
		expect(
			run({ input: "name,score\nAlex,2\nSam,3", headings: "From column" }),
		).toBe("field,Alex,Sam\nscore,2,3");
		expect(
			run({
				input: "name,score\nAlex,2",
				headings: "From column",
				include: "Yes",
			}),
		).toContain("name,Alex");
	});
	it("quotes multiline cells and protects formulas", () =>
		expect(
			run({ input: 'a,b\n"hello\nworld",=SUM(1)', formulas: "Protect" }),
		).toContain("'=SUM(1)"));
	it("rejects duplicate headings, excessive width and missing input", () => {
		expect(() => run({ headings: "From column" })).toThrow(/unique/);
		expect(() =>
			run({ input: "name,score\n=x,1\n'=x,2", headings: "From column" }),
		).toThrow(/unique/);
		expect(() =>
			run({ input: ["x", ...Array(200).fill("a")].join("\n") }),
		).toThrow(/199/);
		expect(() => run({ input: " " })).toThrow();
	});
});
