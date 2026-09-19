import { finite } from "../toolkit-utils";
import { delimiterField, formulaField, parseCsv, writeCsv } from "./csv";
import type { LocalTool } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "CSV data",
			value:
				"team,quarter,sales\nDesign,Q1,12\nEngineering,Q1,20\nDesign,Q2,18\nEngineering,Q2,25\nDesign,Q1,3",
		},
		delimiterField,
		{ key: "rows", label: "Row category column", type: "text", value: "team" },
		{
			key: "columns",
			label: "Pivot category column",
			type: "text",
			value: "quarter",
		},
		{
			key: "values",
			label: "Numeric value column (unused for Count)",
			type: "text",
			value: "sales",
			optional: true,
		},
		{
			key: "aggregation",
			label: "Aggregation",
			type: "select",
			value: "Sum",
			options: ["Sum", "Count", "Average", "Minimum", "Maximum"],
		},
		{
			key: "missing",
			label: "Missing combinations",
			type: "select",
			value: "Blank",
			options: ["Blank", "Zero"],
		},
		formulaField,
	],
	help: "Build a cross-tabulation from two category columns. Categories keep first-seen order; generated headers use a value: prefix to avoid colliding with the row-key header. Blank numeric cells are excluded (Count counts every record); other nonnumeric cells are rejected. Supports up to 100 pivot categories and 1,000 row categories. CSV export protects spreadsheet formulas by default.",
	filename: "pivot-table.csv",
	smoke: "Design,15,18",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter);
		const ri = headers.indexOf(v.rows),
			ci = headers.indexOf(v.columns),
			vi = headers.indexOf(v.values);
		if (ri < 0 || ci < 0 || (v.aggregation !== "Count" && vi < 0))
			throw new Error("Choose existing column names.");
		const columns = [...new Set(rows.map((r) => r[ci]))];
		const groups = new Map<string, Map<string, number[]>>();
		for (const row of rows) {
			if (!groups.has(row[ri])) groups.set(row[ri], new Map());
			const group = groups.get(row[ri]) as Map<string, number[]>;
			if (!group.has(row[ci])) group.set(row[ci], []);
			if (v.aggregation === "Count" || row[vi].trim())
				group
					.get(row[ci])
					?.push(v.aggregation === "Count" ? 1 : finite(row[vi]));
		}
		if (columns.length > 100 || groups.size > 1000)
			throw new Error(
				"Use at most 100 pivot categories and 1,000 row categories.",
			);
		return writeCsv(
			["row-key", ...columns.map((c) => `value:${c}`)],
			[...groups].map(([key, group]) => [
				key,
				...columns.map((c) => {
					const nums = group.get(c) ?? [];
					if (!nums.length) return v.missing === "Zero" ? "0" : "";
					const sum = nums.reduce((a, b) => a + b, 0);
					return String(
						v.aggregation === "Count"
							? nums.length
							: v.aggregation === "Average"
								? sum / nums.length
								: v.aggregation === "Minimum"
									? Math.min(...nums)
									: v.aggregation === "Maximum"
										? Math.max(...nums)
										: sum,
					);
				}),
			]),
			v.formulas !== "Preserve",
		);
	},
};
