import { DatabaseSync } from "node:sqlite";
import { expect, test } from "vitest";
import { sqlString, tool } from "./json-sql-insert";
import { defaults, execute } from "./types";

test("SQLite output round-trips quotes, backslashes and missing values", () => {
	const db = new DatabaseSync(":memory:");
	try {
		db.exec("CREATE TABLE users (id INTEGER, name TEXT, active INTEGER)");
		const sql = execute(tool, {
			...defaults(tool),
			dialect: "SQLite",
			input: JSON.stringify([
				{ id: 1, name: "O'Reilly\\path", active: true },
				{ id: 2, name: "Sam" },
			]),
			batch: "1",
		});
		db.exec(sql);
		expect(db.prepare("SELECT * FROM users ORDER BY id").all()).toEqual([
			{ id: 1, name: "O'Reilly\\path", active: 1 },
			{ id: 2, name: "Sam", active: null },
		]);
	} finally {
		db.close();
	}
});
test("quotes dialect literals and rejects invalid records", () => {
	expect(sqlString("a'b\\c", "PostgreSQL")).toBe("E'a''b\\\\c'");
	expect(sqlString("é", "MySQL")).toBe("CONVERT(X'c3a9' USING utf8mb4)");
	const v = defaults(tool);
	for (const input of ["[]", "[1]", '[{"a":{"b":1}}]'])
		expect(() => execute(tool, { ...v, input })).toThrow();
	expect(() => sqlString("\u0000", "SQLite")).toThrow();
	expect(
		execute(tool, { ...v, input: '[{"a":{"b":1}}]', nested: "JSON strings" }),
	).toContain('{"b":1}');
});
