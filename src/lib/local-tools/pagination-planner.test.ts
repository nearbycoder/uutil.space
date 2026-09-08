import { describe, expect, it } from "vitest";
import { tool } from "./pagination-planner";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("pagination", () => {
	it("computes inclusive ranges, offsets and navigation gaps", () => {
		const x = run();
		expect(x).toMatchObject({
			totalPages: 10,
			page: 3,
			offset: 50,
			recordsOnPage: 25,
			recordRange: { first: 51, last: 75 },
			previousPage: 2,
			nextPage: 4,
		});
		expect(x.navigation).toContainEqual({ gap: true, from: 6, to: 9 });
	});
	it("clamps to partial last pages and supports zero-based APIs", () => {
		expect(run({ page: "100" })).toMatchObject({
			page: 10,
			wasClamped: true,
			offset: 225,
			recordsOnPage: 12,
			hasNext: false,
		});
		expect(run({ base: "Zero-based", page: "0" })).toMatchObject({
			page: 0,
			offset: 0,
			previousPage: null,
			nextPage: 1,
			recordRange: { first: 1, last: 25 },
		});
	});
	it("returns unambiguous empty and single-page states", () => {
		expect(run({ total: "0" })).toMatchObject({
			page: null,
			totalPages: 0,
			recordRange: null,
			navigation: [],
			recordsOnPage: 0,
		});
		expect(run({ total: "1" }).navigation).toEqual([
			{ page: 1, current: true },
		]);
	});
	it("uses exact arithmetic at safe integer boundaries", () => {
		const total = Number.MAX_SAFE_INTEGER,
			x = run({ total: String(total), size: "7", page: String(total) });
		expect(x.totalPages).toBe(Number((BigInt(total) + 6n) / 7n));
		expect(x.recordRange.last).toBe(total);
		expect(BigInt(x.offset) + BigInt(x.recordsOnPage)).toBe(BigInt(total));
	});
	it("rejects bad boundaries and can show only first/current/last", () => {
		expect(() => run({ page: "0", bounds: "Error" })).toThrow();
		expect(() => run({ size: "0" })).toThrow();
		expect(() => run({ total: "9007199254740992" })).toThrow();
		expect(
			run({ radius: "0" })
				.navigation.filter((n: { page?: number }) => n.page !== undefined)
				.map((n: { page: number }) => n.page),
		).toEqual([1, 3, 10]);
	});
});
