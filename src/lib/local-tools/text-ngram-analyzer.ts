import { integer, type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text to analyze",
			value:
				"Build local tools. Build local tools that work offline. Local tools stay fast.",
		},
		{ key: "size", label: "Words per phrase", type: "text", value: "2" },
		{
			key: "case",
			label: "Letter case",
			type: "select",
			value: "Ignore case",
			options: ["Ignore case", "Case sensitive"],
		},
		{
			key: "boundary",
			label: "Phrase boundaries",
			type: "select",
			value: "Stop at punctuation",
			options: ["Stop at punctuation", "Continuous words"],
		},
		{ key: "minimum", label: "Minimum occurrences", type: "text", value: "2" },
		{ key: "limit", label: "Maximum results", type: "text", value: "50" },
	],
	help: "Find repeated contiguous word phrases (2–8 words), with counts and shares of all n-gram windows. Unicode letters/numbers and internal straight or curly apostrophes form words. Punctuation mode breaks at every character that is not a word character or horizontal space, including newlines; continuous mode crosses punctuation. Case folding uses JavaScript lowercase. Ties sort by phrase for repeatable results. At most 20,000 words and 1,000 results.",
	filename: "phrase-frequencies.json",
	smoke: '"phrase": "local tools"',
	run: (v) => {
		const size = integer(v.size, 2, 8),
			minimum = integer(v.minimum, 1, 20000),
			limit = integer(v.limit, 1, 1000);
		const text = v.case === "Ignore case" ? v.input.toLowerCase() : v.input;
		const segments =
			v.boundary === "Continuous words"
				? [text]
				: text.split(/[^\p{L}\p{N}\p{M}'’ \t]+/u);
		const counts = new Map<string, number>();
		let words = 0,
			windows = 0;
		for (const segment of segments) {
			const tokens =
				segment.match(
					/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu,
				) ?? [];
			words += tokens.length;
			if (words > 20000) throw new Error("Use at most 20,000 words.");
			for (let i = 0; i + size <= tokens.length; i++) {
				const phrase = tokens.slice(i, i + size).join(" ");
				counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
				windows++;
			}
		}
		const matches = [...counts]
			.filter(([, count]) => count >= minimum)
			.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
		return print({
			words,
			windows,
			distinctPhrases: counts.size,
			matchingPhrases: matches.length,
			results: matches.slice(0, limit).map(([phrase, count]) => ({
				phrase,
				count,
				sharePercent: (count / windows) * 100,
			})),
		});
	},
};
