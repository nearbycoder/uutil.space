import { expect, test } from "vitest";
import { tool } from "./set-cookie-inspector";
import { defaults, execute } from "./types";

test("masks values and explains security attribute combinations", () => {
	const result = JSON.parse(execute(tool, defaults(tool)));
	expect(result.cookies[0].notes).toEqual([]);
	expect(result.cookies[0].value).toBe("[hidden]");
	expect(result.cookies[1].notes).toContain("SameSite=None requires Secure.");
	expect(execute(tool, { ...defaults(tool), values: "Reveal" })).toContain(
		"demo-token",
	);
});
test("preserves Expires commas, reports duplicate attributes and parses each row independently", () => {
	const result = JSON.parse(
		execute(tool, {
			...defaults(tool),
			input:
				"a=x=y; Expires=Wed, 09 Jun 2027 10:18:14 GMT; Path=/; Path=/app\nbad header\n__Host-a=x; Domain=example.com; Partitioned; Max-Age=0",
		}),
	);
	expect(result.count).toBe(3);
	expect(result.cookies[0].attributes.path).toBe("/app");
	expect(result.cookies[0].attributes.expires).toContain("Wed,");
	expect(result.cookies[1].error).toBeTruthy();
	expect(result.cookies[2].notes.join(" ")).toContain("immediate expiry");
	expect(result.cookies[2].notes.join(" ")).toContain("__Host-");
});
