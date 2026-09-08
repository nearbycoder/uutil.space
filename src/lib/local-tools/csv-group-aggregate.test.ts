import { describe, expect, it } from "vitest";
import { tool } from "./csv-group-aggregate";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("CSV Group & Aggregate", () => {
	it("averages nonblank values and reports counts", () =>
		expect(run()).toBe(
			"team,agg_rows,agg_values,agg_result\nDesign,3,2,92\nEngineering,1,1,88",
		));
	it("counts groups without a numeric column", () =>
		expect(run({ operation: "Count", metric: "", groups: "" })).toContain(
			"4,4,4",
		));
	it("supports blank zero, minimum and maximum", () => {
		expect(run({ blanks: "Zero", operation: "Minimum" })).toContain(
			"Design,3,3,0",
		);
		expect(run({ operation: "Maximum" })).toContain("Design,3,2,92");
		expect(run({ operation: "Sum" })).toContain("Design,3,2,184");
	});
	it("keeps separator-containing keys distinct", () =>
		expect(
			run({
				input: 'a,b,n\n"x,y",z,1\nx,"y,z",2',
				groups: "a\nb",
				metric: "n",
				operation: "Sum",
			}).split("\n"),
		).toHaveLength(3));
	it("rejects invalid metric data, blank error and conflicting headers", () => {
		expect(() => run({ metric: "unknown" })).toThrow();
		expect(() => run({ blanks: "Error" })).toThrow();
		expect(() =>
			run({ input: "x,n\na,Infinity", groups: "x", metric: "n" }),
		).toThrow();
		expect(() => run({ input: " " })).toThrow();
	});
});
