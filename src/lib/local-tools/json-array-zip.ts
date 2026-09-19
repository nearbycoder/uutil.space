import { array } from "../toolkit-utils";
import { type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Left JSON array",
			value: '["Alex", "Sam", "Riley"]',
		},
		{ key: "right", label: "Right JSON array", value: "[92, 88, 95]" },
		{
			key: "length",
			label: "Unequal lengths",
			type: "select",
			value: "Require equal",
			options: ["Require equal", "Shortest", "Pad with null"],
		},
		{
			key: "shape",
			label: "Output shape",
			type: "select",
			value: "Records",
			options: ["Records", "Pairs"],
		},
		{ key: "leftKey", label: "Left record key", type: "text", value: "name" },
		{
			key: "rightKey",
			label: "Right record key",
			type: "text",
			value: "score",
		},
	],
	help: "Combine arrays by position as pairs or named records. Choose strict matching, truncation or explicit null padding. Record keys must differ; keys are handled as data, including __proto__. At most 5,000 items per array.",
	filename: "zipped-array.json",
	smoke: '"score": 92',
	run: (v) => {
		if (v.leftKey.length > 200 || v.rightKey.length > 200)
			throw new Error("Keep record keys at most 200 characters long.");
		const a = array(v.input),
			b = array(v.right);
		if (v.length === "Require equal" && a.length !== b.length)
			throw new Error("Array lengths must match.");
		if (v.shape === "Records" && v.leftKey === v.rightKey)
			throw new Error("Record keys must differ.");
		const length =
			v.length === "Shortest"
				? Math.min(a.length, b.length)
				: Math.max(a.length, b.length);
		return print(
			Array.from({ length }, (_, i) =>
				v.shape === "Pairs"
					? [a[i] ?? null, b[i] ?? null]
					: Object.fromEntries([
							[v.leftKey, a[i] ?? null],
							[v.rightKey, b[i] ?? null],
						]),
			),
		);
	},
};
