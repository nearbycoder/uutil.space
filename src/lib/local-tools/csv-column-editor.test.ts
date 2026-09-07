import { expect, test } from "vitest";
import { tool } from "./csv-column-editor";
import { defaults, execute } from "./types";

test("selects reorders renames and removes CSV columns", () => {
	const v = defaults(tool);
	expect(execute(tool, v).split("\n")[0]).toBe("name,points");
	expect(execute(tool, { ...v, columns: "score\nname" }).split("\n")[0]).toBe(
		"points,name",
	);
	expect(
		execute(tool, { ...v, mode: "Remove", columns: "team" }),
	).not.toContain("Design");
});
test("rejects unknown columns and colliding renames; protects exports", () => {
	const v = defaults(tool);
	for (const columns of ["missing", "name\nname"])
		expect(() => execute(tool, { ...v, columns })).toThrow();
	expect(() => execute(tool, { ...v, rename: '{"score":"name"}' })).toThrow();
	expect(execute(tool, { ...v, input: "name,score\n=1+1,2" })).toContain(
		"'=1+1",
	);
});
