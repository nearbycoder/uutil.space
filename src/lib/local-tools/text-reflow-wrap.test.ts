import { describe, expect, it } from "vitest";
import { tool } from "./text-reflow-wrap";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("text reflow", () => {
	it("wraps prose and retains paragraphs", () => {
		const out = run();
		expect(out).toContain("\n\n");
		expect(out.split("\n").every((line) => line.length <= 40)).toBe(true);
		expect(out.replace(/\s+/g, " ")).toBe(
			defaults(tool).input.replace(/\s+/g, " "),
		);
	});
	it("handles CRLF and each-line versus joined modes", () => {
		expect(
			run({ input: "one\r\ntwo\r\n\r\nthree", mode: "Wrap each line" }),
		).toBe("one\ntwo\n\nthree");
		expect(run({ input: "one\n\ntwo", mode: "Single paragraph" })).toBe(
			"one two",
		);
	});
	it("counts Unicode code points and supports hard wrapping and indentation", () => {
		const out = run({
			input: "💡".repeat(21),
			width: "10",
			indent: "2",
			words: "Break",
		});
		expect(out.split("\n").map((x) => [...x].length)).toEqual([10, 10, 7]);
		expect(out.replaceAll(" ", "").replaceAll("\n", "")).toBe("💡".repeat(21));
	});
	it("preserves long words when requested and rejects invalid dimensions", () => {
		expect(run({ input: "supercalifragilistic", width: "10" })).toBe(
			"supercalifragilistic",
		);
		expect(() => run({ width: "10", indent: "10" })).toThrow();
		expect(() => run({ width: "2.5" })).toThrow();
	});
});
