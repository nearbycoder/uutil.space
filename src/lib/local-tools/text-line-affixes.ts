import { integer, type LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Text lines", value: "alpha\nbeta\ngamma" },
		{
			key: "prefix",
			label: "Prefix",
			type: "text",
			value: "{n}. ",
			optional: true,
		},
		{ key: "suffix", label: "Suffix", type: "text", value: "", optional: true },
		{
			key: "mode",
			label: "Operation",
			type: "select",
			value: "Add",
			options: ["Add", "Remove once"],
		},
		{
			key: "blank",
			label: "Whitespace-only lines",
			type: "select",
			value: "Leave unchanged",
			options: ["Leave unchanged", "Process"],
		},
		{ key: "start", label: "First sequence number", type: "text", value: "1" },
		{
			key: "width",
			label: "Number zero-padding width",
			type: "text",
			value: "1",
		},
		{
			key: "mismatch",
			label: "Removal when affixes do not match",
			type: "select",
			value: "Leave unchanged",
			options: ["Leave unchanged", "Error"],
		},
	],
	filename: "affixed-lines.txt",
	smoke: "1. alpha",
	help: "Adds or removes exact affixes on each processed line. {n} expands to the sequence number in either affix; only processed lines advance the counter. Removal requires both affixes to match and never overlaps them. Affixes must stay on one line. Existing line endings and the final newline are preserved, including mixed CRLF/LF. Skipped whitespace-only lines remain untouched. Up to 50,000 lines, start 0–1,000,000 and zero-padding 1–12.",
	run: (v) => {
		let number = integer(v.start, 0, 1000000);
		const width = integer(v.width, 1, 12);
		if (/[\r\n]/.test(v.prefix + v.suffix))
			throw new Error("Prefix and suffix must be single-line text.");
		const parts = v.input.split(/(\r\n|\r|\n)/);
		if (Math.ceil(parts.length / 2) > 50000)
			throw new Error("Use at most 50,000 lines.");
		let length = v.input.length;
		for (let i = 0; i < parts.length; i += 2) {
			if (i === parts.length - 1 && parts[i] === "" && i > 0) continue;
			const line = parts[i];
			if (v.blank === "Leave unchanged" && !line.trim()) continue;
			const n = String(number++).padStart(width, "0"),
				prefix = v.prefix.replaceAll("{n}", n),
				suffix = v.suffix.replaceAll("{n}", n);
			if (v.mode === "Add") parts[i] = prefix + line + suffix;
			else if (
				line.startsWith(prefix) &&
				line.endsWith(suffix) &&
				line.length >= prefix.length + suffix.length
			)
				parts[i] = line.slice(prefix.length, line.length - suffix.length);
			else if (v.mismatch === "Error")
				throw new Error(`Affixes do not match line ${i / 2 + 1}.`);
			length += parts[i].length - line.length;
			if (length > 2_000_000) throw new Error("Affixed output exceeds 2 MB.");
		}
		return parts.join("");
	},
};
