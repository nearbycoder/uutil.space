import {
	csvField,
	delimiterField,
	formulaField,
	parseCsv,
	writeCsv,
} from "./csv";
import { integer, type LocalTool } from "./types";

export const tool: LocalTool = {
	fields: [
		csvField,
		delimiterField,
		{ key: "count", label: "Sample row count", type: "text", value: "2" },
		{
			key: "seed",
			label: "Reproducible seed",
			type: "text",
			value: "util-space",
		},
		{
			key: "partition",
			label: "Output partition",
			type: "select",
			value: "Sample",
			options: ["Sample", "Remaining rows"],
		},
		{
			key: "order",
			label: "Output order",
			type: "select",
			value: "Original order",
			options: ["Original order", "Shuffled order"],
		},
		formulaField,
	],
	help: "Sample CSV rows without replacement using a seeded Fisher–Yates shuffle. The same input, row count and seed reproduce the same sample; Remaining rows produces its exact complement. Duplicate-looking rows remain independent records. Original order makes review easier; shuffled order follows the seeded permutation. This deterministic PRNG is for fixtures and data splits, not security or regulated random draws.",
	filename: "sample.csv",
	smoke: "name,team,score",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			count = integer(v.count, 0, rows.length);
		let state = 2166136261;
		for (let i = 0; i < v.seed.length; i++)
			state = Math.imul(state ^ v.seed.charCodeAt(i), 16777619);
		const random = () => {
			state = (state + 0x6d2b79f5) | 0;
			let t = Math.imul(state ^ (state >>> 15), 1 | state);
			t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const indices = rows.map((_, i) => i);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		const selected =
			v.partition === "Sample" ? indices.slice(0, count) : indices.slice(count);
		if (v.order === "Original order") selected.sort((a, b) => a - b);
		return writeCsv(
			headers,
			selected.map((i) => rows[i]),
			v.formulas !== "Preserve",
		);
	},
};
