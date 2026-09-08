import { sqlString } from "./json-sql-insert";
import { json, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Values", value: '["Alex","O\'Reilly","Sam",null]' },
		{
			key: "format",
			label: "Input format",
			type: "select",
			value: "JSON array",
			options: ["JSON array", "Lines"],
		},
		{
			key: "lineType",
			label: "Line value type",
			type: "select",
			value: "String",
			options: ["String", "Number"],
		},
		{
			key: "column",
			label: "Column (optionally table.column)",
			type: "text",
			value: "name",
		},
		{
			key: "clause",
			label: "Predicate",
			type: "select",
			value: "IN",
			options: ["IN", "NOT IN"],
		},
		{
			key: "dialect",
			label: "SQL dialect",
			type: "select",
			value: "PostgreSQL",
			options: ["PostgreSQL", "SQLite", "MySQL"],
		},
		{
			key: "output",
			label: "Value representation",
			type: "select",
			value: "Parameters",
			options: ["Parameters", "Literals"],
		},
		{
			key: "nulls",
			label: "NULL values",
			type: "select",
			value: "Match explicitly",
			options: ["Match explicitly", "Ignore"],
		},
	],
	filename: "in-clause.json",
	smoke: '"parameters"',
	help: "Generates a predicate, never executes SQL. JSON input accepts up to 500 scalar values; Lines ignores blank lines and preserves nonblank string whitespace. Duplicate typed values are removed. Empty IN becomes false; empty NOT IN becomes true. Match explicitly combines IN with IS NULL, or NOT IN with IS NOT NULL. Parameters are ordered; PostgreSQL uses $1, others use ?. Review target column types and use your database driver's parameter binding.",
	run: (v) => {
		let values: unknown;
		if (v.format === "JSON array") values = json(v.input);
		else
			values = v.input
				.split(/\r?\n/)
				.filter((x) => x.trim())
				.map((x) => {
					if (v.lineType === "String") return x;
					const n = Number(x);
					if (
						!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(x.trim()) ||
						!Number.isFinite(n) ||
						(Number.isInteger(n) && !Number.isSafeInteger(n))
					)
						throw new Error("Number lines require safe finite decimals.");
					return n;
				});
		if (
			!Array.isArray(values) ||
			values.length > 500 ||
			values.some(
				(x) =>
					x !== null && !["string", "number", "boolean"].includes(typeof x),
			)
		)
			throw new Error("Provide at most 500 scalar values.");
		const quote = v.dialect === "MySQL" ? String.fromCharCode(96) : '"',
			parts = v.column.split(".");
		if (
			parts.length > 2 ||
			parts.some(
				(p) =>
					!p.trim() ||
					[...p].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
					new TextEncoder().encode(p).length > 63,
			)
		)
			throw new Error(
				"Use column or table.column, with printable identifiers of at most 63 UTF-8 bytes.",
			);
		const column = parts
			.map((p) => {
				sqlString(p, v.dialect);
				return [quote, p.replaceAll(quote, quote + quote), quote].join("");
			})
			.join(".");
		const distinct = [
			...new Map(values.map((x) => [JSON.stringify(x), x])).values(),
		];
		const nullMatch = distinct.includes(null) && v.nulls === "Match explicitly";
		const filtered = distinct.filter((x) => x !== null),
			parameters: unknown[] = [];
		const literals = filtered.map((x) => {
			if (typeof x === "string") sqlString(x, v.dialect);
			if (v.output === "Parameters") {
				parameters.push(
					typeof x === "boolean" && v.dialect !== "PostgreSQL" ? Number(x) : x,
				);
				return v.dialect === "PostgreSQL"
					? ["$", parameters.length].join("")
					: "?";
			}
			if (typeof x === "string") return sqlString(x, v.dialect);
			if (typeof x === "boolean")
				return v.dialect === "PostgreSQL"
					? String(x).toUpperCase()
					: String(Number(x));
			return String(x);
		});
		let sql = literals.length
			? [column, v.clause, "(", literals.join(", "), ")"].join(" ")
			: v.clause === "IN"
				? "1 = 0"
				: "1 = 1";
		if (nullMatch) {
			const nullSql = [
				column,
				v.clause === "IN" ? "IS NULL" : "IS NOT NULL",
			].join(" ");
			sql = literals.length
				? ["(", sql, v.clause === "IN" ? "OR" : "AND", nullSql, ")"].join(" ")
				: nullSql;
		}
		return print({
			sql,
			parameters,
			inputCount: values.length,
			distinctCount: distinct.length,
			nullPolicy: v.nulls,
		});
	},
};
