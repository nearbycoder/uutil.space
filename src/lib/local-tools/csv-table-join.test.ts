import { describe, expect, it } from "vitest";
import { tool } from "./csv-table-join";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("CSV Table Join", () => {
	it("left joins and preserves unmatched rows", () => {
		expect(run()).toContain("1,Alex,1,Design");
		expect(run()).toContain("3,Riley,,");
	});
	it("supports inner and full joins", () => {
		expect(run({ join: "Inner" })).not.toContain("Riley");
		expect(run({ join: "Full" })).toContain(",,4,Operations");
	});
	it("supports composite keys and normalized matching", () =>
		expect(
			run({
				input: "a,b,n\n X ,y,1",
				right: "a,b,m\nx,Y,2",
				leftKeys: "a\nb",
				rightKeys: "a\nb",
				matching: "Trim and ignore case",
				join: "Inner",
			}),
		).toContain('" X ",y,1,x,Y,2'));
	it("expands duplicate matches and controls blank keys", () => {
		expect(
			run({ input: "id,n\n1,a\n1,b", right: "id,m\n1,x\n1,y" }).split("\n"),
		).toHaveLength(5);
		expect(
			run({ input: "id,n\n,a", right: "id,m\n,z", join: "Inner" }).split("\n"),
		).toHaveLength(1);
		expect(
			run({
				input: "id,n\n,a",
				right: "id,m\n,z",
				blanks: "Match",
				join: "Inner",
			}),
		).toContain(",a,,z");
	});
	it("rejects missing keys and bounds many-to-many output", () => {
		expect(() => run({ leftKeys: "missing" })).toThrow();
		const input = `id,n\n${Array(101).fill("1,a").join("\n")}`;
		expect(() => run({ input, right: input })).toThrow(/10,000/);
		expect(() => run({ input: " " })).toThrow();
	});
});
