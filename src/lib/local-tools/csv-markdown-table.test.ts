import { expect, test } from "vitest";
import { markdownCell, tool } from "./csv-markdown-table";
import { defaults, execute } from "./types";

test("builds aligned tables with explicit truncation", () => {
	expect(execute(tool, defaults(tool))).toContain("| name | team | score |");
	const out = execute(tool, {
		...defaults(tool),
		alignment: "Center",
		limit: "1",
	});
	expect(out).toContain(":---:");
	expect(out).toContain("3 additional rows omitted");
});
test("escapes HTML pipes and multiline cells and validates row limits", () => {
	expect(markdownCell("<script>|**x**\ny")).toBe(
		"&lt;script&gt;\\|\\*\\*x\\*\\*<br>y",
	);
	expect(() => execute(tool, { ...defaults(tool), limit: "0" })).toThrow();
});
