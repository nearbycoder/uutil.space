import { delimiterField, parseCsv } from "./csv";
import { type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Before CSV",
			value: "id,name,score\n1,Alex,90\n2,Sam,88\n3,Riley,95",
		},
		{
			key: "after",
			label: "After CSV",
			value: "id,name,score\n1,Alex,92\n3,Riley,95\n4,Jo,80",
		},
		delimiterField,
		{ key: "keys", label: "Key columns (one per line)", value: "id" },
	],
	help: "Compare CSV snapshots by one or more key columns, independent of row and column order. Keys must exist in both files and be unique within each file; composite keys are encoded without delimiter ambiguity. Values compare as exact strings. Reports added/removed rows, per-cell changes, schema changes and unchanged rows. Missing columns are represented by null, distinct from empty cells. No spreadsheet execution or server upload.",
	filename: "csv-changes.json",
	smoke: '"unchangedRows": 1',
	run: (v) => {
		const before = parseCsv(v.input, v.delimiter),
			after = parseCsv(v.after, v.delimiter);
		const keys = v.keys.split(/\r?\n/).filter(Boolean);
		if (
			!keys.length ||
			new Set(keys).size !== keys.length ||
			keys.some(
				(k) => !before.headers.includes(k) || !after.headers.includes(k),
			)
		)
			throw new Error("Use unique key column names present in both files.");
		const index = (table: typeof before) => {
			const map = new Map<string, Record<string, string>>();
			for (const row of table.rows) {
				const key = JSON.stringify(
					keys.map((k) => row[table.headers.indexOf(k)]),
				);
				if (map.has(key))
					throw new Error(
						`Duplicate key ${key}; keys must uniquely identify rows.`,
					);
				map.set(
					key,
					Object.fromEntries(table.headers.map((h, i) => [h, row[i]])),
				);
			}
			return map;
		};
		const a = index(before),
			b = index(after),
			columns = [...new Set([...before.headers, ...after.headers])];
		const added: unknown[] = [],
			removed: unknown[] = [],
			changed: unknown[] = [];
		let unchangedRows = 0;
		for (const [key, row] of a) {
			const next = b.get(key);
			if (!next) {
				removed.push(row);
				continue;
			}
			const changes = columns.flatMap((column) => {
				const oldValue = Object.hasOwn(row, column) ? row[column] : null;
				const newValue = Object.hasOwn(next, column) ? next[column] : null;
				return oldValue === newValue
					? []
					: [{ column, before: oldValue, after: newValue }];
			});
			if (changes.length) changed.push({ key: JSON.parse(key), changes });
			else unchangedRows++;
		}
		for (const [key, row] of b) if (!a.has(key)) added.push(row);
		return print({
			addedColumns: after.headers.filter((h) => !before.headers.includes(h)),
			removedColumns: before.headers.filter((h) => !after.headers.includes(h)),
			unchangedRows,
			added,
			removed,
			changed,
		});
	},
};
