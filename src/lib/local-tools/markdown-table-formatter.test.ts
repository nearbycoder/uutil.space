import { marked } from "marked";
import { describe, expect, it } from "vitest";
import { tool } from "./markdown-table-formatter";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("Markdown table formatter", () => {
	it("aligns source while preserving rendered table semantics", () => {
		const x = run();
		expect(x.split("\n").map((l) => l.length)).toEqual([20, 20, 20, 20]);
		expect(marked.parse(x)).toBe(marked.parse(defaults(tool).input));
		expect(run({ input: x })).toBe(x);
	});
	it("keeps escaped pipes in cells", () => {
		const input = "a | b\n--- | ---\nx\\|y | z";
		expect(marked.parse(run({ input }))).toBe(marked.parse(input));
	});
	it("pads missing cells and rejects extra ones", () => {
		expect(run({ input: "a | b\n--- | ---\nx" })).toContain("| x");
		expect(() =>
			run({ input: "a | b\n--- | ---\nx", ragged: "Error" }),
		).toThrow();
		expect(() => run({ input: "a | b\n--- | ---\nx|y|z" })).toThrow();
	});
	it("can override alignment and validates delimiter rows", () => {
		expect(run({ alignment: "Center" })).toContain(":------:");
		expect(() => run({ input: "a|b\n---" })).toThrow();
		expect(() => run({ input: "a|b\n---|---\n\nx|y" })).toThrow();
	});
});
