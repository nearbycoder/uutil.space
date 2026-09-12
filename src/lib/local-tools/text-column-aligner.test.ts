import { describe, expect, it } from "vitest";
import { tool } from "./text-column-aligner";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("text columns", () => {
	it("aligns scalar cells and builds matching borders", () => {
		const lines = run().split("\n");
		expect(new Set(lines.map((l) => l.length)).size).toBe(1);
		expect(lines[3]).toContain("| Alex     |    12 | true  |");
	});
	it("formats plain rows with gap and optional header", () => {
		expect(
			run({
				input: '[["a",1],["abc",2]]',
				align: '["left","right"]',
				style: "Plain",
				header: "No",
				gap: "3",
			}),
		).toBe("a     1\nabc   2");
	});
	it("pads missing values and escapes control characters", () => {
		expect(
			run({
				input: '[["a\\nb",null],["x"]]',
				align: "[]",
				style: "Plain",
				header: "No",
			}),
		).toContain("a\\u000ab");
		expect(() =>
			run({ input: '[["a",1],["b"]]', align: "[]", ragged: "Error" }),
		).toThrow();
	});
	it("rejects nested cells, bad alignments and oversized padded output", () => {
		expect(() => run({ input: "[[{}]]", align: "[]" })).toThrow(/scalar/);
		expect(() => run({ align: '["decimal"]' })).toThrow();
		expect(() =>
			run({
				input: JSON.stringify([["x".repeat(2000)], ...Array(999).fill(["x"])]),
				align: "[]",
			}),
		).toThrow(/1 MB/);
	});
});
