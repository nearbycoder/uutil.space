import { describe, expect, it } from "vitest";
import { tool } from "./retry-backoff-planner";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("retry planning", () => {
	it("starts immediately and schedules exponential waits after work", () => {
		const x = run();
		expect(x.totalAttempts).toBe(6);
		expect(
			x.attempts.map((r: { preJitterDelayMs: number }) => r.preJitterDelayMs),
		).toEqual([0, 500, 1000, 2000, 4000, 8000]);
		expect(x.attempts[1].startMs.minimum).toBe(1500);
		expect(x.totalElapsedMs.maximum).toBe(21500);
	});
	it("supports capped constant and linear strategies", () => {
		expect(run({ mode: "Constant" }).totalWaitMs.maximum).toBe(2500);
		expect(
			run({ mode: "Linear", retries: "3", cap: "750" }).totalWaitMs.maximum,
		).toBe(2000);
	});
	it("reports uniform jitter ranges and expectations", () => {
		const full = run({ retries: "1", jitter: "Full" }),
			equal = run({ retries: "1", jitter: "Equal" });
		expect(full.totalWaitMs).toEqual({
			minimum: 0,
			maximum: 500,
			expected: 250,
		});
		expect(equal.totalWaitMs).toEqual({
			minimum: 250,
			maximum: 500,
			expected: 375,
		});
	});
	it("distinguishes possible and all-schedule budget feasibility", () => {
		expect(
			run({ retries: "1", jitter: "Full", budget: "2200" }).budget,
		).toMatchObject({
			someModeledSchedulesFit: true,
			allModeledSchedulesFit: false,
		});
		expect(run({ budget: "0" }).budget).toBeNull();
	});
	it("handles no retries, zero delays and validation bounds", () => {
		expect(run({ retries: "0" }).totalElapsedMs.maximum).toBe(1000);
		expect(run({ base: "0" }).totalWaitMs.maximum).toBe(0);
		const cases: Record<string, string>[] = [
			{ retries: "51" },
			{ base: "-1" },
			{ cap: "0" },
			{ factor: "NaN" },
			{ duration: "1.2" },
		];
		for (const v of cases) expect(() => run(v)).toThrow();
	});
});
