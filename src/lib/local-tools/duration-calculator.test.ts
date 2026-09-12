import { describe, expect, it } from "vitest";
import { tool } from "./duration-calculator";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("duration arithmetic", () => {
	it("sums signed unit tokens and converts exact milliseconds", () => {
		expect(run()).toMatchObject({
			milliseconds: "7200000",
			clock: "2:00:00.000",
		});
		expect(run({ input: "0.001h 2m 5ms" }).milliseconds).toBe("123605");
	});
	it("handles extended clocks, subtraction and extrema", () => {
		expect(run({ input: "25:01:02.003", format: "Clock" }).parts).toMatchObject(
			{ days: "1", hours: 1, minutes: 1, seconds: 2, milliseconds: 3 },
		);
		expect(run({ operation: "Subtract subsequent" }).clock).toBe("1:00:00.000");
		expect(run({ operation: "Minimum" }).clock).toBe("-0:15:00.000");
	});
	it("reports rounded averages with signed half handling", () => {
		expect(
			run({ input: "-1\n0", format: "Milliseconds", operation: "Average" }),
		).toMatchObject({ milliseconds: "-1", rounded: true });
		expect(
			run({
				input: "-1\n0",
				format: "Milliseconds",
				operation: "Average",
				rounding: "Truncate",
			}).milliseconds,
		).toBe("0");
	});
	it("rejects ambiguous clocks, sub-millisecond precision and bad tokens", () => {
		expect(() => run({ input: "1:60:00", format: "Clock" })).toThrow(/Line 1/);
		expect(() => run({ input: "0.1ms" })).toThrow(/whole/);
		expect(() => run({ input: "1h junk" })).toThrow();
		expect(() => run({ input: "1h -2m" })).toThrow();
	});
});
