import { describe, expect, it } from "vitest";
import { tool } from "./text-truncate";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	execute(tool, { ...defaults(tool), ...v });
describe("Unicode truncation", () => {
	it("counts the marker and preserves fitting text", () => {
		expect(Array.from(run()).length).toBe(24);
		expect(run({ input: "abc", limit: "3" })).toBe("abc");
		expect(run({ input: "abcdef", limit: "4", marker: ".." })).toBe("ab..");
	});
	it("supports start, middle and zero budgets", () => {
		expect(run({ input: "abcdef", limit: "4", position: "Start" })).toBe(
			"…def",
		);
		expect(run({ input: "abcdef", limit: "4", position: "Middle" })).toBe(
			"ab…f",
		);
		expect(run({ limit: "0", marker: "" })).toBe("");
		expect(() => run({ limit: "0" })).toThrow(/marker/);
	});
	it("preserves combined graphemes and byte limits", () => {
		const family = "👨‍👩‍👧";
		expect(run({ input: `${family}abc`, limit: "2" })).toBe(`${family}…`);
		expect(
			run({ input: "ééé", unit: "UTF-8 bytes", limit: "5", marker: "." }),
		).toBe("éé.");
		expect(
			run({
				input: `${family}abc`,
				unit: "UTF-8 bytes",
				limit: "4",
				marker: ".",
			}),
		).toBe(".");
	});
	it("obeys budgets for every position and does not trim", () => {
		for (const position of ["Start", "Middle", "End"])
			for (let n = 1; n < 12; n++) {
				const x = run({
					input: " é👩‍💻漢字abc ",
					unit: "UTF-8 bytes",
					limit: String(n),
					marker: ".",
					position,
				});
				expect(new TextEncoder().encode(x).length).toBeLessThanOrEqual(n);
			}
		expect(run({ input: " a ", limit: "3" })).toBe(" a ");
	});
});
