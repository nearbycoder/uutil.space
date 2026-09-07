import { type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "left",
			label: "List A (one item per line)",
			value: "apple\nbanana\nbanana\npear",
		},
		{
			key: "right",
			label: "List B (one item per line)",
			value: "banana\norange",
			optional: true,
		},
		{
			key: "operation",
			label: "Set operation",
			type: "select",
			value: "Intersection",
			options: ["Intersection", "Union", "A minus B", "Symmetric difference"],
		},
		{
			key: "compare",
			label: "Match items",
			type: "select",
			value: "Trim",
			options: ["Exact", "Trim", "Trim and ignore case"],
		},
		{
			key: "format",
			label: "Output format",
			type: "select",
			value: "JSON report",
			options: ["JSON report", "Lines"],
		},
	],
	filename: "set-result.txt",
	smoke: "banana",
	help: "Treat lines as unique set members. Blank lines are ignored; duplicate items count once. Union and differences preserve first-seen order and spelling, preferring list A. Case-insensitive matching uses locale-independent lowercasing.",
	run: (v) => {
		const normalize = (s: string) =>
			v.compare === "Exact"
				? s
				: v.compare === "Trim"
					? s.trim()
					: s.trim().toLowerCase();
		const parse = (text: string) => {
			const map = new Map<string, string>();
			for (const line of text.split(/\r?\n/)) {
				if (!line.trim()) continue;
				const key = normalize(line);
				if (!map.has(key)) map.set(key, line);
			}
			return map;
		};
		const a = parse(v.left),
			b = parse(v.right),
			all = new Map(a);
		for (const [key, value] of b) if (!all.has(key)) all.set(key, value);
		const output = [...all]
			.filter(([key]) =>
				v.operation === "Union" || v.operation === "Intersection"
					? v.operation === "Union" || (a.has(key) && b.has(key))
					: v.operation === "A minus B"
						? a.has(key) && !b.has(key)
						: a.has(key) !== b.has(key),
			)
			.map(([, value]) => value);
		return v.format === "Lines"
			? output.join("\n")
			: print({
					uniqueA: a.size,
					uniqueB: b.size,
					resultCount: output.length,
					items: output,
				});
	},
};
