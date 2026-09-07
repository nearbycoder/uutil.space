import { json, type LocalTool, object } from "./types";
export function sortJson(
	value: unknown,
	descending = false,
	space = 2,
): string {
	const render = (item: unknown, depth: number): string => {
		if (!object(item) && !Array.isArray(item)) return JSON.stringify(item);
		const array = Array.isArray(item),
			keys = Object.keys(item);
		if (!array)
			keys.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0) * (descending ? -1 : 1));
		const entries = keys.map(
			(key) =>
				(array ? "" : `${JSON.stringify(key)}:${space ? " " : ""}`) +
				render((item as Record<string, unknown>)[key], depth + 1),
		);
		const [open, close] = array ? ["[", "]"] : ["{", "}"];
		if (!entries.length) return open + close;
		return space
			? `${open}\n${" ".repeat((depth + 1) * space)}${entries.join(`,\n${" ".repeat((depth + 1) * space)}`)}\n${" ".repeat(depth * space)}${close}`
			: open + entries.join(",") + close;
	};
	return render(value, 0);
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON to sort",
			value: '{"z":1,"a":{"beta":2,"alpha":1},"items":[{"z":0,"a":1}]}',
		},
		{
			key: "order",
			label: "Key order",
			type: "select",
			value: "Ascending",
			options: ["Ascending", "Descending"],
		},
		{
			key: "indent",
			label: "Indentation",
			type: "select",
			value: "2",
			options: ["2", "4", "Compact"],
		},
	],
	filename: "sorted.json",
	smoke: '"alpha": 1',
	help: "Recursively sorts object keys by UTF-16 code-unit order, including numeric-looking keys. Array order and values stay unchanged. This is deterministic formatting, not RFC 8785 cryptographic canonicalization.",
	run: (v) =>
		sortJson(
			json(v.input),
			v.order === "Descending",
			v.indent === "Compact" ? 0 : +v.indent,
		),
};
