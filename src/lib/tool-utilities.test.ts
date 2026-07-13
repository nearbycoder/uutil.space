import { describe, expect, it } from "vitest";
import {
	analyzePassword,
	analyzeReadability,
	analyzeSecurityHeaders,
	calculateChmod,
	calculateDateDifference,
	calculateIpv4Cidr,
	canonicalizeUrl,
	compareSemVer,
	convertDataSize,
	createSlug,
	decodeBase32,
	encodeBase32,
	envToJson,
	exploreJsonPath,
	generateHmac,
	inspectMacAddress,
	inspectUnicode,
	jsonLinesToJson,
	jsonToEnv,
	jsonToJsonLines,
	jsonToQueryString,
	lookupMimeTypes,
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

describe("Base32 codec", () => {
	it("encodes and decodes RFC 4648 text values", () => {
		expect(encodeBase32("hello world")).toBe("NBSWY3DPEB3W64TMMQ======");
		expect(decodeBase32("NBSWY3DPEB3W64TMMQ======")).toBe("hello world");
		expect(decodeBase32(encodeBase32("Ship it 🚀"))).toBe("Ship it 🚀");
	});

	it("rejects characters outside the Base32 alphabet", () => {
		expect(() => decodeBase32("NOT_VALID!*")).toThrow("unsupported");
	});
});

describe("semantic version comparison", () => {
	it("implements release and prerelease precedence", () => {
		expect(compareSemVer("2.0.0", "1.9.9").relation).toBe("newer");
		expect(compareSemVer("1.0.0-beta.2", "1.0.0-beta.11").relation).toBe(
			"older",
		);
		expect(compareSemVer("1.0.0", "1.0.0+build.7").relation).toBe("equal");
	});

	it("rejects incomplete versions", () => {
		expect(() => compareSemVer("1.2", "1.2.0")).toThrow(
			"valid semantic version",
		);
	});
});

describe("environment conversion", () => {
	it("parses comments, exports, quoted values, and embedded equals signs", () => {
		expect(
			envToJson(
				'API_URL="https://example.com?a=1"\nexport MODE=prod # comment',
			),
		).toEqual({
			API_URL: "https://example.com?a=1",
			MODE: "prod",
		});
	});

	it("serializes JSON values without evaluating substitutions", () => {
		const output = jsonToEnv('{"PORT":3000,"FEATURES":["search","audit"]}');
		expect(output).toContain('PORT="3000"');
		expect(output).toContain('FEATURES="[\\"search\\",\\"audit\\"]"');
	});
});

describe("JSON Lines conversion", () => {
	it("parses non-empty lines and serializes arrays", () => {
		expect(jsonLinesToJson('{"id":1}\n\n{"id":2}')).toEqual([
			{ id: 1 },
			{ id: 2 },
		]);
		expect(jsonToJsonLines('[{"id":1},{"id":2}]')).toBe('{"id":1}\n{"id":2}');
	});

	it("identifies the malformed line", () => {
		expect(() => jsonLinesToJson('{"ok":true}\nnope')).toThrow("Line 2");
	});
});

describe("chmod calculator", () => {
	it("converts octal and symbolic permissions in both directions", () => {
		expect(calculateChmod("754")).toMatchObject({
			octal: "754",
			symbolic: "rwxr-xr--",
		});
		expect(calculateChmod("rw-r-----").octal).toBe("640");
	});

	it("rejects special-bit and malformed values it cannot represent", () => {
		expect(() => calculateChmod("1755")).toThrow("three-digit");
	});
});

describe("URL canonicalization", () => {
	it("sorts parameters and removes tracking, fragments, and trailing slashes", () => {
		expect(
			canonicalizeUrl(
				"HTTPS://Example.COM:443/docs/?utm_source=x&b=2&a=1#intro",
			),
		).toBe("https://example.com/docs?a=1&b=2");
	});

	it("rejects executable protocols and embedded credentials", () => {
		expect(() => canonicalizeUrl("javascript:alert(1)")).toThrow("HTTP");
		expect(() => canonicalizeUrl("https://user:secret@example.com")).toThrow(
			"credentials",
		);
	});
});

describe("MAC address inspection", () => {
	it("normalizes common formats and reads address flags", () => {
		expect(inspectMacAddress("02-42-ac-11-00-02")).toEqual({
			normalized: "02:42:AC:11:00:02",
			compact: "0242AC110002",
			isUnicast: true,
			isMulticast: false,
			isLocallyAdministered: true,
			isUniversallyAdministered: false,
		});
		expect(inspectMacAddress("01:00:5e:00:00:fb").isMulticast).toBe(true);
	});
});

describe("MIME type lookup", () => {
	it("searches by extension and media type", () => {
		expect(lookupMimeTypes(".svg")[0]?.mime).toBe("image/svg+xml");
		expect(lookupMimeTypes("json").map((entry) => entry.mime)).toContain(
			"application/json",
		);
	});
});

describe("readability analysis", () => {
	it("returns stable document metrics and reading estimates", () => {
		const analysis = analyzeReadability(
			"The cat sat on the mat. It watched the rain.",
		);
		expect(analysis).toMatchObject({
			words: 10,
			sentences: 2,
			paragraphs: 1,
			label: "Easy",
		});
		expect(analysis.readingEase).toBeGreaterThan(70);
	});

	it("handles empty input without invalid numbers", () => {
		expect(analyzeReadability("")).toMatchObject({
			words: 0,
			sentences: 0,
			gradeLevel: 0,
		});
	});
});

describe("security header analysis", () => {
	it("scores baseline response protections and reports weak CSP values", () => {
		const analysis = analyzeSecurityHeaders(
			"Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'\nStrict-Transport-Security: max-age=31536000\nX-Content-Type-Options: nosniff",
		);
		expect(analysis.score).toBe(50);
		expect(analysis.present).toContain("Content-Security-Policy");
		expect(analysis.missing).toContain("Permissions-Policy");
		expect(analysis.findings.join(" ")).toContain("unsafe-eval");
	});

	it("recognizes a complete baseline", () => {
		const analysis = analyzeSecurityHeaders(
			"Content-Security-Policy: default-src 'self'\nStrict-Transport-Security: max-age=31536000\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=()\nX-Frame-Options: DENY",
		);
		expect(analysis.score).toBe(100);
		expect(analysis.findings).toEqual([
			"All baseline security headers are present.",
		]);
	});
});
