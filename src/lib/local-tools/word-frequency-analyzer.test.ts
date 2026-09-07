import { expect, test } from "vitest";
import { defaults, execute } from "./types";
import { tool } from "./word-frequency-analyzer";

test("counts words with normalization exclusions and deterministic ties", () => {
	const v = defaults(tool),
		result = JSON.parse(execute(tool, v));
	expect(result.frequencies[0]).toMatchObject({ word: "build", count: 2 });
	const filtered = JSON.parse(
		execute(tool, {
			...v,
			input: "Café café THE x",
			exclude: "the",
			minimum: "2",
		}),
	);
	expect(filtered.includedWords).toBe(2);
	expect(filtered.uniqueWords).toBe(1);
	expect(
		JSON.parse(execute(tool, { ...v, limit: "1" })).omittedTerms,
	).toBeGreaterThan(0);
});
test("handles no words and validates locale and bounds", () => {
	const v = defaults(tool);
	expect(JSON.parse(execute(tool, { ...v, input: "!!!" })).frequencies).toEqual(
		[],
	);
	expect(() => execute(tool, { ...v, locale: "invalid_locale" })).toThrow();
	expect(() => execute(tool, { ...v, limit: "0" })).toThrow();
});
