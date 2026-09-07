import { expect, test } from "vitest";
import { defaults, execute } from "./types";
import { tool } from "./utm-link-builder";

test("builds encoded links while preserving unrelated data and fragments", () => {
	const v = defaults(tool),
		url = new URL(execute(tool, { ...v, campaign: "launch & learn" }));
	expect(url.searchParams.get("campaign")).toBeNull();
	expect(url.searchParams.get("utm_campaign")).toBe("launch & learn");
	expect(url.searchParams.get("ref")).toBe("guide");
	expect(url.hash).toBe("#quickstart");
});
test("handles replacement and preservation and refuses unsafe URLs", () => {
	const v = {
		...defaults(tool),
		url: "https://example.com/?utm_source=old&utm_term=remove",
	};
	expect(new URL(execute(tool, v)).searchParams.has("utm_term")).toBe(false);
	expect(
		new URL(
			execute(tool, { ...v, existing: "Preserve existing" }),
		).searchParams.get("utm_source"),
	).toBe("old");
	for (const url of [
		"javascript:alert(1)",
		"https://user:pass@example.com",
		"not a url",
	])
		expect(() => execute(tool, { ...v, url })).toThrow();
});
