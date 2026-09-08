import { json, type LocalTool, object, print } from "./types";

type Row = { pointer: string; type: string; value?: unknown };
const escapePointer = (key: string) =>
	key.replace(/~/g, "~0").replace(/\//g, "~1");
function tokens(pointer: string) {
	if (pointer === "") return [];
	if (!pointer.startsWith("/") || /~(?![01])/.test(pointer))
		throw new Error("Invalid JSON Pointer.");
	const parts = pointer
		.slice(1)
		.split("/")
		.map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
	if (parts.length > 80) throw new Error("Use at most 80 nesting levels.");
	return parts;
}
export function flatten(value: unknown): Row[] {
	const rows: Row[] = [];
	const visit = (item: unknown, pointer: string) => {
		if (rows.length >= 10000) throw new Error("Use at most 10,000 JSON nodes.");
		const type =
			item === null ? "null" : Array.isArray(item) ? "array" : typeof item;
		rows.push(
			type === "object" || type === "array"
				? { pointer, type }
				: { pointer, type, value: item },
		);
		if (item && typeof item === "object")
			for (const [key, child] of Object.entries(item))
				visit(child, `${pointer}/${escapePointer(key)}`);
	};
	visit(value, "");
	return rows;
}
export function unflatten(value: unknown): unknown {
	if (!Array.isArray(value) || !value.length || value.length > 10000)
		throw new Error("Provide 1–10,000 typed pointer rows.");
	const nodes = new Map<
		string,
		{ value: unknown; parts: string[]; type: string }
	>();
	for (const row of value) {
		if (
			!object(row) ||
			typeof row.pointer !== "string" ||
			typeof row.type !== "string"
		)
			throw new Error("Each row needs pointer and type fields.");
		if (nodes.has(row.pointer))
			throw new Error(`Duplicate pointer: ${row.pointer}`);
		const parts = tokens(row.pointer);
		let node: unknown;
		if (row.type === "object") node = Object.create(null);
		else if (row.type === "array") node = [];
		else if (
			["string", "number", "boolean", "null"].includes(row.type) &&
			(row.type === "null" ? row.value === null : typeof row.value === row.type)
		)
			node = row.value;
		else throw new Error(`Invalid type/value at ${row.pointer}.`);
		nodes.set(row.pointer, { value: node, parts, type: row.type });
	}
	if (!nodes.has(""))
		throw new Error("Include the root row with an empty pointer.");
	for (const [pointer, node] of nodes) {
		if (pointer === "") continue;
		const parentPointer = pointer.slice(0, pointer.lastIndexOf("/"));
		const parent = nodes.get(parentPointer);
		const key = node.parts[node.parts.length - 1];
		if (!parent || !["array", "object"].includes(parent.type))
			throw new Error(`Missing container parent for ${pointer}.`);
		if (Array.isArray(parent.value)) {
			if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= 10000)
				throw new Error(
					"Array indexes must be canonical integers below 10,000.",
				);
			parent.value[Number(key)] = node.value;
		} else
			Object.defineProperty(parent.value, key, {
				value: node.value,
				enumerable: true,
				configurable: true,
				writable: true,
			});
	}
	for (const node of nodes.values())
		if (
			Array.isArray(node.value) &&
			Object.keys(node.value).length !== node.value.length
		)
			throw new Error(
				"Array rows must have contiguous indexes starting at zero.",
			);
	return nodes.get("")?.value;
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON document or typed pointer rows",
			value: '{"user":{"name":"Alex"},"tags":["local"],"empty":{}}',
		},
		{
			key: "mode",
			label: "Operation",
			type: "select",
			value: "Flatten",
			options: ["Flatten", "Unflatten"],
		},
	],
	filename: "json-pointer-rows.json",
	smoke: "/user/name",
	help: "Flatten emits one typed row per node using JSON Pointer escaping (~0 and ~1). Copy those rows back and choose Unflatten to rebuild the document. Explicit container rows preserve arrays, numeric object keys, empty objects, and empty arrays. Unflatten accepts any row order, rejects duplicate/conflicting paths and sparse arrays. Limit: 10,000 nodes and 80 nesting levels.",
	run: (v) =>
		print(
			v.mode === "Flatten" ? flatten(json(v.input)) : unflatten(json(v.input)),
		),
};
