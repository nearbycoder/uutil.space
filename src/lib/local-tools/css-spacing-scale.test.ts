import { expect, test } from "vitest";
import { tool } from "./css-spacing-scale";
import { defaults, execute } from "./types";

test("generates zero plus linear and modular scales with unit conversion", () => {
	const v = defaults(tool);
	expect(execute(tool, v)).toContain("--space-1: 0.25rem;");
	expect(execute(tool, v)).toContain("--space-8: 2rem;");
	const tokens = JSON.parse(
		execute(tool, {
			...v,
			format: "JSON tokens",
			scale: "Modular",
			steps: "3",
			unit: "px",
			ratio: "2",
		}),
	);
	expect(tokens.map((t: { pixels: number }) => t.pixels)).toEqual([
		0, 4, 8, 16,
	]);
});
test("rejects CSS injection and oversized or invalid scales", () => {
	const v = defaults(tool);
	expect(() => execute(tool, { ...v, prefix: "x; color:red" })).toThrow();
	expect(() => execute(tool, { ...v, base: "NaN" })).toThrow();
	expect(() =>
		execute(tool, { ...v, scale: "Modular", steps: "32", ratio: "3" }),
	).toThrow();
});
