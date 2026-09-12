import { type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "First text", value: "kitten" },
		{
			key: "other",
			label: "Second text (may be empty)",
			value: "sitting",
			optional: true,
		},
		{
			key: "unit",
			label: "Comparison units",
			type: "select",
			value: "Code points",
			options: [
				"Code points",
				"Grapheme clusters",
				"Whitespace-separated words",
			],
		},
		{
			key: "case",
			label: "Letter case",
			type: "select",
			value: "Preserve",
			options: ["Preserve", "Ignore case"],
		},
		{
			key: "normalization",
			label: "Unicode normalization",
			type: "select",
			value: "NFC",
			options: ["NFC", "None"],
		},
		{
			key: "whitespace",
			label: "Whitespace",
			type: "select",
			value: "Preserve",
			options: ["Preserve", "Trim and collapse"],
		},
	],
	filename: "text-similarity.json",
	smoke: '"editDistance": 3',
	help: "Computes Levenshtein distance: insertion, deletion and substitution each cost one; transposition costs two. Similarity is 100 × (1 − distance / longer unit count), not semantic similarity or a plagiarism score. Grapheme clusters keep combined emoji together; word mode splits on whitespace and keeps punctuation. Common suffix excludes the shared prefix. Each text is limited to 20,000 characters and 2,000 comparison units. Processing is browser-local.",
	run: (v) => {
		const prepare = (x: string) => {
			if (x.length > 20000)
				throw new Error("Each text must be at most 20,000 characters.");
			let s = v.normalization === "NFC" ? x.normalize("NFC") : x;
			if (v.case === "Ignore case") s = s.toLowerCase();
			if (v.whitespace === "Trim and collapse")
				s = s.trim().replace(/\s+/gu, " ");
			return v.normalization === "NFC" ? s.normalize("NFC") : s;
		};
		const split = (s: string) =>
			v.unit === "Code points"
				? Array.from(s)
				: v.unit === "Grapheme clusters"
					? Array.from(
							new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s),
							(x) => x.segment,
						)
					: s.trim()
						? s.trim().split(/\s+/u)
						: [];
		const a = split(prepare(v.input)),
			b = split(prepare(v.other));
		if (a.length > 2000 || b.length > 2000)
			throw new Error("Use at most 2,000 comparison units per text.");
		let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
		for (let i = 1; i <= a.length; i++) {
			const current = [i];
			for (let j = 1; j <= b.length; j++)
				current[j] = Math.min(
					current[j - 1] + 1,
					previous[j] + 1,
					previous[j - 1] + Number(a[i - 1] !== b[j - 1]),
				);
			previous = current;
		}
		const distance = previous[b.length],
			max = Math.max(a.length, b.length);
		let prefix = 0,
			suffix = 0;
		while (prefix < Math.min(a.length, b.length) && a[prefix] === b[prefix])
			prefix++;
		while (
			suffix < Math.min(a.length, b.length) - prefix &&
			a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
		)
			suffix++;
		return print({
			units: v.unit,
			firstLength: a.length,
			secondLength: b.length,
			editDistance: distance,
			similarityPercent: max
				? Number((100 * (1 - distance / max)).toFixed(4))
				: 100,
			equal: distance === 0,
			commonPrefixUnits: prefix,
			commonSuffixUnits: suffix,
		});
	},
};
