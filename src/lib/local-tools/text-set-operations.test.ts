import { expect, test } from "vitest";
import { tool } from "./text-set-operations";
import { defaults, execute } from "./types";

test("computes all four set operations without duplicates", () => {
	const v = { ...defaults(tool), format: "Lines" };
	expect(execute(tool, v)).toBe("banana");
	expect(execute(tool, { ...v, operation: "Union" })).toBe(
		"apple\nbanana\npear\norange",
	);
	expect(execute(tool, { ...v, operation: "A minus B" })).toBe("apple\npear");
	expect(execute(tool, { ...v, operation: "Symmetric difference" })).toBe(
		"apple\npear\norange",
	);
});
test("normalizes matching without losing original spelling and accepts an empty B", () => {
	const v = {
		...defaults(tool),
		left: " Alex \nALEX",
		right: "alex",
		compare: "Trim and ignore case",
		format: "Lines",
	};
	expect(execute(tool, v)).toBe(" Alex ");
	expect(execute(tool, { ...v, right: "" })).toBe("");
	expect(() => execute(tool, { ...v, operation: "invalid" })).toThrow();
});
