import { describe, expect, it } from "vitest";
import { tool } from "./text-line-affixes";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("text affixes", () => {
	it("bounds affix expansion before joining output", () => {
		expect(() =>
			run({ input: "a\n".repeat(1000), prefix: "x".repeat(3000) }),
		).toThrow(/exceeds/);
	});
	it("adds numbered affixes and removes them exactly", () => {
		expect(run()).toBe("1. alpha\n2. beta\n3. gamma");
		expect(run({ input: run(), mode: "Remove once" })).toBe(
			defaults(tool).input,
		);
	});
	it("preserves mixed line endings and skipped blank lines", () => {
		expect(
			run({ input: "a\r\n \nb\r", start: "8", width: "2", suffix: "!" }),
		).toBe("08. a!\r\n \n09. b!\r");
	});
	it("supports blank processing and repeated number placeholders", () => {
		expect(
			run({
				input: "a\n\nb",
				blank: "Process",
				prefix: "{n}:{n} ",
				suffix: " {n}",
			}),
		).toBe("1:1 a 1\n2:2  2\n3:3 b 3");
	});
	it("avoids overlapping removals and reports mismatches", () => {
		expect(
			run({ input: "abc", mode: "Remove once", prefix: "ab", suffix: "bc" }),
		).toBe("abc");
		expect(() => run({ mode: "Remove once", mismatch: "Error" })).toThrow(
			/line 1/,
		);
		expect(() => run({ prefix: "x\n" })).toThrow();
		expect(() => run({ width: "0" })).toThrow();
		expect(
			run({ input: "hello", prefix: "", suffix: "", mode: "Remove once" }),
		).toBe("hello");
	});
});
