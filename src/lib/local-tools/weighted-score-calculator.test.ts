import { describe, expect, it } from "vitest";
import { defaults, execute } from "./types";
import { tool } from "./weighted-score-calculator";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
const fixture = (scores: unknown) =>
	JSON.stringify({
		criteria: [
			{ name: "cost", weight: 2, min: 0, max: 10, direction: "lower" },
		],
		candidates: [{ name: "X", scores }],
	});
describe("weighted scorecard", () => {
	it("renormalizes excluded criteria and validates direction types", () => {
		const data = JSON.parse(defaults(tool).input);
		delete data.candidates[0].scores.quality;
		const a = run({
			input: JSON.stringify(data),
			missing: "Exclude criterion",
		}).rankings.find((r: { name: string }) => r.name === "Option A");
		expect(a).toMatchObject({
			scorePercent: 60,
			includedWeight: 30,
			excludedCriteria: 1,
		});
		data.criteria[0].direction = ["higher"];
		expect(() =>
			run({ input: JSON.stringify(data), missing: "Exclude criterion" }),
		).toThrow();
	});
	it("ranks by normalized weighted contributions", () => {
		const x = run().rankings;
		expect(x.map((r: { name: string }) => r.name)).toEqual([
			"Option B",
			"Option A",
		]);
		expect(x[0].scorePercent).toBeCloseTo(83);
		expect(x[1].scorePercent).toBeCloseTo(81);
	});
	it("supports lower-is-better, clamping and missing policies", () => {
		expect(run({ input: fixture({ cost: 2 }) }).rankings[0].scorePercent).toBe(
			80,
		);
		expect(
			run({ input: fixture({ cost: 20 }), bounds: "Clamp" }).rankings[0]
				.scorePercent,
		).toBe(0);
		expect(
			run({ input: fixture({}), missing: "Zero normalized score" }).rankings[0]
				.scorePercent,
		).toBe(0);
		expect(() =>
			run({ input: fixture({}), missing: "Exclude criterion" }),
		).toThrow(/positive/);
	});
	it("uses shared competition ranks and stable ties", () => {
		const d = JSON.parse(defaults(tool).input);
		d.candidates[1].scores = d.candidates[0].scores;
		expect(
			run({ input: JSON.stringify(d) }).rankings.map(
				(r: { rank: number }) => r.rank,
			),
		).toEqual([1, 1]);
	});
	it("rejects unknown criteria, duplicate candidates and out-of-range scores", () => {
		expect(() => run({ input: fixture({ typo: 1 }) })).toThrow(/Unknown/);
		expect(() => run({ input: fixture({ cost: 20 }) })).toThrow(/range/);
		const d = JSON.parse(defaults(tool).input);
		d.candidates[1].name = d.candidates[0].name;
		expect(() => run({ input: JSON.stringify(d) })).toThrow(/unique/);
	});
});
