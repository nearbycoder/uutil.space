import { integer, json, type LocalTool } from "./types";
export const tool: LocalTool = {
	preserveColumns: true,
	fields: [
		{
			key: "input",
			label: "Rows (JSON matrix)",
			value: '[["Name","Count","Ready"],["Alex",12,true],["Samantha",3,false]]',
		},
		{
			key: "align",
			label: "Column alignments (JSON array)",
			value: '["left","right","center"]',
			help: "Use left, right or center. Empty array defaults all columns to left.",
		},
		{
			key: "style",
			label: "Table style",
			type: "select",
			value: "ASCII borders",
			options: ["ASCII borders", "Plain"],
		},
		{
			key: "header",
			label: "First row is a header",
			type: "select",
			value: "Yes",
			options: ["Yes", "No"],
		},
		{ key: "gap", label: "Plain column gap", type: "text", value: "2" },
		{
			key: "ragged",
			label: "Short rows",
			type: "select",
			value: "Pad empty cells",
			options: ["Pad empty cells", "Error"],
		},
	],
	filename: "aligned-table.txt",
	smoke: "Samantha",
	help: "Formats 1–1,000 rows with up to 50 columns. Cells must be JSON strings, numbers, booleans or null (shown as empty). Control characters are escaped so each cell stays on one line. Alignment counts Unicode code points, not terminal display columns; wide or combining glyphs may not visually line up. Short rows may be padded; the widest row defines column count. Plain gap is 1–12 spaces. Output is capped at 1 MB before padding is allocated.",
	run: (v) => {
		const data = json(v.input),
			alignment = json(v.align),
			gap = integer(v.gap, 1, 12);
		if (
			!Array.isArray(data) ||
			!data.length ||
			data.length > 1000 ||
			data.some((r) => !Array.isArray(r) || r.length > 50)
		)
			throw new Error(
				"Provide 1–1,000 JSON row arrays with at most 50 columns.",
			);
		const count = Math.max(...data.map((r) => r.length));
		if (!count) throw new Error("At least one column is required.");
		if (
			!Array.isArray(alignment) ||
			alignment.length > count ||
			alignment.some((a) => !["left", "right", "center"].includes(a))
		)
			throw new Error(
				"Alignments must be left, right or center, with no more entries than columns.",
			);
		const rows = data.map((row) => {
			if (v.ragged === "Error" && row.length !== count)
				throw new Error("Rows must have equal column counts.");
			return Array.from({ length: count }, (_, i) => {
				const c = row[i];
				if (c == null) return "";
				if (typeof c === "object")
					throw new Error("Cells must be scalar JSON values.");
				const value = String(c);
				return Array.from(value)
					.map((ch) =>
						ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127
							? `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`
							: ch,
					)
					.join("");
			});
		});
		const widths = Array.from({ length: count }, (_, i) =>
			Math.max(1, ...rows.map((r) => Array.from(r[i]).length)),
		);
		const lineWidth =
			widths.reduce((a, b) => a + b, 0) + count * 3 + gap * count + 4;
		if (lineWidth * (rows.length + 3) > 1000000)
			throw new Error("Padded table exceeds 1 MB.");
		const border = `+${widths.map((w) => "-".repeat(w + 2)).join("+")}+`;
		const lines: string[] = [];
		if (v.style === "ASCII borders") lines.push(border);
		rows.forEach((row, r) => {
			const cells = row.map((c, i) => {
				const n = widths[i] - Array.from(c).length,
					a = alignment[i] ?? "left";
				return a === "right"
					? " ".repeat(n) + c
					: a === "center"
						? " ".repeat(Math.floor(n / 2)) + c + " ".repeat(Math.ceil(n / 2))
						: c + " ".repeat(n);
			});
			lines.push(
				v.style === "ASCII borders"
					? `| ${cells.join(" | ")} |`
					: cells.join(" ".repeat(gap)).trimEnd(),
			);
			if (r === 0 && v.header === "Yes")
				lines.push(
					v.style === "ASCII borders"
						? border
						: widths.map((w) => "-".repeat(w)).join(" ".repeat(gap)),
				);
		});
		if (v.style === "ASCII borders") lines.push(border);
		return lines.join("\n");
	},
};
