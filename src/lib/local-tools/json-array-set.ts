import { array, canonical } from "../toolkit-utils";
import { type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Left JSON array",
			value: '[{"id":1,"name":"Alex"},{"id":2},"local","local"]',
		},
		{
			key: "right",
			label: "Right JSON array",
			value: '[{"name":"Alex","id":1},{"id":3},"fast"]',
		},
		{
			key: "operation",
			label: "Set operation",
			type: "select",
			value: "Union",
			options: [
				"Union",
				"Intersection",
				"Left difference",
				"Symmetric difference",
			],
		},
	],
	help: "Compare full JSON values with structural equality: object key order is ignored, array order and value types are significant. Removes duplicates while preserving first-seen order and the original representation. Union starts with the left array; symmetric difference lists left-only before right-only values. At most 5,000 items per array.",
	filename: "json-set.json",
	smoke: '"fast"',
	run: (v) => {
		const unique = (items: unknown[]) => {
			const map = new Map<string, unknown>();
			for (const item of items) {
				const key = canonical(item);
				if (!map.has(key)) map.set(key, item);
			}
			return map;
		};
		const a = unique(array(v.input)),
			b = unique(array(v.right));
		const result: unknown[] = [];
		for (const [key, value] of a)
			if (
				v.operation === "Union" ||
				(v.operation === "Intersection" ? b.has(key) : !b.has(key))
			)
				result.push(value);
		if (v.operation === "Union" || v.operation === "Symmetric difference")
			for (const [key, value] of b) if (!a.has(key)) result.push(value);
		return print(result);
	},
};
