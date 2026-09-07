import { json, type LocalTool, object, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "before",
			label: "Original JSON",
			value: '{"user":{"name":"Alex","role":"viewer"},"active":true}',
		},
		{
			key: "after",
			label: "Updated JSON",
			value: '{"user":{"name":"Alex","role":"editor"},"tags":["team"]}',
		},
	],
	filename: "json-diff.json",
	smoke: '"path": "/user/role"',
	help: "Compare values structurally, ignoring object-key order. Arrays are compared by index, not by inferred identity. Paths use JSON Pointer escaping; the empty path means the document root.",
	run: (values) => {
		const changes: {
			kind: string;
			path: string;
			before?: unknown;
			after?: unknown;
		}[] = [];
		const visit = (before: unknown, after: unknown, path: string) => {
			if (Object.is(before, after)) return;
			if (
				(object(before) && object(after)) ||
				(Array.isArray(before) && Array.isArray(after))
			) {
				const left = before as Record<string, unknown>,
					right = after as Record<string, unknown>;
				for (const key of new Set([
					...Object.keys(left),
					...Object.keys(right),
				])) {
					const child = `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
					if (!Object.hasOwn(left, key))
						changes.push({ kind: "added", path: child, after: right[key] });
					else if (!Object.hasOwn(right, key))
						changes.push({ kind: "removed", path: child, before: left[key] });
					else visit(left[key], right[key], child);
				}
			} else changes.push({ kind: "changed", path, before, after });
		};
		visit(json(values.before), json(values.after), "");
		return print({
			equal: changes.length === 0,
			count: changes.length,
			changes,
		});
	},
};
