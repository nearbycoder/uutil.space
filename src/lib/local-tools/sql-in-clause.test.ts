import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { tool } from "./sql-in-clause";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("SQL IN Clause Builder", () => {
	it("uses ordered placeholders and explicit null matching", () => {
		const x = run();
		expect(x.parameters).toEqual(["Alex", "O'Reilly", "Sam"]);
		expect(x.sql).toContain("$3");
		expect(x.sql).toContain('OR "name" IS NULL');
	});
	it("handles empty lists, null-only lists and typed deduplication", () => {
		expect(run({ input: "[]" }).sql).toBe("1 = 0");
		expect(run({ input: "[]", clause: "NOT IN" }).sql).toBe("1 = 1");
		expect(run({ input: "[null]" }).sql).toBe('"name" IS NULL');
		expect(run({ input: '[1,1,"1"]' }).parameters).toEqual([1, "1"]);
	});
	it("round-trips SQLite predicates and parameters", () => {
		const db = new DatabaseSync(":memory:");
		try {
			db.exec(
				"CREATE TABLE t(name TEXT); INSERT INTO t VALUES ('Alex'), ('Other'), (NULL)",
			);
			const x = run({ dialect: "SQLite", input: '["Alex",null]' });
			expect(
				db
					.prepare(`SELECT count(*) AS n FROM t WHERE ${x.sql}`)
					.get(...x.parameters),
			).toEqual({ n: 2 });
			const y = run({
				dialect: "SQLite",
				input: '["Alex",null]',
				clause: "NOT IN",
			});
			expect(
				db
					.prepare(`SELECT count(*) AS n FROM t WHERE ${y.sql}`)
					.get(...y.parameters),
			).toEqual({ n: 1 });
		} finally {
			db.close();
		}
	});
	it("quotes literal values in each dialect", () => {
		expect(run({ output: "Literals" }).sql).toContain("E'O''Reilly'");
		expect(
			run({ output: "Literals", dialect: "MySQL", input: '["é"]' }).sql,
		).toContain("c3a9");
	});
	it("rejects structured values, controls and unsafe numbers", () => {
		expect(() => run({ input: "[{}]" })).toThrow();
		expect(() => run({ column: "a\nb" })).toThrow();
		expect(() =>
			run({ format: "Lines", lineType: "Number", input: "0x10" }),
		).toThrow();
		expect(() => run({ input: " " })).toThrow();
	});
});
