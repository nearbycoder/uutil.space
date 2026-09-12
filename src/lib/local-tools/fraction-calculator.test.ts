import { describe, expect, it } from "vitest";
import { tool } from "./fraction-calculator";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("fraction calculator", () => {
	it("reduces exact operations and decimal inputs", () => {
		expect(run()).toMatchObject({ fraction: "1/2", decimalExact: true });
		expect(run({ input: "0.1", other: "0.2" }).fraction).toBe("3/10");
		expect(
			run({ input: "2/3", other: "3/4", operation: "Multiply" }).fraction,
		).toBe("1/2");
		expect(run({ operation: "Subtract" }).fraction).toBe("1/6");
		expect(run({ operation: "Divide" }).fraction).toBe("2/1");
	});
	it("normalizes signs and previews repeating decimals with explicit rounding", () => {
		expect(
			run({ input: "7/-3", operation: "Simplify first", places: "2" }),
		).toMatchObject({
			fraction: "-7/3",
			mixedNumber: "-2 1/3",
			decimalPreview: "-2.33",
			decimalExact: false,
		});
		expect(
			run({ input: "-1/8", operation: "Simplify first", places: "2" })
				.decimalPreview,
		).toBe("-0.13");
		expect(
			run({
				input: "-1/8",
				operation: "Simplify first",
				places: "2",
				rounding: "Truncate",
			}).decimalPreview,
		).toBe("-0.12");
	});
	it("compares huge values exactly", () => {
		expect(
			run({
				input: "9007199254740993",
				other: "9007199254740992",
				operation: "Compare",
			}).comparison,
		).toBe(1);
		expect(
			run({ input: "2/4", other: ".5", operation: "Compare" }).comparison,
		).toBe(0);
	});
	it("rejects zero divisors and unsupported syntax", () => {
		expect(() => run({ input: "1/0" })).toThrow(/zero/);
		expect(() => run({ other: "0", operation: "Divide" })).toThrow(/zero/);
		expect(() => run({ input: "1/2/3" })).toThrow();
		expect(() => run({ input: "1e2" })).toThrow();
		expect(
			run({ input: "0/-4", operation: "Simplify first", places: "0" }).fraction,
		).toBe("0/1");
	});
});
