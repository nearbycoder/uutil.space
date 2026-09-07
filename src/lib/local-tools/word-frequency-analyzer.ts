import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text to analyze",
			value: "Build useful tools. Build reliable tools. Make useful things.",
		},
		{ key: "locale", label: "Language locale", type: "text", value: "en" },
		{
			key: "case",
			label: "Letter case",
			type: "select",
			value: "Ignore case",
			options: ["Ignore case", "Case-sensitive"],
		},
		{
			key: "exclude",
			label: "Excluded words (one per line)",
			value: "the\na\nand",
			optional: true,
		},
		{ key: "minimum", label: "Minimum word length", type: "text", value: "1" },
		{ key: "limit", label: "Top results", type: "text", value: "50" },
	],
	filename: "word-frequency.json",
	smoke: '"word": "build"',
	help: "Uses the browser's Intl.Segmenter for language-aware word boundaries. Counts exclude punctuation, configured stop words and short words. Ties sort by code-unit order. Percentages use all included words, not only the displayed top results. Results can vary with browser language data.",
	run: (v) => {
		const locale = Intl.getCanonicalLocales(v.locale)[0];
		if (!locale || !Intl.Segmenter.supportedLocalesOf([locale]).length)
			throw new Error(
				"Choose a supported language locale, such as en, fr, or ja.",
			);
		const minimum = integer(v.minimum, 1, 100),
			limit = integer(v.limit, 1, 1000),
			normalize = (s: string) =>
				v.case === "Ignore case"
					? s.normalize("NFC").toLocaleLowerCase(locale)
					: s.normalize("NFC");
		const excluded = new Set(
				v.exclude.split(/\r?\n/).map((s) => normalize(s.trim())),
			),
			counts = new Map<string, number>();
		let total = 0,
			included = 0;
		for (const segment of new Intl.Segmenter(locale, {
			granularity: "word",
		}).segment(v.input)) {
			if (!segment.isWordLike) continue;
			total++;
			const word = normalize(segment.segment);
			if ([...word].length < minimum || excluded.has(word)) continue;
			included++;
			counts.set(word, (counts.get(word) ?? 0) + 1);
		}
		const sorted = [...counts].sort(
			(a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
		);
		return print({
			totalWords: total,
			includedWords: included,
			uniqueWords: counts.size,
			omittedTerms: Math.max(0, counts.size - limit),
			frequencies: sorted.slice(0, limit).map(([word, count]) => ({
				word,
				count,
				percent: +((100 * count) / included).toFixed(2),
			})),
		});
	},
};
