import { describe, expect, it } from "vitest";
import { tool } from "./text-range-extractor";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("line ranges", () => {
	it("extracts inclusive and open-ended ranges", () => {
		expect(run().split("\n")).toHaveLength(4);
		expect(run()).toContain("6: INFO Request complete");
	});
	it("merges duplicates in source order and supports inverse selection", () => {
		const v = { input: "a\nb\nc\nd", ranges: "3,1-2,2", numbers: "Omit" };
		expect(run(v)).toBe("a\nb\nc");
		expect(run({ ...v, selection: "Exclude" })).toBe("d");
	});
	it("preserves whitespace and blank lines with normalized terminators", () => {
		expect(
			run({ input: " a \r\n\r\nc\r\n", ranges: "1-", numbers: "Omit" }),
		).toBe(" a \n\nc");
	});
	it("clamps or rejects out-of-bounds selection", () => {
		expect(() => run({ ranges: "100-" })).toThrow();
		expect(run({ ranges: "100-", bounds: "Clamp" })).toBe("");
		expect(
			run({ input: "a\nb", ranges: "1-20", bounds: "Clamp", numbers: "Omit" }),
		).toBe("a\nb");
	});
	it("rejects zero, descending, malformed and unsafe ranges", () => {
		for (const ranges of ["0", "3-1", "1,,2", "-3", "1.5", "9007199254740992"])
			expect(() => run({ ranges })).toThrow();
	});
});
