import { describe, expect, it } from "vitest";
import { tool } from "./percentage-calculator";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("percentages", () => {
	it("does not underflow the symmetric baseline for subnormal values", () => {
		expect(
			run({ input: "5e-324", other: "0", operation: "Percent difference" })
				.result,
		).toBe(200);
	});
	it("computes percentages, shares and changes", () => {
		expect(run()).toMatchObject({ result: 25, formatted: "25.0000%" });
		expect(
			run({ input: "20", other: "80", operation: "A percent of B" }).result,
		).toBe(16);
		expect(
			run({ input: "20", other: "80", operation: "A as percent of B" }).result,
		).toBe(25);
	});
	it("makes negative-baseline and symmetric difference conventions explicit", () => {
		expect(run({ input: "-100", other: "-50" }).result).toBe(50);
		expect(
			run({ input: "0", other: "0", operation: "Percent difference" }).result,
		).toBe(0);
		expect(
			run({ input: "50", other: "100", operation: "Percent difference" })
				.result,
		).toBeCloseTo(200 / 3);
	});
	it("round-trips increases and decreases", () => {
		const increased = run({
			input: "80",
			other: "25",
			operation: "Increase A by B percent",
		}).result;
		expect(
			run({
				input: String(increased),
				other: "25",
				operation: "Reverse increase",
			}).result,
		).toBe(80);
		expect(
			run({ input: "80", other: "25", operation: "Decrease A by B percent" })
				.result,
		).toBe(60);
		expect(
			run({ input: "60", other: "25", operation: "Reverse decrease" }).result,
		).toBe(80);
	});
	it("rejects undefined calculations and invalid inputs", () => {
		expect(() => run({ input: "0" })).toThrow(/zero/);
		expect(() => run({ other: "100", operation: "Reverse decrease" })).toThrow(
			/zero/,
		);
		expect(() => run({ input: "NaN" })).toThrow();
		expect(() => run({ places: "13" })).toThrow();
	});
});
