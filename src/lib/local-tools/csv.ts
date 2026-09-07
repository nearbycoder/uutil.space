import Papa from "papaparse";
import type { Field } from "./types";
export const csvField: Field = {
	key: "input",
	label: "CSV data",
	value:
		"name,team,score\nAlex,Design,92\nSam,Engineering,88\nRiley,Design,\nAlex,Design,92",
};
export const delimiterField: Field = {
	key: "delimiter",
	label: "Delimiter",
	type: "select",
	value: "Comma",
	options: ["Comma", "Semicolon", "Tab"],
};
export const formulaField: Field = {
	key: "formulas",
	label: "Spreadsheet formula safety",
	type: "select",
	value: "Protect",
	options: ["Protect", "Preserve"],
	help: "Protect prefixes formula-like cells with an apostrophe. Preserve keeps exact values; do not open untrusted output in a spreadsheet.",
};
export function parseCsv(input: string, delimiter: string) {
	const result = Papa.parse<string[]>(input.replace(/^\uFEFF/, ""), {
		delimiter:
			delimiter === "Tab" ? "\t" : delimiter === "Semicolon" ? ";" : ",",
		skipEmptyLines: true,
	});
	if (result.errors.length)
		throw new Error(`CSV parse error: ${result.errors[0].message}`);
	const [headers, ...rows] = result.data;
	if (
		!headers?.length ||
		headers.some((h) => !h.trim()) ||
		new Set(headers).size !== headers.length
	)
		throw new Error("CSV requires non-empty, unique column headers.");
	if (headers.length > 200 || rows.length > 5000)
		throw new Error("Use at most 200 columns and 5,000 data rows.");
	const mismatch = rows.findIndex((row) => row.length !== headers.length);
	if (mismatch >= 0)
		throw new Error(
			`Data row ${mismatch + 1} has ${rows[mismatch].length} cells; expected ${headers.length}.`,
		);
	return { headers, rows };
}
export function writeCsv(headers: string[], rows: string[][], protect = true) {
	return Papa.unparse([headers, ...rows], {
		newline: "\n",
		escapeFormulae: protect,
	});
}
