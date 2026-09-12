import { json, type LocalTool, object, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON records",
			value:
				'[{"id":"a","name":"Alex"},{"id":"b","name":"Sam"},{"id":"a","name":"Riley"}]',
		},
		{
			key: "key",
			label: "Literal key field",
			type: "text",
			value: "id",
			help: "A top-level property name, not a dotted path.",
		},
		{
			key: "duplicates",
			label: "Repeated keys",
			type: "select",
			value: "Group",
			options: ["Group", "First wins", "Last wins", "Error"],
		},
		{
			key: "missing",
			label: "Missing or null keys",
			type: "select",
			value: "Error",
			options: ["Error", "Skip"],
		},
		{
			key: "encoding",
			label: "Index key format",
			type: "select",
			value: "Typed",
			options: ["Typed", "Plain strings"],
			help: "Typed distinguishes string, number and boolean keys. Plain strings requires string values.",
		},
	],
	filename: "record-index.json",
	smoke: '"string:a"',
	help: 'Builds a JSON object lookup from up to 5,000 records. Group stores arrays; First/Last wins stores one record. Typed keys are prefixed string:, number: or boolean:, so 1 and "1" stay distinct. Null or absent fields follow the missing-key policy; objects and arrays are rejected. Prototype-like keys are treated as ordinary data. Numeric-looking plain object keys may be serialized in JavaScript key order.',
	run: (v) => {
		const rows = json(v.input);
		if (
			!Array.isArray(rows) ||
			rows.length > 5000 ||
			rows.some((x) => !object(x))
		)
			throw new Error("Provide an array of at most 5,000 objects.");
		const index: Record<string, unknown> = Object.create(null);
		let skipped = 0;
		for (const row of rows) {
			const value = Object.hasOwn(row, v.key) ? row[v.key] : undefined;
			if (value == null) {
				if (v.missing === "Skip") {
					skipped++;
					continue;
				}
				throw new Error("A record has a missing or null key.");
			}
			if (!["string", "number", "boolean"].includes(typeof value))
				throw new Error("Index keys must be strings, numbers or booleans.");
			if (v.encoding === "Plain strings" && typeof value !== "string")
				throw new Error("Plain string keys require string values.");
			const key =
				v.encoding === "Typed"
					? `${typeof value}:${String(value)}`
					: String(value);
			if (v.duplicates === "Group") {
				if (!Object.hasOwn(index, key)) index[key] = [];
				(index[key] as unknown[]).push(row);
			} else if (!Object.hasOwn(index, key) || v.duplicates === "Last wins")
				index[key] = row;
			else if (v.duplicates === "Error")
				throw new Error(`Duplicate index key: ${key}`);
		}
		return print({
			inputCount: rows.length,
			skippedCount: skipped,
			keyCount: Object.keys(index).length,
			index,
		});
	},
};
