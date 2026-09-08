import { delimiterField, formulaField, parseCsv, writeCsv } from "./csv";
import type { LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Left CSV table",
			value: "id,name\n1,Alex\n2,Sam\n3,Riley",
		},
		{
			key: "right",
			label: "Right CSV table",
			value: "id,team\n1,Design\n2,Engineering\n4,Operations",
		},
		{ key: "leftKeys", label: "Left key columns (one per line)", value: "id" },
		{
			key: "rightKeys",
			label: "Right key columns (one per line)",
			value: "id",
		},
		{
			key: "join",
			label: "Join type",
			type: "select",
			value: "Left",
			options: ["Inner", "Left", "Full"],
		},
		{
			key: "matching",
			label: "Key comparison",
			type: "select",
			value: "Exact",
			options: ["Exact", "Trim", "Trim and ignore case"],
		},
		{
			key: "blanks",
			label: "Blank keys",
			type: "select",
			value: "Never match",
			options: ["Never match", "Match"],
		},
		delimiterField,
		formulaField,
	],
	filename: "joined.csv",
	smoke: "1,Alex,1,Design",
	help: "Keys are strings, not numbers; 01 and 1 differ. Composite keys match in the supplied order. Duplicates produce every matching pair, retaining left order then right order. Full joins append unmatched right rows. Any blank component follows the blank-key policy. Headers are prefixed left. and right.; unmatched cells are empty. Both tables use the selected delimiter. Maximum output: 10,000 rows.",
	run: (v) => {
		const left = parseCsv(v.input, v.delimiter),
			right = parseCsv(v.right, v.delimiter);
		const keyIndexes = (text: string, headers: string[]) => {
			const keys = text.split(/\r?\n/).filter(Boolean);
			if (
				!keys.length ||
				new Set(keys).size !== keys.length ||
				keys.some((k) => !headers.includes(k))
			)
				throw new Error("Join keys must be unique existing column names.");
			return keys.map((k) => headers.indexOf(k));
		};
		const lk = keyIndexes(v.leftKeys, left.headers),
			rk = keyIndexes(v.rightKeys, right.headers);
		if (lk.length !== rk.length)
			throw new Error("Left and right need the same number of key columns.");
		const key = (row: string[], indexes: number[]) => {
			const cells = indexes.map((i) =>
				v.matching === "Exact"
					? row[i]
					: v.matching === "Trim"
						? row[i].trim()
						: row[i].trim().toLowerCase(),
			);
			return v.blanks === "Never match" && cells.some((x) => !x)
				? null
				: JSON.stringify(cells);
		};
		const lookup = new Map<string, number[]>();
		right.rows.forEach((row, index) => {
			const k = key(row, rk);
			if (k !== null) {
				const group = lookup.get(k) ?? [];
				group.push(index);
				lookup.set(k, group);
			}
		});
		const output: string[][] = [],
			used = new Set<number>();
		const add = (row: string[]) => {
			if (output.length >= 10000)
				throw new Error(
					"Join exceeds 10,000 output rows. Deduplicate or narrow the input keys.",
				);
			output.push(row);
		};
		for (const row of left.rows) {
			const k = key(row, lk),
				matches = k === null ? [] : (lookup.get(k) ?? []);
			if (matches.length)
				for (const i of matches) {
					add([...row, ...right.rows[i]]);
					used.add(i);
				}
			else if (v.join !== "Inner")
				add([...row, ...right.headers.map(() => "")]);
		}
		if (v.join === "Full")
			right.rows.forEach((row, i) => {
				if (!used.has(i)) add([...left.headers.map(() => ""), ...row]);
			});
		return writeCsv(
			[
				...left.headers.map((h) => `left.${h}`),
				...right.headers.map((h) => `right.${h}`),
			],
			output,
			v.formulas === "Protect",
		);
	},
};
