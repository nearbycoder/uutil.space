import { expect, test } from "vitest";
import { tool } from "./batch-timestamp-converter";
import { parseIsoInstant } from "./dates";
import { defaults, execute } from "./types";

test("converts valid lines independently and preserves source line numbers", () => {
	const result = JSON.parse(execute(tool, defaults(tool)));
	expect(result.valid).toBe(2);
	expect(result.invalid).toBe(1);
	expect(result.results[0].unixMilliseconds).toBe(0);
	expect(
		JSON.parse(
			execute(tool, { input: "-0.001\n\n1.234", unit: "Unix seconds" }),
		).results[1],
	).toMatchObject({ line: 3, unixMilliseconds: 1234 });
});
test("rejects ambiguous or impossible dates and preserves explicit offsets", () => {
	for (const value of [
		"2026-02-30T12:00:00Z",
		"2026-01-01T25:00:00Z",
		"2026-01-01T12:00:00",
	])
		expect(() => parseIsoInstant(value)).toThrow();
	expect(parseIsoInstant("2024-02-29T12:00:00+02:00").toISOString()).toBe(
		"2024-02-29T10:00:00.000Z",
	);
	expect(
		JSON.parse(execute(tool, { input: "1.5", unit: "Unix milliseconds" }))
			.invalid,
	).toBe(1);
});
