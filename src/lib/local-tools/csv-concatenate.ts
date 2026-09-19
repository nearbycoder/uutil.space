import { delimiterField, formulaField, parseCsv, writeCsv } from "./csv";
import type { LocalTool } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "First CSV",
			value: "name,team\nAlex,Design\nSam,Engineering",
		},
		{
			key: "second",
			label: "Second CSV",
			value: "team,name,location\nDesign,Riley,Remote",
		},
		delimiterField,
		{
			key: "schema",
			label: "Column matching",
			type: "select",
			value: "Union",
			options: ["Union", "Intersection", "Require same columns"],
		},
		{
			key: "duplicates",
			label: "Identical output rows",
			type: "select",
			value: "Keep",
			options: ["Keep", "Remove"],
		},
		formulaField,
	],
	help: "Append two CSV files by header name rather than column position. Union retains all columns with blank missing cells; Intersection retains shared columns; strict mode requires matching names but permits reordered columns. The first file determines initial column and row order. Optional deduplication compares complete output rows after projection. Each file supports 5,000 rows and 200 columns; the combined schema is capped at 200 columns.",
	filename: "combined.csv",
	smoke: "Riley,Design,Remote",
	run: (v) => {
		const a = parseCsv(v.input, v.delimiter),
			b = parseCsv(v.second, v.delimiter);
		if (
			v.schema === "Require same columns" &&
			(a.headers.length !== b.headers.length ||
				a.headers.some((h) => !b.headers.includes(h)))
		)
			throw new Error("Both files must have the same column names.");
		const headers =
			v.schema === "Intersection"
				? a.headers.filter((h) => b.headers.includes(h))
				: [...new Set([...a.headers, ...b.headers])];
		if (!headers.length || headers.length > 200)
			throw new Error("Output must contain between 1 and 200 columns.");
		const project = (table: typeof a) => {
			const indices = headers.map((h) => table.headers.indexOf(h));
			return table.rows.map((row) => indices.map((i) => (i < 0 ? "" : row[i])));
		};
		let rows = [...project(a), ...project(b)];
		if (v.duplicates === "Remove") {
			const seen = new Set<string>();
			rows = rows.filter((row) => {
				const key = JSON.stringify(row);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}
		return writeCsv(headers, rows, v.formulas !== "Preserve");
	},
};
