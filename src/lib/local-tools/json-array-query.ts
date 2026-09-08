import { integer, json, type LocalTool, object, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON records",
			value:
				'[{"name":"Alex","status":"active","score":92},{"name":"Sam","status":"inactive","score":88},{"name":"Riley","status":"active","score":95}]',
		},
		{
			key: "key",
			label: "Filter property",
			type: "text",
			value: "status",
			optional: true,
			help: "Exact top-level property name. Leave blank to include all records.",
		},
		{
			key: "operator",
			label: "Comparison",
			type: "select",
			value: "Equals",
			options: [
				"Equals",
				"Not equals",
				"Contains",
				"Greater than",
				"Less than",
				"Exists",
				"Missing",
			],
		},
		{
			key: "value",
			label: "Comparison value (JSON scalar)",
			type: "text",
			value: '"active"',
			optional: true,
			help: "Use quoted strings, numbers, booleans, or null. Not used by Exists/Missing.",
		},
		{
			key: "columns",
			label: "Output properties (one per line)",
			value: "name\nscore",
			optional: true,
			help: "Leave blank for all properties. Missing selected properties are omitted.",
		},
		{
			key: "sort",
			label: "Sort property",
			type: "text",
			value: "score",
			optional: true,
		},
		{
			key: "order",
			label: "Sort direction",
			type: "select",
			value: "Descending",
			options: ["Ascending", "Descending"],
		},
		{ key: "limit", label: "Result limit", type: "text", value: "100" },
	],
	filename: "queried-records.json",
	smoke: '"matched": 2',
	help: "Query up to 5,000 object records without JavaScript or SQL evaluation. Comparisons are type-sensitive; Contains is case-sensitive string matching. Not equals requires the property to exist. Sorting accepts one consistent primitive type, keeps equal values in source order, and puts null/missing values last. Property names are literal, not dotted paths.",
	run: (v) => {
		const input = json(v.input);
		if (!Array.isArray(input) || input.length > 5000 || !input.every(object))
			throw new Error("Provide an array of at most 5,000 JSON objects.");
		const limit = integer(v.limit, 1, 5000);
		let comparison: unknown;
		if (v.key && !["Exists", "Missing"].includes(v.operator)) {
			comparison = json(v.value);
			if (comparison !== null && typeof comparison === "object")
				throw new Error("Comparison must be a JSON scalar.");
			if (
				["Greater than", "Less than"].includes(v.operator) &&
				typeof comparison !== "number"
			)
				throw new Error("Numeric comparisons require a number.");
			if (v.operator === "Contains" && typeof comparison !== "string")
				throw new Error("Contains requires a string.");
		}
		let rows = input.filter((row) => {
			if (!v.key) return true;
			const has = Object.hasOwn(row, v.key),
				item = has ? row[v.key] : undefined;
			if (v.operator === "Exists") return has;
			if (v.operator === "Missing") return !has;
			if (!has) return false;
			if (v.operator === "Equals") return item === comparison;
			if (v.operator === "Not equals") return item !== comparison;
			if (v.operator === "Contains")
				return typeof item === "string" && item.includes(String(comparison));
			return (
				typeof item === "number" &&
				typeof comparison === "number" &&
				(v.operator === "Greater than" ? item > comparison : item < comparison)
			);
		});
		const matched = rows.length;
		if (v.sort) {
			const types = new Set(
				rows
					.map((row) => (Object.hasOwn(row, v.sort) ? row[v.sort] : null))
					.filter((x) => x != null)
					.map((x) => typeof x),
			);
			if (
				types.size > 1 ||
				[...types].some((t) => !["string", "number", "boolean"].includes(t))
			)
				throw new Error("Sort values must share one primitive type.");
			rows = [...rows].sort((a, b) => {
				const x = Object.hasOwn(a, v.sort) ? a[v.sort] : null,
					y = Object.hasOwn(b, v.sort) ? b[v.sort] : null;
				if (x == null) return y == null ? 0 : 1;
				if (y == null) return -1;
				const result = x === y ? 0 : x < y ? -1 : 1;
				return result * (v.order === "Ascending" ? 1 : -1);
			});
		}
		const columns = v.columns.split(/\r?\n/).filter(Boolean);
		if (new Set(columns).size !== columns.length)
			throw new Error("Output properties must be unique.");
		const projected = rows
			.slice(0, limit)
			.map((row) =>
				columns.length
					? Object.fromEntries(
							columns
								.filter((key) => Object.hasOwn(row, key))
								.map((key) => [key, row[key]]),
						)
					: row,
			);
		return print({
			total: input.length,
			matched,
			returned: projected.length,
			truncated: matched > limit,
			rows: projected,
		});
	},
};
