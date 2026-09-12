import { integer, json, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "JSON array", value: "[1,2,3,4,5,6,7]" },
		{ key: "size", label: "Items per group", type: "text", value: "3" },
		{
			key: "mode",
			label: "Grouping",
			type: "select",
			value: "Batches",
			options: ["Batches", "Sliding windows"],
		},
		{
			key: "step",
			label: "Sliding window step",
			type: "text",
			value: "1",
			help: "Used only for sliding windows.",
		},
		{
			key: "remainder",
			label: "Incomplete final groups",
			type: "select",
			value: "Keep",
			options: ["Keep", "Drop", "Pad with null"],
		},
	],
	filename: "array-groups.json",
	smoke: '"groupCount": 3',
	help: "Split an array into non-overlapping batches, or overlapping sliding windows. Window step can exceed group size to leave gaps. Keep preserves partial trailing groups, Drop omits them, and Pad with null fills them. Original values and order are preserved. Up to 10,000 input items, 1,000 items per group, and 100,000 emitted items.",
	run: (v) => {
		const data = json(v.input);
		if (!Array.isArray(data) || data.length > 10000)
			throw new Error("Provide a JSON array with at most 10,000 items.");
		const size = integer(v.size, 1, 1000),
			step = v.mode === "Batches" ? size : integer(v.step, 1, 10000);
		const groups: unknown[][] = [];
		let emitted = 0;
		let outputSize = 100;
		const lengths = data.map((item) => {
			const text = print(item);
			return text.length + 6 * text.split("\n").length + 2;
		});
		for (let i = 0; i < data.length; i += step) {
			const group = data.slice(i, i + size);
			if (group.length < size && v.remainder === "Drop") continue;
			if (v.remainder === "Pad with null")
				while (group.length < size) group.push(null);
			emitted += group.length;
			if (emitted > 100000)
				throw new Error(
					"Grouping exceeds 100,000 emitted items; increase step or reduce size.",
				);
			outputSize +=
				12 +
				lengths.slice(i, i + size).reduce((a, b) => a + b, 0) +
				Math.max(0, group.length - (data.length - i)) * 12;
			if (outputSize > 2_000_000)
				throw new Error(
					"Expanded groups exceed 2 MB; reduce overlap or group size.",
				);
			groups.push(group);
		}
		return print({
			inputCount: data.length,
			groupCount: groups.length,
			groups,
		});
	},
};
