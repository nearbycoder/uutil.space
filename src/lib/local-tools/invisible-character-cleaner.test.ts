import { expect, test } from "vitest";
import { tool } from "./invisible-character-cleaner";
import { defaults, execute } from "./types";

test("cleans selected characters and preserves script/emoji joiners", () => {
	const v = { ...defaults(tool), format: "Cleaned text" };
	expect(execute(tool, v)).toBe("Hello world !");
	expect(execute(tool, { ...v, input: "👩\u200D💻\u200C" })).toBe(
		"👩\u200D💻\u200C",
	);
	expect(execute(tool, { ...v, input: "a\u202Eb" })).toBe("a\u202Eb");
	expect(execute(tool, { ...v, input: "a\u202Eb", bidi: "Remove" })).toBe("ab");
});
test("reports preserved characters and converts mixed line endings", () => {
	const v = defaults(tool);
	expect(
		JSON.parse(execute(tool, { ...v, hidden: "Preserve" })).characters[0]
			.action,
	).toBe("preserved");
	expect(
		execute(tool, {
			...v,
			input: "a\rb\r\nc\nd",
			lines: "CRLF",
			format: "Cleaned text",
		}),
	).toBe("a\r\nb\r\nc\r\nd");
});
