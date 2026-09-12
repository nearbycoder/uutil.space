import { describe, expect, it } from "vitest";
import { tool } from "./business-day-calculator";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("business dates", () => {
	it("counts custom holidays and endpoint choices", () => {
		expect(run().businessDays).toBe(4);
		expect(run({ endpoints: "Include both" }).businessDays).toBe(5);
		expect(run({ input: "2026-09-11", end: "2026-09-04" }).businessDays).toBe(
			-4,
		);
	});
	it("adds forward and backward, excluding the start", () => {
		expect(run({ operation: "Add business days" }).end).toBe("2026-09-14");
		expect(
			run({ input: "2026-09-08", operation: "Add business days", amount: "-1" })
				.end,
		).toBe("2026-09-04");
		expect(
			run({ input: "2026-09-05", operation: "Add business days", amount: "0" })
				.end,
		).toBe("2026-09-05");
	});
	it("handles equal dates, leap days and custom working weeks", () => {
		expect(
			run({ input: "2024-02-29", end: "2024-02-29", endpoints: "Include both" })
				.businessDays,
		).toBe(1);
		expect(run({ input: "2024-02-29", end: "2024-02-29" }).businessDays).toBe(
			0,
		);
		expect(
			run({
				input: "2024-03-09",
				end: "2024-03-11",
				weekend: "[]",
				holidays: "",
				details: "Include working dates",
			}).workingDates,
		).toEqual(["2024-03-10", "2024-03-11"]);
	});
	it("validates dates, holidays and impossible working weeks", () => {
		expect(() => run({ input: "2025-02-29" })).toThrow();
		expect(() => run({ holidays: "bad" })).toThrow();
		expect(() =>
			run({
				weekend: JSON.stringify([
					"Sun",
					"Mon",
					"Tue",
					"Wed",
					"Thu",
					"Fri",
					"Sat",
				]),
			}),
		).toThrow();
		expect(() =>
			run({ input: "9999-12-31", operation: "Add business days", amount: "1" }),
		).toThrow(/supported/);
	});
});
