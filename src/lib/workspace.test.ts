import { describe, expect, it } from "vitest";
import {
	decodeRecipe,
	detectTools,
	emptyWorkspace,
	encodeRecipe,
	parseWorkspace,
	pruneHistory,
	readFields,
	transformFile,
} from "./workspace";

describe("private workspace", () => {
	it("starts with history disabled and ignores corrupt storage", () => {
		expect(parseWorkspace(null).historyEnabled).toBe(false);
		expect(parseWorkspace("invalid")).toEqual(emptyWorkspace());
		expect(parseWorkspace("null")).toEqual(emptyWorkspace());
		expect(
			parseWorkspace('{"favorites":["json","json",2],"scratchpads":[null]}')
				.favorites,
		).toEqual(["json"]);
	});
	it("prunes expired history and clears history when disabled", () => {
		const state = {
			...emptyWorkspace(),
			historyEnabled: true,
			retention: 1,
			history: [
				{ id: "1", name: "old", toolId: "json", fields: [], created: 0 },
				{
					id: "2",
					name: "new",
					toolId: "json",
					fields: [],
					created: 90_000_000,
				},
			],
		};
		expect(pruneHistory(state, 90_000_001).history.map((h) => h.id)).toEqual([
			"2",
		]);
		expect(pruneHistory({ ...state, historyEnabled: false }).history).toEqual(
			[],
		);
	});
	it("shares settings only unless input is explicitly included", () => {
		const fields = [
			{ label: "JSON", kind: "input", value: "secret" },
			{ label: "Indent", kind: "setting", value: "2" },
		] as const;
		const safe = decodeRecipe(encodeRecipe("json", [...fields]), ["json"]);
		expect(safe?.fields).toHaveLength(1);
		expect(JSON.stringify(safe)).not.toContain("secret");
		expect(
			decodeRecipe(encodeRecipe("json", [...fields], true), ["json"])?.fields,
		).toHaveLength(2);
		expect(() => decodeRecipe(encodeRecipe("unknown", []), ["json"])).toThrow();
		expect(() =>
			readFields([{ kind: "input", label: "x", value: {} }]),
		).toThrow();
	});
	it("detects formats without executing input", () => {
		expect(detectTools('{"a":1}')[0].id).toBe("json-format-validate");
		expect(detectTools("https://example.com")[0].id).toBe("url-parser");
		expect(detectTools("eyJhbGciOiJub25lIn0.eyJhIjoxfQ.")[0].id).toBe(
			"jwt-debugger",
		);
		expect(detectTools("1700000000000")[0].id).toBe("unix-time-converter");
		expect(detectTools("-----BEGIN CERTIFICATE-----\nabc")[0].id).toBe(
			"certificate-decoder",
		);
		expect(detectTools("hello%20world")[0].id).toBe("url-encode-decode");
		expect(detectTools("aGVsbG8=")[0].id).toBe("base64-string");
	});
	it("processes file formats and preserves Unicode", async () => {
		expect(await transformFile('{"a":1}', "JSON format")).toContain('\n  "a"');
		expect(await transformFile(' { "a": 1 } ', "JSON minify")).toBe('{"a":1}');
		expect(await transformFile("a: 1", "YAML to JSON")).toContain('"a": 1');
		expect(await transformFile('{"a":1}', "JSON to YAML")).toBe("a: 1\n");
		expect(await transformFile('[{"a":1}]', "JSON to CSV")).toContain("a\r\n1");
		expect(JSON.parse(await transformFile("a\n1", "CSV to JSON"))).toEqual([
			{ a: "1" },
		]);
		const encoded = await transformFile("Hello 🌍", "Base64 encode");
		expect(await transformFile(encoded, "Base64 decode")).toBe("Hello 🌍");
		expect(
			await transformFile(
				await transformFile("a b&c", "URL encode"),
				"URL decode",
			),
		).toBe("a b&c");
		await expect(transformFile("invalid", "JSON format")).rejects.toThrow();
		await expect(
			transformFile("x".repeat(1_000_001), "JSON format"),
		).rejects.toThrow("limit");
	});
});
