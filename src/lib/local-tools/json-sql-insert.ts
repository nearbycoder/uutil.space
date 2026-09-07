import { integer, json, type LocalTool, object } from "./types";
export function sqlString(text: string, dialect: string): string {
	if (
		text.includes("\u0000") ||
		[...text].some((c) => {
			const p = c.codePointAt(0) ?? 0;
			return p >= 0xd800 && p <= 0xdfff;
		})
	)
		throw new Error(
			"SQL strings cannot contain NUL or unpaired Unicode surrogates.",
		);
	if (dialect === "MySQL")
		return `CONVERT(X'${[...new TextEncoder().encode(text)].map((n) => n.toString(16).padStart(2, "0")).join("")}' USING utf8mb4)`;
	return `${dialect === "PostgreSQL" ? "E" : ""}'${(dialect === "PostgreSQL" ? text.replace(/\\/g, "\\\\") : text).replace(/'/g, "''")}'`;
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON records",
			value:
				'[{"id":1,"name":"Alex","active":true},{"id":2,"name":"Sam","active":false}]',
		},
		{
			key: "table",
			label: "Table name (optionally schema.table)",
			type: "text",
			value: "users",
		},
		{
			key: "dialect",
			label: "SQL dialect",
			type: "select",
			value: "PostgreSQL",
			options: ["PostgreSQL", "SQLite", "MySQL"],
		},
		{ key: "batch", label: "Rows per INSERT", type: "text", value: "100" },
		{
			key: "nested",
			label: "Nested objects and arrays",
			type: "select",
			value: "Reject",
			options: ["Reject", "JSON strings"],
		},
	],
	filename: "insert-records.sql",
	smoke: 'INSERT INTO "users"',
	help: "Generate, never execute, INSERT statements for an existing table. Missing properties become NULL. Limits: 500 records, 100 columns and 63 UTF-8 bytes per identifier. PostgreSQL uses explicit escape strings; MySQL uses UTF-8 hex expressions to avoid SQL-mode-dependent escaping. Review schema types before running any generated SQL.",
	run: (v) => {
		const records = json(v.input);
		if (
			!Array.isArray(records) ||
			!records.length ||
			records.length > 500 ||
			!records.every(object)
		)
			throw new Error("Provide 1–500 JSON objects in an array.");
		const columns = [...new Set(records.flatMap(Object.keys))];
		if (!columns.length || columns.length > 100)
			throw new Error("Use 1–100 columns.");
		const quote = v.dialect === "MySQL" ? "`" : '"';
		const identifier = (name: string) => {
			if (
				!name.trim() ||
				[...name].some((character) => character.charCodeAt(0) < 32) ||
				new TextEncoder().encode(name).length > 63
			)
				throw new Error(
					"Identifiers must be non-empty, printable and at most 63 UTF-8 bytes.",
				);
			return quote + name.replaceAll(quote, quote + quote) + quote;
		};
		const parts = v.table.split(".");
		if (parts.length > 2) throw new Error("Use table or schema.table.");
		const table = parts.map(identifier).join("."),
			names = columns.map(identifier).join(", "),
			batch = integer(v.batch, 1, 500);
		const literal = (value: unknown): string => {
			if (value === null || value === undefined) return "NULL";
			if (typeof value === "number") return String(value);
			if (typeof value === "boolean")
				return v.dialect === "PostgreSQL"
					? String(value).toUpperCase()
					: value
						? "1"
						: "0";
			if (typeof value !== "string") {
				if (v.nested === "Reject")
					throw new Error("Nested data requires JSON strings mode.");
				return sqlString(JSON.stringify(value), v.dialect);
			}
			return sqlString(value, v.dialect);
		};
		const output: string[] = [];
		for (let i = 0; i < records.length; i += batch)
			output.push(
				`INSERT INTO ${table} (${names}) VALUES\n${records
					.slice(i, i + batch)
					.map(
						(row) =>
							`  (${columns.map((key) => literal(Object.hasOwn(row, key) ? row[key] : null)).join(", ")})`,
					)
					.join(",\n")};`,
			);
		return output.join("\n\n");
	},
};
