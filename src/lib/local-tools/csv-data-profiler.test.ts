import { expect, test } from "vitest";
import { parseCsv, writeCsv } from "./csv";
import { tool } from "./csv-data-profiler";
import { defaults, execute } from "./types";

test("profiles blanks duplicates and numeric values", () => {
	const result = JSON.parse(execute(tool, defaults(tool)));
	expect(result.duplicateRows).toBe(1);
	expect(result.profile[2].blank).toBe(1);
	expect(result.profile[2].min).toBe(88);
	expect(
		JSON.parse(execute(tool, { input: "id\n001\n002", delimiter: "Comma" }))
			.profile[0].type,
	).toBe("text");
});
test("CSV supports quoted multiline fields and rejects malformed tables", () => {
	expect(parseCsv('a;b\n"x\ny";z', "Semicolon").rows[0][0]).toBe("x\ny");
	for (const input of ["a,a\n1,2", "a,b\n1", 'a\n"bad'])
		expect(() => parseCsv(input, "Comma")).toThrow();
	expect(writeCsv(["a"], [["=1+1"]])).toContain("'=1+1");
});
