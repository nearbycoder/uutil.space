import { describe, expect, it } from "vitest";
import { tool } from "./http-request-inspector";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("HTTP request inspector", () => {
	it("masks credentials and counts body bytes", () => {
		const x = run();
		expect(x.method).toBe("POST");
		expect(x.body.utf8Bytes).toBe(15);
		expect(x.headers[2].value).toBe("[redacted]");
		expect(x.warnings).toEqual([]);
	});
	it("preserves duplicate queries and reports framing conflicts", () => {
		const x = run({
			input:
				"GET /?a=1&a=2 HTTP/1.1\nHost: example.com\nContent-Length: 1\nTransfer-Encoding: chunked\n\né",
		});
		expect(x.query).toHaveLength(2);
		expect(x.body.utf8Bytes).toBe(2);
		expect(x.warnings.join()).toContain("ambiguous");
	});
	it("supports authority, asterisk and absolute forms", () => {
		expect(
			run({ input: "CONNECT example.com:443 HTTP/1.1\nHost: example.com" })
				.targetForm,
		).toBe("authority");
		expect(run({ input: "OPTIONS * HTTP/1.0" }).targetForm).toBe("asterisk");
		expect(run({ input: "GET https://example.com/a HTTP/1.0" }).url).toBe(
			"https://example.com/a",
		);
		expect(
			run({ input: "GET //other.com/a HTTP/1.1\nHost: example.com" }).url,
		).toBe("https://example.com//other.com/a");
	});
	it("rejects malformed lines, headers and unsafe targets", () => {
		for (const input of [
			"GET / HTTP/2.0",
			"GET / HTTP/1.1\n Folded: value",
			"GET / HTTP/1.1\nBad Header: value",
			"GET /#frag HTTP/1.1",
			"GET https://user:pass@example.com HTTP/1.1",
			"CONNECT host:99999 HTTP/1.1",
		])
			expect(() => run({ input })).toThrow();
	});
	it("reveals only on request and detects body mismatches", () => {
		expect(run({ secrets: "Reveal", body: "Include body" }).body.text).toBe(
			'{"name":"Alex"}',
		);
		expect(
			run({
				input: "POST / HTTP/1.1\nHost: x.test\nContent-Length: 1\n\né",
			}).warnings.join(),
		).toContain("differs");
	});
});
