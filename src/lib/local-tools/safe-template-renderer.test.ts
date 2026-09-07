import { expect, test } from "vitest";
import { tool } from "./safe-template-renderer";
import { defaults, execute } from "./types";

test("renders nested paths and falsey values without evaluating code", () => {
	const v = defaults(tool);
	expect(execute(tool, v)).toContain("DEMO-42");
	expect(
		execute(tool, {
			...v,
			template: "{{a.0}} {{b}} {{c}}",
			data: '{"a":[0],"b":false,"c":null}',
		}),
	).toBe("0 false null");
	for (const template of ["{{constructor.name}}", "{{user.name()}}"])
		expect(() => execute(tool, { ...v, template })).toThrow();
});
test("supports escaping missing-value policy and expansion limits", () => {
	const v = { ...defaults(tool), template: "{{x}}", data: '{"x":"<script>"}' };
	expect(execute(tool, { ...v, escape: "HTML text" })).toBe("&lt;script&gt;");
	expect(execute(tool, { ...v, data: "{}", missing: "Keep placeholder" })).toBe(
		"{{x}}",
	);
	expect(() => execute(tool, { ...v, data: "{}" })).toThrow("Missing variable");
	expect(() =>
		execute(tool, {
			...v,
			template: "{{x}}".repeat(100),
			data: JSON.stringify({ x: "a".repeat(30000) }),
		}),
	).toThrow("2 MB");
});
