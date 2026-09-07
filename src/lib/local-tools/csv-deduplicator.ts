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
			key: "keys",
			label: "Key columns (one per line, blank for entire row)",
			value: "name",
			optional: true,
		},
		{
			key: "mode",
			label: "Rows to retain",
			type: "select",
			value: "First occurrence",
			options: [
				"First occurrence",
				"Last occurrence",
				"Duplicate groups",
				"Unique only",
			],
		},
		{
			key: "compare",
			label: "Comparison",
			type: "select",
			value: "Exact",
			options: ["Exact", "Trim and ignore case"],
		},
		delimiterField,
		formulaField,
	],
	filename: "deduplicated.csv",
	smoke: "Riley",
	help: "Deduplicate by all columns or selected keys. Duplicate groups keeps every row with a repeated key; Unique only keeps keys seen once. First/last selection preserves original row order and cell contents. Exports comma-separated CSV.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			keys = v.keys.split(/\r?\n/).filter(Boolean);
		if (
			new Set(keys).size !== keys.length ||
			keys.some((key) => !headers.includes(key))
		)
			throw new Error("Key columns must be unique existing headers.");
		const indexes = (keys.length ? keys : headers).map((key) =>
			headers.indexOf(key),
		);
		const identities = rows.map((row) =>
			JSON.stringify(
				indexes.map((i) =>
					v.compare === "Exact" ? row[i] : row[i].trim().toLowerCase(),
				),
			),
		);
		const groups = new Map<
			string,
			{ first: number; last: number; count: number }
		>();
		identities.forEach((key, i) => {
			const group = groups.get(key);
			if (group) {
				group.last = i;
				group.count++;
			} else groups.set(key, { first: i, last: i, count: 1 });
		});
		return writeCsv(
			headers,
			rows.filter((_, i) => {
				const group = groups.get(identities[i]);
				return v.mode === "First occurrence"
					? group?.first === i
					: v.mode === "Last occurrence"
						? group?.last === i
						: v.mode === "Duplicate groups"
							? (group?.count ?? 0) > 1
							: group?.count === 1;
			}),
			v.formulas === "Protect",
		);
	},
};
