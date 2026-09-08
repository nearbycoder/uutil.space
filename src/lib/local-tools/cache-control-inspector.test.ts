import { describe, expect, it } from "vitest";
import { tool } from "./cache-control-inspector";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("Cache-Control", () => {
	it("computes private and shared budgets", () => {
		expect(run().freshness).toMatchObject({
			privateSeconds: 60,
			sharedSeconds: 300,
			privateRemainingSeconds: 40,
			sharedRemainingSeconds: 280,
		});
		expect(run().warnings).toEqual([]);
	});
	it("preserves quoted commas and extension escapes", () => {
		const x = run({
			input: 'Cache-Control: private="Set-Cookie, X-Secret", custom="a,\\"b"',
		});
		expect(x.directives[0].value).toBe("Set-Cookie, X-Secret");
		expect(x.directives[1].value).toBe('a,"b');
		expect(x.warnings).toEqual([]);
	});
	it("does not infer freshness for invalid or duplicate seconds", () => {
		for (const input of [
			"max-age=1,max-age=2",
			"max-age=-1",
			"max-age=abc",
			"max-age=9007199254740992",
		])
			expect(run({ input }).freshness.privateSeconds).toBeNull();
	});
	it("flags contexts, conflicts and request-only options", () => {
		expect(
			run({ input: "public,private,no-store,max-age=1" }).warnings,
		).toHaveLength(2);
		expect(
			run({ input: "max-stale, min-fresh=20", context: "Request" }).warnings,
		).toEqual([]);
		expect(
			run({ input: "s-maxage=2", context: "Request" }).warnings.join(),
		).toContain("response directive");
	});
	it("rejects malformed syntax and clamps expired budgets to zero", () => {
		for (const input of [
			"public,,private",
			'x="unterminated',
			"bad name=1",
			"public\nno-store",
		])
			expect(() => run({ input })).toThrow();
		expect(run({ age: "600" }).freshness.sharedRemainingSeconds).toBe(0);
	});
});
