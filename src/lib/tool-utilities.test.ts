import { describe, expect, it } from "vitest";
import {
	analyzePassword,
	calculateDateDifference,
	calculateIpv4Cidr,
	convertDataSize,
	createSlug,
	exploreJsonPath,
	generateHmac,
	inspectUnicode,
	jsonToQueryString,
	queryStringToJson,
	searchHttpStatuses,
} from "./tool-utilities";

describe("JSON path explorer", () => {
	it("supports root, dot, array, and quoted-key access", () => {
		const input = '{"users":[{"name":"Ada"}],"build.version":"1.2.3"}';
		expect(exploreJsonPath(input, "$.users[0].name")).toBe("Ada");
		expect(exploreJsonPath(input, '$["build.version"]')).toBe("1.2.3");
		expect(exploreJsonPath(input, "$")).toEqual({
			users: [{ name: "Ada" }],
			"build.version": "1.2.3",
		});
	});

	it("reports invalid and missing segments", () => {
		expect(() => exploreJsonPath('{"ok":true}', "$.missing")).toThrow(
			"does not exist",
		);
		expect(() => exploreJsonPath("{}", "$[")).toThrow("unclosed bracket");
	});
});

describe("query string conversion", () => {
	it("preserves repeated parameters while parsing", () => {
		expect(queryStringToJson("?tag=one&tag=two&ready=true")).toEqual({
			tag: ["one", "two"],
			ready: "true",
		});
	});

	it("serializes arrays, primitives, and nested objects", () => {
		const query = jsonToQueryString(
			'{"tag":["one","two"],"page":2,"filter":{"active":true}}',
		);
		expect(query).toContain("tag=one&tag=two");
		expect(query).toContain("page=2");
		expect(new URLSearchParams(query).get("filter")).toBe('{"active":true}');
	});
});

describe("IPv4 CIDR calculator", () => {
	it("calculates network boundaries and masks", () => {
		expect(calculateIpv4Cidr("192.168.10.42/24")).toEqual({
			address: "192.168.10.42",
			prefix: 24,
			network: "192.168.10.0",
			broadcast: "192.168.10.255",
			netmask: "255.255.255.0",
			wildcardMask: "0.0.0.255",
			firstUsable: "192.168.10.1",
			lastUsable: "192.168.10.254",
			totalAddresses: 256,
			usableAddresses: 254,
		});
	});

	it("handles point-to-point networks and validation", () => {
		expect(calculateIpv4Cidr("10.0.0.4/31").usableAddresses).toBe(2);
		expect(() => calculateIpv4Cidr("10.0.0.999/24")).toThrow("0 to 255");
	});
});

describe("password analysis", () => {
	it("flags common passwords and rewards long mixed phrases", () => {
		expect(analyzePassword("password").score).toBe(0);
		const strong = analyzePassword("Correct-Horse-42-Battery!");
		expect(strong.score).toBe(4);
		expect(strong.characterSets).toEqual(
			expect.arrayContaining(["lowercase", "uppercase", "numbers", "symbols"]),
		);
	});
});

describe("slug generation", () => {
	it("normalizes accents, ampersands, and separators", () => {
		expect(createSlug("Crème & API Launch")).toBe("creme-and-api-launch");
		expect(createSlug("Hello, World!", "_")).toBe("hello_world");
	});
});

describe("Unicode inspection", () => {
	it("reports code points and encodings without splitting surrogate pairs", () => {
		const result = inspectUnicode("A😀");
		expect(result).toHaveLength(2);
		expect(result[1]).toMatchObject({
			position: 1,
			codePoint: "U+1F600",
			utf8: "F0 9F 98 80",
			utf16: "D83D DE00",
		});
	});
});

describe("data size conversion", () => {
	it("converts between decimal and binary units", () => {
		const result = convertDataSize(1, "MiB");
		expect(result.bytes).toBe(1_048_576);
		expect(result.values.KiB).toBe(1024);
		expect(result.values.MB).toBe(1.048576);
	});

	it("rejects negative values", () => {
		expect(() => convertDataSize(-1, "B")).toThrow("non-negative");
	});
});

describe("date difference calculator", () => {
	it("returns totals and a readable duration", () => {
		const result = calculateDateDifference(
			"2026-01-01T00:00:00Z",
			"2026-01-03T02:30:15Z",
		);
		expect(result.direction).toBe("after");
		expect(result.duration).toEqual({
			days: 2,
			hours: 2,
			minutes: 30,
			seconds: 15,
		});
		expect(result.human).toBe("2d 2h 30m 15s");
	});
});

describe("HTTP status lookup", () => {
	it("searches by code, name, and category", () => {
		expect(searchHttpStatuses("418")[0]?.name).toBe("I'm a Teapot");
		expect(searchHttpStatuses("gateway").map((status) => status.code)).toEqual([
			502, 504,
		]);
		expect(searchHttpStatuses("informational").length).toBeGreaterThan(0);
	});
});

describe("HMAC generation", () => {
	it("emits standard SHA-256 digests in hex and base64", () => {
		const result = generateHmac(
			"The quick brown fox jumps over the lazy dog",
			"key",
			"SHA256",
		);
		expect(result.hex).toBe(
			"f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
		);
		expect(result.base64).toBe("97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=");
	});

	it("requires a secret key", () => {
		expect(() => generateHmac("message", "", "SHA1")).toThrow("required");
	});
});
