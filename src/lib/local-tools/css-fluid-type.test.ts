import { describe, expect, it } from "vitest";
import { tool } from "./css-fluid-type";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("fluid type", () => {
	it("hits endpoints and clamps outside the range", () => {
		const x = run();
		expect(x.css).toContain("clamp(1rem");
		expect(
			x.samples.find((s: { viewportPx: number }) => s.viewportPx === 360)
				.fontPx,
		).toBe(16);
		expect(
			x.samples.find((s: { viewportPx: number }) => s.viewportPx === 1280)
				.fontPx,
		).toBe(24);
		expect(x.samples[0].fontPx).toBe(16);
		expect(x.samples.at(-1).fontPx).toBe(24);
	});
	it("interpolates the midpoint and supports px terms", () => {
		const x = run({ minViewport: "400", maxViewport: "1200", unit: "px" });
		expect(x.css).toBe("font-size: clamp(16px, calc(12px + 1vw), 24px);");
		expect(
			x.samples.find((s: { viewportPx: number }) => s.viewportPx === 800)
				.fontPx,
		).toBe(20);
	});
	it("supports constant scales, alternate roots and negative intercepts", () => {
		expect(run({ maxFont: "16", root: "20" }).css).toBe(
			"font-size: clamp(0.8rem, calc(0.8rem + 0vw), 0.8rem);",
		);
		expect(
			run({
				minFont: "10",
				maxFont: "100",
				minViewport: "400",
				maxViewport: "500",
			}).formula.interceptPx,
		).toBe(-350);
	});
	it("rejects reversed, zero, nonfinite and fractional viewport bounds", () => {
		const cases: Record<string, string>[] = [
			{ minFont: "30" },
			{ minFont: "0" },
			{ root: "NaN" },
			{ maxViewport: "360" },
			{ minViewport: "2.5" },
		];
		for (const v of cases) expect(() => run(v)).toThrow();
	});
});
