import { integer, type LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text to wrap",
			value:
				"Developer tools should feel quick, predictable, and comfortable on every screen.\n\nKeep the important work close and the distractions out of the way.",
		},
		{
			key: "width",
			label: "Maximum line width (including indent)",
			type: "text",
			value: "40",
		},
		{ key: "indent", label: "Indent spaces", type: "text", value: "0" },
		{
			key: "mode",
			label: "Paragraph handling",
			type: "select",
			value: "Reflow paragraphs",
			options: ["Reflow paragraphs", "Wrap each line", "Single paragraph"],
		},
		{
			key: "words",
			label: "Long words",
			type: "select",
			value: "Preserve",
			options: ["Preserve", "Break"],
		},
	],
	filename: "wrapped-text.txt",
	smoke: "Developer tools should",
	help: "Normalizes whitespace between words to one space and output line endings to LF. Reflow paragraphs collapses blank-line runs to one separator; Wrap each line preserves input line boundaries; Single paragraph joins everything. Width counts Unicode code points, not grapheme clusters or terminal display columns. Break can split combining sequences; Preserve allows a long word to exceed the width. This is plain-text formatting, not Markdown-aware.",
	run: (v) => {
		const width = integer(v.width, 10, 240),
			indent = integer(v.indent, 0, 40),
			available = width - indent;
		if (available < 1)
			throw new Error("Indent must be smaller than the line width.");
		const input = v.input.replace(/\r\n?/g, "\n"),
			parts =
				v.mode === "Wrap each line"
					? input.split("\n")
					: v.mode === "Single paragraph"
						? [input]
						: input.trim().split(/\n[ \t]*\n+/);
		const wrap = (part: string) => {
			const words = part.trim().split(/\s+/).filter(Boolean),
				lines: string[] = [];
			let line = "";
			const flush = () => {
				if (line) {
					lines.push(" ".repeat(indent) + line);
					line = "";
				}
			};
			for (const word of words) {
				const chars = [...word];
				if (line && [...line].length + 1 + chars.length > available) flush();
				if (v.words === "Break" && chars.length > available) {
					flush();
					let offset = 0;
					while (chars.length - offset > available) {
						lines.push(
							" ".repeat(indent) +
								chars.slice(offset, offset + available).join(""),
						);
						offset += available;
					}
					line = chars.slice(offset).join("");
				} else line = line ? `${line} ${word}` : word;
			}
			flush();
			return lines.join("\n");
		};
		return parts.map(wrap).join(v.mode === "Wrap each line" ? "\n" : "\n\n");
	},
};
