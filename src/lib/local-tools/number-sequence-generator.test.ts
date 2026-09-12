import { describe, expect, it } from "vitest";
import { tool } from "./number-sequence-generator";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("exact number sequences", () => {
	it("avoids decimal drift", () => {
		expect(JSON.parse(run())).toEqual(["0", "0.1", "0.2", "0.3", "0.4", "0.5"]);
		expect(
			JSON.parse(run({ input: "9007199254740993", change: "1", count: "2" })),
		).toEqual(["9007199254740993", "9007199254740994"]);
	});
	it("supports signed geometric ratios and exact fractions", () => {
		expect(
			JSON.parse(
				run({ input: "1", change: "-0.5", mode: "Geometric", count: "4" }),
			),
		).toEqual(["1", "-0.5", "0.25", "-0.125"]);
		expect(
			JSON.parse(
				run({ input: "2", change: "0", mode: "Geometric", count: "3" }),
			),
		).toEqual(["2", "0", "0"]);
	});
	it("exports lines and handles descending and constant sequences", () => {
		expect(
			run({
				input: "1.00",
				change: "-.25",
				count: "3",
				output: "One per line",
			}),
		).toBe("1\n0.75\n0.5");
		expect(run({ change: "0", count: "2", output: "Comma separated" })).toBe(
			"0, 0",
		);
	});
	it("rejects unsupported input and runaway precision", () => {
		expect(() => run({ change: "1e3" })).toThrow();
		expect(() => run({ count: "0" })).toThrow();
		expect(() =>
			run({
				input: "1",
				change: "0.000000000001",
				mode: "Geometric",
				count: "1000",
			}),
		).toThrow(/2,000/);
	});
});
