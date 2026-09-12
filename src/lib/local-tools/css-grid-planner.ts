import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Container outer width (px)",
			type: "text",
			value: "1200",
		},
		{
			key: "mode",
			label: "Column strategy",
			type: "select",
			value: "Auto-fit",
			options: ["Fixed columns", "Auto-fit", "Auto-fill"],
		},
		{ key: "columns", label: "Fixed column count", type: "text", value: "3" },
		{
			key: "minimum",
			label: "Responsive minimum column width (px)",
			type: "text",
			value: "240",
		},
		{
			key: "padding",
			label: "Container padding on each side (px)",
			type: "text",
			value: "24",
		},
		{ key: "gap", label: "Row and column gap (px)", type: "text", value: "24" },
		{ key: "height", label: "Row height (px)", type: "text", value: "160" },
		{ key: "items", label: "Number of items", type: "text", value: "8" },
	],
	filename: "grid-plan.json",
	smoke: '"columns": 4',
	help: "Generates container CSS declarations for a border-box grid with equal columns and fixed row heights. The entered width is for the estimate; generated width:100% remains responsive. Auto-fit collapses unused columns; Auto-fill reserves them. Responsive minimum uses min(100%, minimum) to fit narrow containers. Assumes normal row auto-placement, no spans, margins, borders or intrinsic-content constraints; apply childCss to items. Shows coordinates for the first 50 items. Limits: width 100–5,000px, fixed columns 1–24, minimum 40–2,000px, padding 0–1,000px, gap 0–200px, row height 1–1,000px, and 0–500 items.",
	run: (v) => {
		const width = integer(v.input, 100, 5000),
			fixed = integer(v.columns, 1, 24),
			minimum = integer(v.minimum, 40, 2000),
			padding = integer(v.padding, 0, 1000),
			gap = integer(v.gap, 0, 200),
			height = integer(v.height, 1, 1000),
			items = integer(v.items, 0, 500),
			inner = width - padding * 2;
		if (inner <= 0)
			throw new Error("Padding must leave positive content width.");
		const capacity =
				v.mode === "Fixed columns"
					? fixed
					: Math.max(
							1,
							Math.floor((inner + gap) / (Math.min(inner, minimum) + gap)),
						),
			columns = v.mode === "Auto-fit" ? Math.min(items, capacity) : capacity;
		if (columns > 0 && (columns - 1) * gap >= inner)
			throw new Error(
				"Column gaps consume all available width; reduce gaps or columns.",
			);
		const trackWidth = columns ? (inner - (columns - 1) * gap) / columns : null,
			rows = items ? Math.ceil(items / columns) : 0,
			totalHeight = padding * 2 + rows * height + Math.max(0, rows - 1) * gap;
		const template =
			v.mode === "Fixed columns"
				? `repeat(${fixed}, minmax(0, 1fr))`
				: `repeat(${v.mode === "Auto-fit" ? "auto-fit" : "auto-fill"}, minmax(min(100%, ${minimum}px), 1fr))`;
		return print({
			containerWidth: width,
			contentWidth: inner,
			capacity,
			columns,
			rows,
			items,
			trackWidth,
			rowHeight: height,
			gap,
			padding,
			totalHeight,
			emptyCellsInLastRow: rows ? rows * columns - items : 0,
			css: `display: grid;\nbox-sizing: border-box;\nwidth: 100%;\npadding: ${padding}px;\ngap: ${gap}px;\ngrid-template-columns: ${template};\ngrid-auto-rows: ${height}px;`,
			childCss: "min-width: 0;\nmin-height: 0;",
			positionsPreview: Array.from({ length: Math.min(items, 50) }, (_, i) => ({
				item: i + 1,
				row: Math.floor(i / columns) + 1,
				column: (i % columns) + 1,
				x: padding + (i % columns) * ((trackWidth ?? 0) + gap),
				y: padding + Math.floor(i / columns) * (height + gap),
				width: trackWidth,
				height,
			})),
			positionsTruncated: items > 50,
		});
	},
};
