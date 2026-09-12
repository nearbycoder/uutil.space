import { describe, expect, it } from "vitest";
import { tool } from "./number-statistics";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("number statistics", () => {
	it("matches a known population", () => {
		expect(run()).toMatchObject({
			count: 8,
			sum: 40,
			mean: 5,
			median: 4.5,
			variance: 4,
			standardDeviation: 2,
			modes: [4],
			modeFrequency: 3,
		});
		expect(run({ variance: "Sample" }).variance).toBeCloseTo(32 / 7);
	});
	it("handles a singleton and percentile endpoints", () => {
		expect(run({ input: "7", variance: "Sample" })).toMatchObject({
			mean: 7,
			variance: null,
			modes: [],
		});
		expect(run({ percentile: "0" }).percentile.value).toBe(2);
		expect(run({ percentile: "100" }).percentile.value).toBe(9);
	});
	it("uses compensated summation and reports tied modes and outliers", () => {
		expect(run({ input: "10000000000000000,1,-10000000000000000" }).sum).toBe(
			1,
		);
		expect(run({ input: "1,1,2,2,100" })).toMatchObject({
			modes: [1, 2],
			outliers: [100],
		});
	});
	it("rejects invalid, nonfinite and oversized input", () => {
		expect(() => run({ input: "1,NaN" })).toThrow();
		expect(() => run({ input: "1e101" })).toThrow();
		expect(() => run({ percentile: "101" })).toThrow();
		expect(() => run({ input: Array(10001).fill(1).join(",") })).toThrow();
	});
});
