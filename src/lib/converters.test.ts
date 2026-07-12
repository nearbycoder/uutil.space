import { describe, expect, it } from "vitest";
import {
	decodeHexToAscii,
	encodeAsciiToHex,
	formatBigIntToBase,
	parseBaseToBigInt,
	parseCurlCommand,
	parseTimestampInput,
	renderCurlAsCode,
	runRegex,
	toCamelCase,
	toKebabCase,
	toPascalCase,
	toSnakeCase,
	toTitleCase,
	unescapeBackslashes,
} from "./converters";

describe("timestamp conversion", () => {
	it("accepts Unix seconds and milliseconds", () => {
		expect(parseTimestampInput("1700000000").toISOString()).toBe(
			"2023-11-14T22:13:20.000Z",
		);
		expect(parseTimestampInput("1700000000000").toISOString()).toBe(
			"2023-11-14T22:13:20.000Z",
		);
	});

	it("accepts date strings and rejects empty input", () => {
		expect(parseTimestampInput("2026-02-24T18:25:00Z").getUTCFullYear()).toBe(
			2026,
		);
		expect(() => parseTimestampInput("  ")).toThrow("Enter a Unix timestamp");
	});
});

describe("backslash unescaping", () => {
	it("decodes common, hex, and Unicode escapes", () => {
		expect(unescapeBackslashes("one\\ntwo\\t\\x41\\u263A")).toBe(
			"one\ntwo\tA☺",
		);
		expect(unescapeBackslashes("\\u{1F600}")).toBe("😀");
	});

	it("preserves unknown escape sequences", () => {
		expect(unescapeBackslashes("C:\\work\\q")).toBe("C:\\work\\q");
	});
});

describe("regular expressions", () => {
	it("collects every match even without a global flag", () => {
		const result = runRegex("cat", "i", "Cat cat", "dog");
		expect(result.matches.map((match) => match.match)).toEqual(["Cat", "cat"]);
		expect(result.replacement).toBe("dog cat");
	});

	it("honors global replacement when requested", () => {
		expect(runRegex("cat", "gi", "Cat cat", "dog").replacement).toBe("dog dog");
	});
});

describe("number bases", () => {
	it("round-trips positive and negative values", () => {
		expect(parseBaseToBigInt("-FF", 16)).toBe(-255n);
		expect(formatBigIntToBase(-255n, 2)).toBe("-11111111");
	});

	it("rejects missing and invalid digits", () => {
		expect(() => parseBaseToBigInt("-", 10)).toThrow("at least one digit");
		expect(() => parseBaseToBigInt("102", 2)).toThrow("Invalid digit '2'");
		expect(() => parseBaseToBigInt("10", 1)).toThrow("2 to 36");
	});
});

describe("cURL conversion", () => {
	it("parses quoted URLs, compact flags, headers, and request bodies", () => {
		expect(
			parseCurlCommand(
				`curl -XPOST 'https://example.com/api' -H'Content-Type: application/json' --data-raw='{"ok":true}'`,
			),
		).toEqual({
			url: "https://example.com/api",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			data: '{"ok":true}',
		});
	});

	it("infers POST when data is present", () => {
		expect(parseCurlCommand("curl https://example.com -d value").method).toBe(
			"POST",
		);
	});

	it("emits valid no-body templates for every language", () => {
		const parsed = parseCurlCommand("curl 'https://example.com/api'");
		for (const target of [
			"node-fetch",
			"javascript",
			"python",
			"go",
			"php",
		] as const) {
			const output = renderCurlAsCode(parsed, target);
			expect(output).toContain("https://example.com/api");
			expect(output).not.toContain("undefined");
		}
	});

	it("rejects malformed commands", () => {
		expect(() => parseCurlCommand("wget https://example.com")).toThrow(
			"start with 'curl'",
		);
		expect(() => parseCurlCommand("curl --compressed")).toThrow("target URL");
	});
});

describe("UTF-8 hexadecimal conversion", () => {
	it("round-trips ASCII and multibyte text", () => {
		expect(decodeHexToAscii("48 65 6c 6c 6f")).toBe("Hello");
		const emojiHex = encodeAsciiToHex("Hi 😀");
		expect(emojiHex).toBe("48 69 20 f0 9f 98 80");
		expect(decodeHexToAscii(emojiHex)).toBe("Hi 😀");
	});

	it("rejects invalid or incomplete bytes", () => {
		expect(() => decodeHexToAscii("zz")).toThrow("digits 0-9");
		expect(() => decodeHexToAscii("f")).toThrow("complete two-digit bytes");
		expect(() => decodeHexToAscii("ff")).toThrow("valid UTF-8");
	});
});

describe("case conversion", () => {
	it("handles mixed separators and acronym boundaries", () => {
		const input = "XMLHttp request_value";
		expect(toCamelCase(input)).toBe("xmlHttpRequestValue");
		expect(toPascalCase(input)).toBe("XmlHttpRequestValue");
		expect(toSnakeCase(input)).toBe("xml_http_request_value");
		expect(toKebabCase(input)).toBe("xml-http-request-value");
		expect(toTitleCase(input)).toBe("Xml Http Request Value");
	});
});
