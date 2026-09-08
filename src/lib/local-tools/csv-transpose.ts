import {
	csvField,
	delimiterField,
	formulaField,
	parseCsv,
	writeCsv,
} from "./csv";
import type { LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		csvField,
		{
			key: "headings",
			label: "Output headings",
			type: "select",
			value: "Generated",
			options: ["Generated", "From column"],
		},
		{
			key: "column",
			label: "Heading source column",
			type: "text",
			value: "name",
			optional: true,
			help: "Used only by From column. Its values must be unique and non-empty.",
		},
		{
			key: "include",
			label: "Include heading source as a data row",
			type: "select",
			value: "No",
			options: ["No", "Yes"],
		},
		{
			key: "label",
			label: "First output column name",
			type: "text",
			value: "field",
		},
		delimiterField,
		formulaField,
	],
	filename: "transposed.csv",
	smoke: "field,row_1,row_2",
	help: "Original columns become rows. Generated headings are row_1, row_2, and so on. From column uses that column's original values as headings; it can retain or omit the source column as a data row. Output headings must be unique and may not collide with the first column name. Input is limited to 199 data records so the output stays within 200 columns. Cell values are not converted or trimmed.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter);
		if (rows.length > 199)
			throw new Error("Transpose at most 199 records (200 output columns).");
		const source = headers.indexOf(v.column);
		if (v.headings === "From column" && source < 0)
			throw new Error("Choose an existing heading source column.");
		const outputHeaders = [
			v.label,
			...rows.map((r, i) =>
				v.headings === "Generated" ? ["row", i + 1].join("_") : r[source],
			),
		];
		if (
			outputHeaders.some((h) => !h.trim()) ||
			new Set(outputHeaders).size !== outputHeaders.length
		)
			throw new Error(
				"Output headings must be non-empty and unique, including the first column name.",
			);
		const output = headers.flatMap((header, i) =>
			v.headings === "From column" && v.include === "No" && i === source
				? []
				: [[header, ...rows.map((row) => row[i])]],
		);
		if (!output.length)
			throw new Error(
				"Include the heading source or provide another data column.",
			);
		const csv = writeCsv(outputHeaders, output, v.formulas === "Protect");
		// Formula protection can make two otherwise distinct headings identical.
		parseCsv(csv, "Comma");
		return csv;
	},
};
