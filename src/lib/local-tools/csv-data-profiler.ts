import { csvField, delimiterField, parseCsv } from "./csv";
import { type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [csvField, delimiterField],
	filename: "csv-profile.json",
	smoke: '"duplicateRows": 1',
	help: "Analyze column completeness, distinct values, inferred types and numeric summaries. Duplicate rows use exact cell values. Numeric summaries ignore blanks and non-numeric cells. Leading-zero identifiers remain text. Empty lines are skipped; quoted multiline cells are supported.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter);
		return print({
			rows: rows.length,
			columns: headers.length,
			duplicateRows:
				rows.length - new Set(rows.map((row) => JSON.stringify(row))).size,
			profile: headers.map((name, index) => {
				const cells = rows.map((row) => row[index]),
					present = cells.filter((cell) => cell.trim() !== "");
				const numeric = present
					.filter(
						(cell) =>
							/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(cell) &&
							Number.isFinite(+cell),
					)
					.map(Number);
				const types = new Set(
					present.map((cell) =>
						numeric.length &&
						/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(cell) &&
						Number.isFinite(+cell)
							? "number"
							: /^(true|false)$/i.test(cell)
								? "boolean"
								: "text",
					),
				);
				return {
					name,
					blank: cells.length - present.length,
					unique: new Set(present).size,
					type:
						types.size === 0
							? "empty"
							: types.size === 1
								? [...types][0]
								: "mixed",
					numericCount: numeric.length,
					...(numeric.length
						? {
								min: Math.min(...numeric),
								max: Math.max(...numeric),
								mean: numeric.reduce((sum, n) => sum + n / numeric.length, 0),
							}
						: {}),
				};
			}),
		});
	},
};
