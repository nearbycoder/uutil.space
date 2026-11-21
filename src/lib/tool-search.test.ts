import { describe, expect, it } from "vitest";
import {
	filterAndRankTools,
	formatTextStats,
	type SearchableTool,
	tokenizeQuery,
} from "./tool-search";

const SAMPLE_TOOLS: SearchableTool[] = [
	{
		id: "yaml-to-json",
		name: "YAML to JSON",
		category: "Conversion",
		summary: "Convert YAML documents into JSON output.",
	},
	{
		id: "json-format-validate",
		name: "JSON Format/Validate",
		category: "Core",
		summary: "Pretty print, minify, and validate JSON payloads.",
	},
	{
		id: "json-structural-diff",
		name: "JSON Structural Diff",
		category: "Core",
		summary: "Compare JSON values with added, removed, and changed paths.",
	},
	{
		id: "csv-multi-sort",
		name: "CSV Multi-Column Sort",
		category: "Conversion",
		summary: "Sort CSV rows by multiple columns.",
	},
	{
		id: "shopping-list",
		name: "Shopping List Consolidator",
		category: "Productivity",
		summary: "Combine repeated items and quantities into a grocery checklist.",
	},
];

describe("tool search and ranking", () => {
	it("tokenizes whitespace and punctuation cleanly", () => {
		expect(tokenizeQuery("  JSON / diff_tool  ")).toEqual([
			"json",
			"diff",
			"tool",
		]);
		expect(tokenizeQuery("   ")).toEqual([]);
	});

	it("preserves original order when the search query is empty", () => {
		expect(filterAndRankTools(SAMPLE_TOOLS, "").map((t) => t.id)).toEqual(
			SAMPLE_TOOLS.map((t) => t.id),
		);
	});

	it("matches multi-token queries across non-adjacent words", () => {
		expect(
			filterAndRankTools(SAMPLE_TOOLS, "json diff").map((t) => t.id),
		).toEqual(["json-structural-diff"]);
		expect(
			filterAndRankTools(SAMPLE_TOOLS, "csv sort").map((t) => t.id),
		).toEqual(["csv-multi-sort"]);
	});

	it("ranks name prefix and word-start matches ahead of substring matches", () => {
		const results = filterAndRankTools(SAMPLE_TOOLS, "json").map((t) => t.id);
		expect(results[0]).toBe("json-format-validate");
		expect(results[1]).toBe("json-structural-diff");
		expect(results[2]).toBe("yaml-to-json");
	});

	it("matches by summary keywords and tool ids", () => {
		expect(
			filterAndRankTools(SAMPLE_TOOLS, "grocery checklist").map((t) => t.id),
		).toEqual(["shopping-list"]);
		expect(
			filterAndRankTools(SAMPLE_TOOLS, "shopping-list").map((t) => t.id),
		).toEqual(["shopping-list"]);
	});
});

describe("formatTextStats", () => {
	it("formats empty, single-line, and multi-line text stats", () => {
		expect(formatTextStats("")).toBe("");
		expect(formatTextStats("a")).toBe("1 character");
		expect(formatTextStats("hello")).toBe("5 characters");
		expect(formatTextStats("line 1\nline 2\nline 3")).toBe(
			"20 characters · 3 lines",
		);
	});
});
