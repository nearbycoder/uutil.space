import { describe, expect, it } from "vitest";
import { tool } from "./integer-bitwise-calculator";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v })).result;
describe("bitwise calculator", () => {
	it("computes masks and two signedness views", () => {
		expect(run()).toMatchObject({
			unsigned: "192",
			signed: "-64",
			hex: "0xc0",
			binary: "11000000",
			setBits: 2,
		});
		expect(run({ operation: "XOR" }).unsigned).toBe("60");
		expect(run({ operation: "OR" }).unsigned).toBe("252");
		expect(run({ operation: "NOT" }).unsigned).toBe("15");
	});
	it("distinguishes shifts and wraps only rotations", () => {
		expect(run({ operation: "Logical shift right" }).unsigned).toBe("120");
		expect(run({ operation: "Arithmetic shift right" }).signed).toBe("-8");
		expect(run({ operation: "Shift left", shift: "8" }).unsigned).toBe("0");
		expect(run({ operation: "Rotate left", shift: "8" }).unsigned).toBe("240");
		expect(run({ operation: "Rotate right", shift: "4" }).unsigned).toBe("15");
	});
	it("preserves full 128-bit precision and explicit wrapping", () => {
		expect(
			run({
				input: "0xffffffffffffffffffffffffffffffff",
				operation: "NOT",
				width: "128",
			}).unsigned,
		).toBe("0");
		expect(
			run({ input: "256", operation: "NOT", overflow: "Wrap" }).unsigned,
		).toBe("255");
		expect(
			run({ input: "-0b1", operation: "Logical shift right" }).unsigned,
		).toBe("127");
	});
	it("rejects out-of-range operands, missing B and bad counts", () => {
		expect(() => run({ input: "-129" })).toThrow(/width/);
		expect(() => run({ input: "256" })).toThrow();
		expect(() => run({ other: "" })).toThrow();
		expect(() => run({ shift: "-1" })).toThrow();
		expect(() => run({ input: "1.2" })).toThrow();
	});
});
