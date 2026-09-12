import { integer, type LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text to shorten",
			value: "/api/projects/123/deployments/456",
		},
		{
			key: "limit",
			label: "Maximum output length (including marker)",
			type: "text",
			value: "24",
		},
		{
			key: "unit",
			label: "Length unit",
			type: "select",
			value: "Grapheme clusters",
			options: ["Grapheme clusters", "Code points", "UTF-8 bytes"],
		},
		{
			key: "position",
			label: "Remove text from",
			type: "select",
			value: "End",
			options: ["End", "Start", "Middle"],
		},
		{
			key: "marker",
			label: "Truncation marker",
			type: "text",
			value: "…",
			optional: true,
		},
	],
	filename: "truncated-text.txt",
	smoke: "/api/projects",
	help: "Returns unchanged text when it fits. Otherwise the marker counts toward the 0–100,000 unit budget. Grapheme mode keeps combined emoji and accents together; Code points may separate combining sequences. UTF-8 mode also preserves whole grapheme clusters, so output may use less than the available byte budget. Middle mode reserves half of the remaining budget for the prefix and the rest for the suffix. No normalization or whitespace trimming is applied. A marker that cannot fit is rejected.",
	run: (v) => {
		const limit = integer(v.limit, 0, 100000),
			segments = (s: string) =>
				v.unit === "Code points"
					? Array.from(s)
					: Array.from(
							new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s),
							(x) => x.segment,
						),
			encoder = new TextEncoder();
		const units = (s: string) =>
			v.unit === "UTF-8 bytes" ? encoder.encode(s).length : segments(s).length;
		if (units(v.input) <= limit) return v.input;
		const cost = units(v.marker);
		if (cost > limit)
			throw new Error("The truncation marker exceeds the output budget.");
		const budget = limit - cost,
			parts = segments(v.input),
			weight = (s: string) =>
				v.unit === "UTF-8 bytes" ? encoder.encode(s).length : 1;
		const take = (items: string[], max: number) => {
			let used = 0;
			const kept: string[] = [];
			for (const part of items) {
				const n = weight(part);
				if (used + n > max) break;
				kept.push(part);
				used += n;
			}
			return { kept, used };
		};
		if (v.position === "End")
			return take(parts, budget).kept.join("") + v.marker;
		if (v.position === "Start")
			return (
				v.marker +
				take([...parts].reverse(), budget)
					.kept.reverse()
					.join("")
			);
		const first = take(parts, Math.ceil(budget / 2)),
			last = take(
				parts.slice(first.kept.length).reverse(),
				budget - first.used,
			);
		return first.kept.join("") + v.marker + last.kept.reverse().join("");
	},
};
