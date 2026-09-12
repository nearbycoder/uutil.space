import type { LocalTool } from "./types";

function cells(line: string) {
	const text = line.trim(),
		out: string[] = [];
	let cell = "";
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "\\" && i + 1 < text.length) {
			cell += text[i] + text[++i];
		} else if (text[i] === "|") {
			out.push(cell.trim());
			cell = "";
		} else cell += text[i];
	}
	out.push(cell.trim());
	if (text.startsWith("|")) out.shift();
	if (out.at(-1) === "" && text.endsWith("|")) out.pop();
	return out;
}
export const tool: LocalTool = {
	preserveColumns: true,
	fields: [
		{
			key: "input",
			label: "Markdown pipe table",
			value:
				"| Name | Count |\n| :--- | ---: |\n| Alex | 12 |\n| Samantha | 3 |",
		},
		{
			key: "alignment",
			label: "Column alignment",
			type: "select",
			value: "Preserve",
			options: ["Preserve", "Left", "Center", "Right"],
		},
		{
			key: "ragged",
			label: "Short data rows",
			type: "select",
			value: "Pad empty cells",
			options: ["Pad empty cells", "Error"],
		},
	],
	filename: "formatted-table.md",
	smoke: "Samantha",
	help: "Formats one standalone pipe table, not an entire Markdown document. Requires a header and delimiter row with at least three hyphens per cell. Outer pipes are optional; escaped pipes remain part of cells, including inline code. Preserves inline Markdown without rendering or sanitizing it. Short rows can be padded; extra cells are rejected to avoid data loss. Source widths count Unicode code points, not rendered glyph widths. Up to 1,000 rows, 100 columns, and 1 MB padded output.",
	run: (v) => {
		const lines = v.input.trim().split(/\r\n|\n|\r/);
		if (lines.length < 2 || lines.length > 1002 || lines.some((l) => !l.trim()))
			throw new Error(
				"Provide one table with a header, delimiter and at most 1,000 data rows; no blank rows.",
			);
		const [head, delim, ...rows] = lines.map(cells);
		if (
			!head.length ||
			head.length > 100 ||
			delim.length !== head.length ||
			delim.some((c) => !/^:?-{3,}:?$/.test(c))
		)
			throw new Error(
				"Header and delimiter must have matching columns; use --- with optional alignment colons.",
			);
		for (const row of rows) {
			if (
				row.length > head.length ||
				(v.ragged === "Error" && row.length !== head.length)
			)
				throw new Error("A data row has an unexpected number of cells.");
			while (row.length < head.length) row.push("");
		}
		const align = delim.map((c) =>
			v.alignment !== "Preserve"
				? v.alignment
				: c.startsWith(":") && c.endsWith(":")
					? "Center"
					: c.endsWith(":")
						? "Right"
						: c.startsWith(":")
							? "Left"
							: "Default",
		);
		const widths = head.map((_, i) =>
			Math.max(
				3 + (align[i] === "Center" ? 2 : align[i] === "Default" ? 0 : 1),
				...[head, ...rows].map((r) => Array.from(r[i]).length),
			),
		);
		if (
			(widths.reduce((a, b) => a + b, 0) + head.length * 3 + 1) *
				(rows.length + 2) >
			1000000
		)
			throw new Error("Padded table exceeds 1 MB; reduce long cells or rows.");
		const format = (row: string[]) =>
			`| ${row
				.map((c, i) => {
					const n = widths[i] - Array.from(c).length;
					return align[i] === "Right"
						? " ".repeat(n) + c
						: align[i] === "Center"
							? " ".repeat(Math.floor(n / 2)) + c + " ".repeat(Math.ceil(n / 2))
							: c + " ".repeat(n);
				})
				.join(" | ")} |`;
		const separator = align.map((a, i) => {
			const left = a === "Left" || a === "Center",
				right = a === "Right" || a === "Center";
			return (
				(left ? ":" : "") +
				"-".repeat(widths[i] - Number(left) - Number(right)) +
				(right ? ":" : "")
			);
		});
		return [
			format(head),
			`| ${separator.join(" | ")} |`,
			...rows.map(format),
		].join("\n");
	},
};
