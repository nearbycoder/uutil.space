import {
	csvField,
	delimiterField,
	formulaField,
	parseCsv,
	writeCsv,
} from "./csv";
import { json, type LocalTool, object } from "./types";
export const tool: LocalTool = {
	fields: [
		csvField,
		{
			key: "columns",
			label: "Column names (one per line)",
			value: "name\nscore",
			help: "Names match headers exactly. Keep mode uses this order.",
		},
		{
			key: "mode",
			label: "Selection mode",
			type: "select",
			value: "Keep",
			options: ["Keep", "Remove"],
		},
		{
			key: "rename",
			label: "Rename map (JSON object)",
			value: '{"score":"points"}',
		},
		delimiterField,
		formulaField,
	],
	filename: "selected-columns.csv",
	smoke: "name,points",
	help: "Select and reorder columns, or remove unwanted ones, then optionally rename headers. Unknown columns, duplicate selections and duplicate output headers are rejected. Exports comma-separated CSV; quoted commas and multiline values are preserved.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			names = v.columns.split(/\r?\n/).filter(Boolean);
		if (
			new Set(names).size !== names.length ||
			names.some((name) => !headers.includes(name))
		)
			throw new Error(
				"Choose unique column names that exist in the CSV header.",
			);
		const selected =
			v.mode === "Keep"
				? names
				: headers.filter((name) => !names.includes(name));
		if (!selected.length) throw new Error("Keep at least one column.");
		const rename = json(v.rename);
		if (
			!object(rename) ||
			Object.entries(rename).some(
				([key, name]) =>
					!headers.includes(key) || typeof name !== "string" || !name.trim(),
			)
		)
			throw new Error(
				"Rename map must use existing column names and non-empty string values.",
			);
		const outputHeaders = selected.map((name) =>
			Object.hasOwn(rename, name) ? String(rename[name]) : name,
		);
		if (new Set(outputHeaders).size !== outputHeaders.length)
			throw new Error("Renamed headers must remain unique.");
		const indexes = selected.map((name) => headers.indexOf(name));
		return writeCsv(
			outputHeaders,
			rows.map((row) => indexes.map((i) => row[i])),
			v.formulas === "Protect",
		);
	},
};
