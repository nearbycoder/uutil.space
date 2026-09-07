import { json, type LocalTool, object, print } from "./types";
export function mergePatch(target: unknown, patch: unknown): unknown {
	if (!object(patch)) return patch;
	const result: Record<string, unknown> = Object.assign(
		Object.create(null),
		object(target) ? target : {},
	);
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) delete result[key];
		else
			result[key] = mergePatch(
				Object.hasOwn(result, key) ? result[key] : undefined,
				value,
			);
	}
	return result;
}
export const tool: LocalTool = {
	fields: [
		{
			key: "target",
			label: "Target JSON",
			value:
				'{"title":"Draft","author":{"name":"Alex","email":"alex@example.com"},"tags":["old"]}',
		},
		{
			key: "patch",
			label: "Merge patch",
			value: '{"title":"Published","author":{"email":null},"tags":["new"]}',
		},
	],
	filename: "merged.json",
	smoke: "Published",
	help: "RFC 7396 semantics: null deletes an object property, objects merge recursively, and arrays or scalar patches replace the entire target value. This is not JSON Patch (RFC 6902). Source documents are not modified.",
	run: (values) => print(mergePatch(json(values.target), json(values.patch))),
};
