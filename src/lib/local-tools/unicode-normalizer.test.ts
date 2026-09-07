import { expect, test } from "vitest";
import { defaults, execute } from "./types";
import { tool } from "./unicode-normalizer";

test("supports canonical and compatibility normalization", () => {
	const v = { ...defaults(tool), format: "Normalized text" };
	expect(execute(tool, { ...v, input: "Cafe\u0301" })).toBe("Café");
	expect(execute(tool, { ...v, input: "é", form: "NFD" })).toBe("e\u0301");
	expect(execute(tool, { ...v, input: "ﬁ①", form: "NFKC" })).toBe("fi1");
	expect(execute(tool, { ...v, input: "éﬁ", form: "NFKD" })).toBe("e\u0301fi");
});
test("reports code point versus UTF-16 sizes and caps detailed previews", () => {
	const v = defaults(tool),
		result = JSON.parse(execute(tool, { ...v, input: "😀".repeat(300) }));
	expect(result.before.codePoints).toBe(300);
	expect(result.before.utf16Units).toBe(600);
	expect(result.before.preview).toHaveLength(256);
	expect(result.before.omittedCodePoints).toBe(44);
	expect(() => execute(tool, { ...v, form: "invalid" })).toThrow();
});
