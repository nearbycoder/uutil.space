import { describe, expect, it } from "vitest";
import { tool } from "./byte-hexdump";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("hexdump", () => {
	it("emits correct byte positions and an exclusive end offset", () => {
		const out = run({ input: "Hello" });
		expect(out).toContain("00000000  48 65 6c 6c 6f");
		expect(out).toContain("|Hello|");
		expect(out.endsWith("00000005")).toBe(true);
	});
	it("handles arbitrary bytes and printable ASCII boundaries", () => {
		expect(run({ input: "1f 20 7e 7f ff", format: "Hex bytes" })).toContain(
			"|. ~..|",
		);
		expect(run({ input: "é" })).toContain("c3 a9");
		expect(run({ input: "é" })).toContain("|..|");
	});
	it("supports offset radix, uppercase, row width and gutter omission", () => {
		const out = run({
			input: "ff ".repeat(9),
			format: "Hex bytes",
			offset: "0x10",
			columns: "8",
			case: "Uppercase",
			radix: "Decimal",
			ascii: "Omit",
		});
		expect(out.split("\n")).toHaveLength(3);
		expect(out).toContain("00000016  FF FF");
		expect(out.endsWith("00000025")).toBe(true);
		expect(out).not.toContain("|");
	});
	it("does not overflow the address column at the 32-bit boundary", () => {
		expect(
			run({ input: "abc", offset: "4294967295" }).endsWith("100000002"),
		).toBe(true);
	});
	it("rejects incomplete hex, invalid offsets, surrogates and oversize input", () => {
		const cases: Record<string, string>[] = [
			{ input: "f", format: "Hex bytes" },
			{ offset: "-1" },
			{ offset: "1e3" },
			{ input: "\ud800" },
			{ input: "a".repeat(100001) },
		];
		for (const v of cases) expect(() => run(v)).toThrow();
	});
});
