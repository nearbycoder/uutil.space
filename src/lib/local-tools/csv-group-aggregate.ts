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
			key: "groups",
			label: "Group columns (one per line)",
			value: "team",
			optional: true,
			help: "Leave blank to aggregate the entire table.",
		},
		{
			key: "operation",
			label: "Aggregate",
			type: "select",
			value: "Average",
			options: ["Count", "Sum", "Average", "Minimum", "Maximum"],
		},
		{
			key: "metric",
			label: "Numeric column",
			type: "text",
			value: "score",
			optional: true,
			help: "Not used by Count.",
		},
		{
			key: "blanks",
			label: "Blank numeric cells",
			type: "select",
			value: "Ignore",
			options: ["Ignore", "Zero", "Error"],
		},
		{
			key: "sort",
			label: "Group order",
			type: "select",
			value: "First appearance",
			options: ["First appearance", "Ascending"],
		},
		delimiterField,
		formulaField,
	],
	filename: "aggregated.csv",
	smoke: "Design,3,2,92",
	help: "Group names match exactly and cell spelling is preserved. Row count includes all records; value count includes numeric values used (or all records for Count). Empty numeric groups produce a blank result except Sum (zero). Empty tables produce no groups. Numeric operations use finite decimal values and JavaScript floating-point precision, not decimal accounting arithmetic. Output metric columns are agg_rows, agg_values, and agg_result.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			names = v.groups.split(/\r?\n/).filter(Boolean);
		if (
			new Set(names).size !== names.length ||
			names.some(
				(n) =>
					!headers.includes(n) ||
					["agg_rows", "agg_values", "agg_result"].includes(n),
			)
		)
			throw new Error(
				"Use unique existing group columns that do not conflict with agg_rows, agg_values, or agg_result.",
			);
		const indexes = names.map((n) => headers.indexOf(n)),
			metric = headers.indexOf(v.metric);
		if (v.operation !== "Count" && metric < 0)
			throw new Error("Choose an existing numeric column.");
		const groups = new Map<
			string,
			{ keys: string[]; count: number; values: number[] }
		>();
		for (const row of rows) {
			const keys = indexes.map((i) => row[i]),
				key = JSON.stringify(keys);
			let group = groups.get(key);
			if (!group) {
				group = { keys, count: 0, values: [] };
				groups.set(key, group);
			}
			group.count++;
			if (v.operation === "Count") continue;
			const cell = row[metric].trim();
			if (!cell) {
				if (v.blanks === "Error")
					throw new Error("Blank numeric cell encountered.");
				if (v.blanks === "Zero") group.values.push(0);
				continue;
			}
			const n = Number(cell);
			if (
				!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cell) ||
				!Number.isFinite(n) ||
				(Number.isInteger(n) && !Number.isSafeInteger(n))
			)
				throw new Error(
					"Numeric cells must be finite decimal values within the safe integer range.",
				);
			group.values.push(n);
		}
		const result = [...groups.values()];
		if (v.sort === "Ascending")
			result.sort((a, b) =>
				JSON.stringify(a.keys) < JSON.stringify(b.keys)
					? -1
					: JSON.stringify(a.keys) > JSON.stringify(b.keys)
						? 1
						: 0,
			);
		return writeCsv(
			[...names, "agg_rows", "agg_values", "agg_result"],
			result.map((g) => {
				const sum = g.values.reduce((a, b) => a + b, 0);
				let n: number | string;
				if (v.operation === "Count") n = g.count;
				else if (v.operation === "Sum") n = sum;
				else if (!g.values.length) n = "";
				else if (v.operation === "Average") n = sum / g.values.length;
				else
					n =
						v.operation === "Minimum"
							? Math.min(...g.values)
							: Math.max(...g.values);
				if (typeof n === "number" && !Number.isFinite(n))
					throw new Error("Aggregate overflow. Reduce the numeric magnitude.");
				return [
					...g.keys,
					String(g.count),
					String(v.operation === "Count" ? g.count : g.values.length),
					String(n),
				];
			}),
			v.formulas === "Protect",
		);
	},
};
