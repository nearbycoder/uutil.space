import { integer, type LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Source text",
			value:
				"INFO Starting application\nINFO Loading configuration\nWARN Using defaults\nINFO Server ready\nDEBUG Health check\nINFO Request complete",
		},
		{ key: "ranges", label: "Line ranges", type: "text", value: "1-3, 6-" },
		{
			key: "selection",
			label: "Selection",
			type: "select",
			value: "Include",
			options: ["Include", "Exclude"],
		},
		{
			key: "bounds",
			label: "Out-of-bounds ranges",
			type: "select",
			value: "Error",
			options: ["Error", "Clamp"],
		},
		{
			key: "numbers",
			label: "Original line numbers",
			type: "select",
			value: "Include",
			options: ["Include", "Omit"],
		},
	],
	filename: "selected-lines.txt",
	smoke: "1: INFO Starting application",
	help: "Ranges are inclusive and 1-based: 2, 4-8, 12-. Overlaps and duplicates are merged; output always follows original source order. Exclude returns the complement. CRLF/CR is normalized to LF; one terminal newline is treated as a terminator, not an extra blank line. Interior blank lines and whitespace are preserved. Clamp clips ranges to existing lines. Limit: 50,000 lines and 1,000 ranges.",
	run: (v) => {
		let input = v.input.replace(/\r\n?/g, "\n");
		if (input.endsWith("\n")) input = input.slice(0, -1);
		const lines = input.split("\n"),
			parts = v.ranges.split(",").map((p) => p.trim());
		if (lines.length > 50000 || parts.length > 1000)
			throw new Error("Limit to 50,000 lines and 1,000 ranges.");
		const delta = new Int32Array(lines.length + 1);
		for (const part of parts) {
			const m = /^(\d+)(?:\s*-\s*(\d*))?$/.exec(part);
			if (!m) throw new Error("Use ranges such as 1-3, 5, 9-.");
			const start = integer(m[1], 1, Number.MAX_SAFE_INTEGER),
				end =
					m[2] === undefined
						? start
						: m[2] === ""
							? lines.length
							: integer(m[2], 1, Number.MAX_SAFE_INTEGER);
			if (end < start && m[2] !== "")
				throw new Error("Range end must not be before its start.");
			if (v.bounds === "Error" && (start > lines.length || end > lines.length))
				throw new Error(`A range exceeds the ${lines.length} source lines.`);
			if (start > lines.length) continue;
			delta[start - 1]++;
			delta[Math.min(end, lines.length)]--;
		}
		let active = 0;
		const result: string[] = [];
		lines.forEach((line, index) => {
			active += delta[index];
			if (active > 0 === (v.selection === "Include"))
				result.push(
					v.numbers === "Include" ? `${String(index + 1)}: ${line}` : line,
				);
		});
		return result.join("\n");
	},
};
