import { describe, expect, it } from "vitest";
import { tool } from "./css-grid-planner";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("CSS grid planning", () => {
	it("accounts for padding, gaps and multiple rows", () => {
		expect(run()).toMatchObject({
			columns: 4,
			rows: 2,
			trackWidth: 270,
			totalHeight: 392,
		});
		expect(run().positionsPreview[4]).toMatchObject({
			row: 2,
			column: 1,
			x: 24,
			y: 208,
		});
	});
	it("distinguishes auto-fit and auto-fill with sparse content", () => {
		expect(run({ items: "2" })).toMatchObject({ columns: 2, trackWidth: 564 });
		expect(run({ items: "2", mode: "Auto-fill" })).toMatchObject({
			columns: 4,
			trackWidth: 270,
		});
		expect(run({ items: "0" })).toMatchObject({
			columns: 0,
			rows: 0,
			trackWidth: null,
			totalHeight: 48,
		});
	});
	it("handles narrow containers and explicit fixed columns", () => {
		expect(run({ input: "200" })).toMatchObject({
			columns: 1,
			trackWidth: 152,
		});
		expect(run({ mode: "Fixed columns", columns: "3" })).toMatchObject({
			columns: 3,
			trackWidth: 368,
			rows: 3,
		});
		expect(run({ items: "100" }).positionsPreview).toHaveLength(50);
	});
	it("rejects impossible padding and gaps", () => {
		expect(() => run({ input: "100", padding: "50" })).toThrow(/Padding/);
		expect(() =>
			run({
				input: "100",
				padding: "0",
				mode: "Fixed columns",
				columns: "3",
				gap: "100",
			}),
		).toThrow(/gaps/);
		expect(() => run({ items: "501" })).toThrow();
	});
});
