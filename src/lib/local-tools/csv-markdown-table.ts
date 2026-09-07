import { csvField, delimiterField, parseCsv } from "./csv";
import { integer, type LocalTool } from "./types";
export function markdownCell(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&")
		.replace(/\r?\n/g, "<br>");
}
export const tool: LocalTool = {
	fields: [
		csvField,
		delimiterField,
		{
			key: "alignment",
			label: "Column alignment",
			type: "select",
			value: "Left",
			options: ["Left", "Center", "Right"],
		},
		{ key: "limit", label: "Maximum data rows", type: "text", value: "50" },
	],
	filename: "table.md",
	smoke: "| name | team | score |",
	help: "Build GitHub-flavored Markdown tables with escaped pipes, Markdown punctuation and raw HTML. Multiline cells use <br>. A truncation note is included if your row limit omits data. Alignment applies to every column.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			limit = integer(v.limit, 1, 5000),
			line = (cells: string[]) => `| ${cells.map(markdownCell).join(" | ")} |`;
		const marker =
			v.alignment === "Center"
				? ":---:"
				: v.alignment === "Right"
					? "---:"
					: ":---";
		return (
			[
				line(headers),
				`| ${headers.map(() => marker).join(" | ")} |`,
				...rows.slice(0, limit).map(line),
			].join("\n") +
			(rows.length > limit
				? `\n\n_${rows.length - limit} additional rows omitted._`
				: "")
		);
	},
};
