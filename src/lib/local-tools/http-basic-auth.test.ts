import { describe, expect, it } from "vitest";
import { tool } from "./http-basic-auth";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("Basic auth", () => {
	it("encodes known credentials and masks decoded passwords", () => {
		expect(run().header).toBe("Basic YWxleDpkZW1v");
		expect(run({ mode: "Decode", input: run().header }).password).toBe(
			"[redacted]",
		);
	});
	it("round trips UTF-8, Latin-1, empty fields and password colons", () => {
		for (const charset of ["UTF-8", "Latin-1"])
			for (const [username, password] of [
				["café", "på:ss"],
				["", ""],
			]) {
				const header = run({
					charset,
					input: JSON.stringify({ username, password }),
				}).header;
				expect(
					run({ charset, mode: "Decode", input: header, password: "Reveal" }),
				).toMatchObject({ username, password });
			}
	});
	it("rejects invalid credentials, unsupported characters and encodings", () => {
		const cases: Record<string, string>[] = [
			{ input: '{"username":"a:b","password":"x"}' },
			{ input: '{"username":"a","password":"\\n"}' },
			{ input: '{"username":"💡","password":"x"}', charset: "Latin-1" },
			{ mode: "Decode", input: "Bearer abc" },
			{ mode: "Decode", input: "Basic YTpiYw" },
			{ mode: "Decode", input: "Basic YTp=" },
			{ mode: "Decode", input: "Basic /zo=" },
		];
		for (const v of cases) expect(() => run(v)).toThrow();
	});
	it("supports case-insensitive auth schemes and explicit reveal", () => {
		expect(
			run({ mode: "Decode", input: "basic YTpiOmM=", password: "Reveal" })
				.password,
		).toBe("b:c");
	});
});
