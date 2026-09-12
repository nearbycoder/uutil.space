import { delimiterField, formulaField, parseCsv, writeCsv } from "./csv";
import { json, type LocalTool, object } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "CSV data",
			value: "name,team\n Alex ,design\nSam,engineering\n,design",
		},
		{
			key: "columns",
			label: "Columns to transform (JSON array)",
			value: '["name","team"]',
		},
		{
			key: "steps",
			label: "Ordered transform steps (JSON)",
			value:
				'[{"operation":"trim"},{"operation":"uppercase"},{"operation":"fill blank","value":"UNKNOWN"}]',
		},
		delimiterField,
		formulaField,
	],
	filename: "transformed.csv",
	smoke: "ALEX,DESIGN",
	help: "Applies 1–20 steps in order to selected literal column names, leaving headings and other cells unchanged. Supported operations: trim, lowercase, uppercase, normalize NFC, replace (literal find and replacement strings), fill blank (value). Replace changes every exact match; no regex or code runs. Blank means an empty string, so trim first to fill whitespace-only cells. Up to 5,000 rows and 200 columns; transformed cell/output growth is bounded.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			cols = json(v.columns),
			steps = json(v.steps);
		if (
			!Array.isArray(cols) ||
			!cols.length ||
			cols.some((c) => typeof c !== "string" || !headers.includes(c)) ||
			new Set(cols).size !== cols.length
		)
			throw new Error("Choose unique existing columns in a JSON array.");
		if (!Array.isArray(steps) || !steps.length || steps.length > 20)
			throw new Error("Provide 1–20 transform steps.");
		const transforms = steps.map((s) => {
			if (!object(s) || typeof s.operation !== "string")
				throw new Error("Each step needs an operation.");
			switch (s.operation) {
				case "trim":
					return (x: string) => x.trim();
				case "lowercase":
					return (x: string) => x.toLowerCase();
				case "uppercase":
					return (x: string) => x.toUpperCase();
				case "normalize NFC":
					return (x: string) => x.normalize("NFC");
				case "fill blank": {
					if (typeof s.value !== "string")
						throw new Error("Fill blank needs a string value.");
					const value = s.value;
					return (x: string) => (x === "" ? value : x);
				}
				case "replace": {
					if (
						typeof s.find !== "string" ||
						s.find === "" ||
						typeof s.replacement !== "string"
					)
						throw new Error(
							"Replace needs a non-empty find and a replacement string.",
						);
					const find = s.find,
						replacement = s.replacement;
					return (x: string) => {
						const parts = x.split(find);
						if (
							x.length +
								(parts.length - 1) * (replacement.length - find.length) >
							100000
						)
							throw new Error("A transformed cell exceeds 100,000 characters.");
						return parts.join(replacement);
					};
				}
				default:
					throw new Error(`Unknown transform operation: ${s.operation}`);
			}
		});
		const indices = new Set((cols as string[]).map((c) => headers.indexOf(c)));
		let total = 0;
		const out = rows.map((row) =>
			row.map((cell, i) => {
				let result = cell;
				if (indices.has(i))
					for (const transform of transforms) {
						result = transform(result);
						if (result.length > 100000)
							throw new Error("A transformed cell exceeds 100,000 characters.");
					}
				total += result.length;
				if (total > 1000000)
					throw new Error("Transformed cells exceed 1,000,000 characters.");
				return result;
			}),
		);
		parseCsv(writeCsv(headers, [], v.formulas === "Protect"), "Comma");
		return writeCsv(headers, out, v.formulas === "Protect");
	},
};
