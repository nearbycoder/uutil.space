import { describe, expect, it } from "vitest";
import { tool } from "./glob-pattern-tester";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("glob subset", () => {
	it("matches zero or multiple directories", () => {
		expect(JSON.parse(run()).matchedCount).toBe(2);
		expect(
			JSON.parse(run({ input: "x.ts\na/x.ts\na/b/x.ts", pattern: "**/*.ts" }))
				.matched,
		).toHaveLength(3);
	});
	it("distinguishes segment and recursive stars", () => {
		expect(
			JSON.parse(run({ input: "a/b\na/b/c", pattern: "a/*" })).matched,
		).toEqual(["a/b"]);
		expect(
			JSON.parse(run({ input: "a/b\na/b/c", pattern: "a/**" })).matched,
		).toHaveLength(2);
	});
	it("handles escapes, Unicode, dotfiles, spaces and case", () => {
		expect(
			run({
				input: "💡.ts\nab.ts\n.x.ts",
				pattern: "?.ts",
				output: "Matched paths",
			}),
		).toBe("💡.ts");
		expect(
			run({
				input: "a*b\nA*B",
				pattern: "a\\*b",
				case: "Insensitive",
				output: "Matched paths",
			}),
		).toBe("a*b\nA*B");
		expect(run({ input: ".env", pattern: "*", output: "Matched paths" })).toBe(
			".env",
		);
	});
	it("exports unmatched paths and rejects unsupported or oversized patterns", () => {
		expect(run({ output: "Unmatched paths" })).toBe("src/app.tsx\nREADME.md");
		for (const pattern of ["[ab]", "{a,b}", "x\\", "*".repeat(257)])
			expect(() => run({ pattern })).toThrow();
	});
	it("uses bounded matching on adversarial wildcard sequences", () => {
		expect(
			JSON.parse(
				run({
					input: `${"a".repeat(10000)}z`,
					pattern: `${"*a".repeat(100)}b`,
				}),
			).matchedCount,
		).toBe(0);
	});
});
