import { describe, expect, it } from "vitest";
import { tool } from "./text-similarity";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("text similarity", () => {
	it("computes known edit distances and symmetric normalized scores", () => {
		expect(run()).toMatchObject({
			editDistance: 3,
			similarityPercent: 57.1429,
		});
		expect(run({ input: "sitting", other: "kitten" }).editDistance).toBe(3);
		expect(run({ input: "ab", other: "ba" }).editDistance).toBe(2);
	});
	it("handles empty second text and shared boundaries", () => {
		expect(run({ other: "" })).toMatchObject({
			editDistance: 6,
			similarityPercent: 0,
		});
		expect(run({ input: "abc", other: "axc" })).toMatchObject({
			commonPrefixUnits: 1,
			commonSuffixUnits: 1,
		});
		expect(run({ input: "abc", other: "abc" }).commonSuffixUnits).toBe(0);
	});
	it("normalizes text and compares whole graphemes or words", () => {
		expect(
			run({
				input: " É  x ",
				other: "é x",
				case: "Ignore case",
				whitespace: "Trim and collapse",
			}).equal,
		).toBe(true);
		expect(
			run({ input: "👨‍👩‍👧", other: "", unit: "Grapheme clusters" })
				.editDistance,
		).toBe(1);
		expect(
			run({
				input: "hello world",
				other: "hello big world",
				unit: "Whitespace-separated words",
			}).editDistance,
		).toBe(1);
	});
	it("bounds worst-case work", () => {
		expect(() => run({ input: "a".repeat(2001) })).toThrow(/2,000/);
		expect(() => run({ input: "a".repeat(20001) })).toThrow(/20,000/);
	});
});
