import { describe, expect, it } from "vitest";
import { tool } from "./css-bezier-sampler";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("Bezier sampler", () => {
	it("samples CSS ease by time rather than curve parameter", () => {
		const x = run();
		expect(x.samples[5].outputProgress).toBeCloseTo(0.802403, 5);
		expect(x.samples[0].value).toBe(0);
		expect(x.samples.at(-1).value).toBe(100);
		expect(x.samples.at(-1).timeMs).toBe(300);
	});
	it("uses presets and interpolates descending values", () => {
		const x = run({ preset: "Linear", from: "100", to: "0", duration: "1000" });
		expect(x.samples[5]).toMatchObject({
			timeMs: 500,
			outputProgress: 0.5,
			value: 50,
		});
		expect(run({ preset: "Ease in out" }).samples[5].outputProgress).toBe(0.5);
	});
	it("preserves overshoot and parses CSS notation", () => {
		const x = run({ input: "cubic-bezier(0.3, 2, 0.6, 2)" });
		expect(x.overshootDetectedInSamples).toBe(true);
		expect(x.sampledOutputRange.maximum).toBeGreaterThan(1);
	});
	it("handles zero derivatives at endpoints without NaN", () => {
		const x = run({ input: "0, 1, 0, 1" });
		expect(
			x.samples.every((s: { outputProgress: number }) =>
				Number.isFinite(s.outputProgress),
			),
		).toBe(true);
		expect(x.samples[0].outputProgress).toBe(0);
	});
	it("rejects invalid control points and numeric limits", () => {
		const cases: Record<string, string>[] = [
			{ input: "2,0,1,1" },
			{ input: "0,,1,1" },
			{ input: "0,NaN,1,1" },
			{ input: "0,11,1,1" },
			{ duration: "0" },
			{ intervals: "201" },
		];
		for (const v of cases) expect(() => run(v)).toThrow();
	});
});
