import { json, type LocalTool, object, print } from "./types";
export function editPointer(
	document: unknown,
	pointer: string,
	operation: string,
	replacement: unknown,
): unknown {
	if (pointer === "") {
		if (operation === "Remove")
			throw new Error(
				"Cannot remove the document root. Replace it with null instead.",
			);
		return operation === "Read" ? document : replacement;
	}
	if (!pointer.startsWith("/") || /~(?![01])/.test(pointer))
		throw new Error(
			"Use a JSON Pointer starting with /; escape ~ as ~0 and / as ~1.",
		);
	const parts = pointer
		.slice(1)
		.split("/")
		.map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
	let current = document;
	for (const [i, key] of parts.entries()) {
		if (!object(current) && !Array.isArray(current))
			throw new Error("Pointer traverses a scalar value.");
		const last = i === parts.length - 1;
		if (Array.isArray(current)) {
			if (last && key === "-" && operation === "Set") {
				current.push(replacement);
				return document;
			}
			if (!/^(0|[1-9]\d*)$/.test(key) || +key >= current.length)
				throw new Error("Array index does not exist. Use - to append.");
		}
		if (
			!Object.hasOwn(current, key) &&
			!(last && operation === "Set" && object(current))
		)
			throw new Error(`Pointer property does not exist: ${key}`);
		if (last) {
			if (operation === "Read")
				return (current as Record<string, unknown>)[key];
			if (operation === "Remove") {
				if (Array.isArray(current)) current.splice(+key, 1);
				else delete (current as Record<string, unknown>)[key];
			} else
				Object.defineProperty(current, key, {
					value: replacement,
					writable: true,
					enumerable: true,
					configurable: true,
				});
			return document;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return document;
}
export const tool: LocalTool = {
	fields: [
		{
			key: "document",
			label: "JSON document",
			value: '{"users":[{"name":"Alex"}],"a/b":true}',
		},
		{
			key: "pointer",
			label: "JSON Pointer",
			type: "text",
			value: "/users/0/name",
			optional: true,
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Set",
			options: ["Read", "Set", "Remove"],
		},
		{
			key: "value",
			label: "Replacement JSON value",
			value: '"Sam"',
			optional: true,
		},
	],
	filename: "pointer-result.json",
	smoke: "Sam",
	help: "Read, replace, add an object property, append with /-, or remove a value. Intermediate containers must exist. Empty pointer selects the root. Replacement is parsed only for Set. Uses RFC 6901 escaping; URI fragments are not accepted.",
	run: (v) =>
		print(
			editPointer(
				json(v.document),
				v.pointer,
				v.operation,
				v.operation === "Set" ? json(v.value) : null,
			),
		),
};
