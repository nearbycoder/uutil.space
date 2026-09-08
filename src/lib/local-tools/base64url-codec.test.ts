import { describe, expect, it } from "vitest";
import { tool } from "./base64url-codec";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("Base64URL", () => {
	it("encodes known text and optional padding", () => {
		expect(run().result).toBe("SGVsbG8sIGRldmVsb3BlciE");
		expect(run({ padding: "Include" }).result).toBe("SGVsbG8sIGRldmVsb3BlciE=");
	});
	it("round trips Unicode and a leading BOM", () => {
		for (const input of ["café 💡", "\ufeffdata"]) {
			const encoded = run({ input }).result;
			expect(run({ input: encoded, mode: "Decode" }).result).toBe(input);
		}
	});
	it("round trips arbitrary bytes with the URL-safe alphabet", () => {
		const x = run({ input: "fb ff 00", format: "Hex bytes" });
		expect(x.result).toBe("-_8A");
		expect(
			run({ input: x.result, format: "Hex bytes", mode: "Decode" }).result,
		).toBe("fbff00");
	});
	it("rejects invalid alphabets, padding, unused bits and UTF-8", () => {
		for (const input of ["Z", "Zh", "Zg=", "Zg===", "Z g", "+/8=", "_w"])
			expect(() => run({ input, mode: "Decode" })).toThrow();
	});
	it("accepts padded input and rejects incomplete hex and surrogates", () => {
		expect(run({ input: "Zg==", mode: "Decode" }).result).toBe("f");
		expect(() => run({ input: "f", format: "Hex bytes" })).toThrow();
		expect(() => run({ input: "\ud800" })).toThrow();
	});
});
