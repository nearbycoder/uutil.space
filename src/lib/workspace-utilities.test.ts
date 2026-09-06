import { describe, expect, it } from "vitest";
import {
	buildCron,
	checkContrast,
	generateMockData,
	locateJsonPointer,
	redactText,
	validateJsonSchema,
} from "./workspace-utilities";

describe("new workspace utilities", () => {
	it("locates exact nested values, arrays and escaped property names", () => {
		const input = '{"age":1,"user":{"age":17},"a/b":[true,"hello"]}';
		const [start, end] = locateJsonPointer(input, "/user/age");
		expect(input.slice(start, end)).toBe("17");
		const [a, b] = locateJsonPointer(input, "/a~1b/1");
		expect(input.slice(a, b)).toBe('"hello"');
	});
	it("validates nested schemas and locates failing fields", () => {
		const result = validateJsonSchema(
			'{"user":{"age":"young"}}',
			'{"type":"object","properties":{"user":{"type":"object","properties":{"age":{"type":"integer"}}}}}',
		);
		expect(result.valid).toBe(false);
		expect(result.errors[0].path).toBe("/user/age");
		expect(
			validateJsonSchema('{"id":2}', '{"type":"object","required":["id"]}')
				.valid,
		).toBe(true);
	});
	it("handles references, required fields, false schemas, and unsupported drafts", () => {
		expect(
			validateJsonSchema(
				'"no"',
				'{"definitions":{"number":{"type":"number"}},"$ref":"#/definitions/number"}',
			).valid,
		).toBe(false);
		expect(validateJsonSchema("{}", '{"required":["name"]}').valid).toBe(false);
		expect(validateJsonSchema("1", "false").valid).toBe(false);
		expect(() =>
			validateJsonSchema(
				"{}",
				'{"$schema":"https://json-schema.org/draft/2020-12/schema"}',
			),
		).toThrow("supported draft");
	});
	it("redacts selected identifiers and leaves disabled categories alone", () => {
		const result = redactText(
			'Email alex@example.com, IP 192.168.1.1, Bearer abc123, password="secret123"',
			{ emails: true, tokens: true, ips: false, phones: false },
		);
		expect(result.text).not.toContain("alex@example.com");
		expect(result.text).not.toContain("secret123");
		expect(result.text).not.toContain("abc123");
		expect(result.text).toContain("192.168.1.1");
		expect(result.count).toBe(3);
	});
	it("generates repeatable fixtures with correlated names and safe example emails", () => {
		const fields = [
			{ name: "id", type: "id" },
			{ name: "email", type: "email" },
		] as const;
		const data = generateMockData(3, 42, [...fields]);
		expect(data).toEqual(generateMockData(3, 42, [...fields]));
		expect(data[2].id).toBe(3);
		expect(data[0].email).toMatch(/@example.com$/);
		expect(() => generateMockData(1001, 1, [...fields])).toThrow();
		expect(() => generateMockData(1, 1, [fields[0], fields[0]])).toThrow(
			"unique",
		);
	});
	it("calculates WCAG ratios and proposes passing alternatives", () => {
		expect(checkContrast("#000", "#fff").ratio).toBe(21);
		const result = checkContrast("#aaa", "#fff");
		expect(result.aa).toBe(false);
		expect(
			result.alternatives.every((color) => checkContrast(color, "#fff").aa),
		).toBe(true);
		expect(() => checkContrast("rgba(0,0,0,.5)", "white")).toThrow("opaque");
	});
	it("builds all schedule types and rejects invalid bounds", () => {
		expect(buildCron("minutes", 0, 9, 1, 15)).toBe("*/15 * * * *");
		expect(buildCron("hourly", 10, 9, 1, 15)).toBe("10 * * * *");
		expect(buildCron("daily", 30, 9, 1, 15)).toBe("30 9 * * *");
		expect(buildCron("weekly", 30, 9, 1, 15)).toBe("30 9 * * 1");
		expect(buildCron("monthly", 30, 9, 1, 15)).toBe("30 9 1 * *");
		expect(() => buildCron("weekly", 30, 9, 7, 15)).toThrow();
	});
});
