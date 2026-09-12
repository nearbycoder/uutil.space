import { describe, expect, it } from "vitest";
import { tool } from "./json-array-chunker";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("array chunker", () => {
	it("bounds repeated large values before output serialization", () => {
		expect(() =>
			run({
				input: JSON.stringify([...Array(30).fill(0), "x".repeat(100000)]),
				mode: "Sliding windows",
				size: "31",
			}),
		).toThrow(/2 MB/);
	});
	it("batches preserving types and partial groups", () => {
		expect(run().groups).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
		expect(run({ input: '[null,{"x":1},false]' }).groups).toEqual([
			[null, { x: 1 }, false],
		]);
	});
	it("drops and pads remainders", () => {
		expect(run({ remainder: "Drop" }).groupCount).toBe(2);
		expect(run({ remainder: "Pad with null" }).groups[2]).toEqual([
			7,
			null,
			null,
		]);
	});
	it("slides with configurable steps", () => {
		expect(
			run({ input: "[1,2,3,4]", mode: "Sliding windows", size: "3", step: "2" })
				.groups,
		).toEqual([
			[1, 2, 3],
			[3, 4],
		]);
		expect(run({ mode: "Sliding windows", step: "5" }).groups).toEqual([
			[1, 2, 3],
			[6, 7],
		]);
	});
	it("handles empty arrays and rejects invalid or excessive work", () => {
		expect(run({ input: "[]" }).groups).toEqual([]);
		expect(() => run({ input: "{}" })).toThrow();
		expect(() => run({ size: "0" })).toThrow();
		expect(() =>
			run({
				input: JSON.stringify(Array(10000).fill(1)),
				mode: "Sliding windows",
				size: "1000",
			}),
		).toThrow(/emitted/);
	});
});
