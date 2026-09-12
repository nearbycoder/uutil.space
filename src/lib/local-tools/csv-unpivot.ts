import { delimiterField, formulaField, parseCsv, writeCsv } from "./csv";
import { json, type LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Wide CSV",
			value: "name,jan,feb\nAlex,10,12\nSam,7,9",
		},
		{ key: "ids", label: "Identifier columns (JSON array)", value: '["name"]' },
		{
			key: "variable",
			label: "Variable column name",
			type: "text",
			value: "month",
		},
		{ key: "value", label: "Value column name", type: "text", value: "amount" },
		{
			key: "blank",
			label: "Empty measurement cells",
			type: "select",
			value: "Keep",
			options: ["Keep", "Skip"],
		},
		delimiterField,
		formulaField,
	],
	filename: "unpivoted.csv",
	smoke: "Alex,jan,10",
	help: "Converts every non-identifier column into a variable/value row, preserving source row and column order. Identifier names are literal and case-sensitive; an empty identifier array is allowed. Empty means exactly empty, not whitespace. Output is comma-delimited with formula protection enabled by default. At most 5,000 source rows, 200 columns and 10,000 output rows.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			ids = json(v.ids);
		if (
			!Array.isArray(ids) ||
			ids.some((x) => typeof x !== "string" || !headers.includes(x)) ||
			new Set(ids).size !== ids.length
		)
			throw new Error(
				"Identifiers must be a JSON array of unique existing column names.",
			);
		const outHeaders = [...(ids as string[]), v.variable, v.value];
		if (
			outHeaders.some((x) => !x.trim()) ||
			new Set(outHeaders).size !== outHeaders.length
		)
			throw new Error("Output column names must be non-empty and unique.");
		const keys = (ids as string[]).map((x) => headers.indexOf(x)),
			measures = headers.map((_, i) => i).filter((i) => !keys.includes(i));
		if (!measures.length)
			throw new Error("Leave at least one measurement column.");
		const out: string[][] = [];
		for (const row of rows)
			for (const i of measures) {
				if (v.blank === "Skip" && row[i] === "") continue;
				if (out.length >= 10000)
					throw new Error("Unpivot exceeds 10,000 output rows.");
				out.push([...keys.map((k) => row[k]), headers[i], row[i]]);
			}
		// Formula protection can make two distinct headings identical.
		parseCsv(writeCsv(outHeaders, [], v.formulas === "Protect"), "Comma");
		return writeCsv(outHeaders, out, v.formulas === "Protect");
	},
};
