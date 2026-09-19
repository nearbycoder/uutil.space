import { integer, type LocalTool } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text lines",
			value: "first step\n\nsecond step\nthird step",
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Add numbers",
			options: ["Add numbers", "Remove numbers"],
		},
		{ key: "start", label: "Starting number", type: "text", value: "1" },
		{ key: "step", label: "Increment", type: "text", value: "1" },
		{ key: "separator", label: "Number separator", type: "text", value: ". " },
		{
			key: "padding",
			label: "Number padding",
			type: "select",
			value: "None",
			options: ["None", "Spaces", "Zeros"],
		},
		{
			key: "blank",
			label: "Blank lines",
			type: "select",
			value: "Skip",
			options: ["Skip", "Number"],
		},
	],
	help: "Number lines with custom start, positive increment, separator and aligned padding. Skipped blank lines do not advance the counter. Remove mode strips only a leading nonnegative integer followed by the exact separator (with optional space padding). It leaves unmatched lines untouched. CRLF becomes LF; a final newline is preserved without adding a phantom line. At most 10,000 lines; start and increment are 0–1,000,000 and 1–1,000,000.",
	filename: "numbered-lines.txt",
	smoke: "1. first step",
	preserveColumns: true,
	run: (v) => {
		if (v.separator.length > 1000)
			throw new Error("Keep the separator at most 1,000 characters long.");
		const text = v.input.replace(/\r\n/g, "\n"),
			trailing = text.endsWith("\n");
		const lines = (trailing ? text.slice(0, -1) : text).split("\n");
		if (
			lines.length > 10000 ||
			v.separator.includes("\n") ||
			v.separator.includes("\r")
		)
			throw new Error("Use at most 10,000 lines and a single-line separator.");
		const start = integer(v.start, 0, 1000000),
			step = integer(v.step, 1, 1000000);
		const count = lines.filter(
			(line) => v.blank === "Number" || line.trim(),
		).length;
		const width = String(start + Math.max(0, count - 1) * step).length;
		if (
			v.operation === "Add numbers" &&
			text.length + count * (width + v.separator.length) > 1000000
		)
			throw new Error(
				"Numbered output exceeds 1 MB; shorten the separator or reduce lines.",
			);
		let index = 0;
		const result = lines.map((line) => {
			if (v.operation === "Remove numbers") {
				const match = line.match(/^ *\d+/);
				return match && line.slice(match[0].length).startsWith(v.separator)
					? line.slice(match[0].length + v.separator.length)
					: line;
			}
			if (v.blank === "Skip" && !line.trim()) return line;
			const label = String(start + step * index++);
			return (
				(v.padding === "None"
					? label
					: label.padStart(width, v.padding === "Zeros" ? "0" : " ")) +
				v.separator +
				line
			);
		});
		return result.join("\n") + (trailing ? "\n" : "");
	},
};
