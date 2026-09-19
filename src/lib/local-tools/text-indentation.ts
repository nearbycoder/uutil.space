import { integer, type LocalTool } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Indented text",
			value: "    function hello() {\n        return 'world';\n    }",
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Remove common indent",
			options: [
				"Remove common indent",
				"Tabs to spaces",
				"Spaces to tabs",
				"Add indent",
			],
		},
		{ key: "width", label: "Tab / indent width", type: "text", value: "4" },
	],
	help: "Normalize only leading ASCII spaces and tabs, preserving whitespace inside each line. Tabs advance to the next tab stop. Remove common indent measures visual columns across nonblank lines, then emits remaining indentation as spaces. Spaces to tabs compresses full tab stops and preserves leftover spaces. Add indent adds one configured level to nonblank lines. CRLF is normalized to LF; trailing newlines are retained. Width: 1–16.",
	filename: "indented-text.txt",
	smoke: "function hello() {",
	preserveColumns: true,
	run: (v) => {
		const width = integer(v.width, 1, 16),
			lines = v.input.replace(/\r\n/g, "\n").split("\n");
		const split = lines.map((line) => {
			const prefix = line.match(/^[ \t]*/)?.[0] ?? "";
			let columns = 0;
			for (const c of prefix)
				columns += c === "\t" ? width - (columns % width) : 1;
			return { line, body: line.slice(prefix.length), columns };
		});
		const nonblank = split.filter((line) => line.body.length > 0);
		const common = nonblank.reduce(
			(min, line) => Math.min(min, line.columns),
			nonblank[0]?.columns ?? 0,
		);
		return split
			.map(({ line, body, columns }) => {
				if (v.operation === "Add indent")
					return body ? " ".repeat(width) + line : line;
				if (v.operation === "Remove common indent")
					return body ? " ".repeat(columns - common) + body : "";
				if (v.operation === "Spaces to tabs")
					return (
						"\t".repeat(Math.floor(columns / width)) +
						" ".repeat(columns % width) +
						body
					);
				return " ".repeat(columns) + body;
			})
			.join("\n");
	},
};
