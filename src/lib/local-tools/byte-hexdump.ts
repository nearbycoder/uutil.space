import { integer, type LocalTool } from "./types";
export const tool: LocalTool = {
	preserveColumns: true,
	fields: [
		{
			key: "input",
			label: "Text or hex bytes",
			value: "Hello, developer!\nBytes tell the whole story.",
		},
		{
			key: "format",
			label: "Input format",
			type: "select",
			value: "UTF-8 text",
			options: ["UTF-8 text", "Hex bytes"],
		},
		{
			key: "columns",
			label: "Bytes per row",
			type: "select",
			value: "16",
			options: ["8", "16", "32"],
		},
		{
			key: "offset",
			label: "Starting byte offset (decimal or 0x hex)",
			type: "text",
			value: "0",
		},
		{
			key: "radix",
			label: "Offset display",
			type: "select",
			value: "Hexadecimal",
			options: ["Hexadecimal", "Decimal"],
		},
		{
			key: "case",
			label: "Hex letter case",
			type: "select",
			value: "Lowercase",
			options: ["Lowercase", "Uppercase"],
		},
		{
			key: "ascii",
			label: "ASCII gutter",
			type: "select",
			value: "Include",
			options: ["Include", "Omit"],
		},
	],
	filename: "hexdump.txt",
	smoke: "48 65 6c 6c 6f",
	help: "Creates a text hexdump, not a binary download. UTF-8 input preserves line endings and rejects invalid surrogates. Hex accepts complete pairs separated by whitespace, without 0x prefixes. Offsets are byte positions; the final line shows the exclusive end offset. The gutter displays bytes 0x20–0x7E and dots for all others, so multibyte characters appear as multiple dots. Limit: 100,000 bytes; starting offset 0–0xFFFFFFFF.",
	run: (v) => {
		let bytes: Uint8Array;
		if (v.format === "Hex bytes") {
			const hex = v.input.replace(/\s/g, "");
			if (!/^(?:[0-9a-f]{2})+$/i.test(hex))
				throw new Error("Use complete hexadecimal byte pairs.");
			bytes = Uint8Array.from(hex.match(/../g) ?? [], (x) =>
				Number.parseInt(x, 16),
			);
		} else {
			bytes = new TextEncoder().encode(v.input);
			if (
				new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
					bytes,
				) !== v.input
			)
				throw new Error("Input contains invalid Unicode surrogates.");
		}
		if (bytes.length > 100000) throw new Error("Limit input to 100,000 bytes.");
		if (!/^(?:\d+|0x[0-9a-f]+)$/i.test(v.offset.trim()))
			throw new Error("Use a decimal or 0x hexadecimal starting offset.");
		const start = integer(v.offset, 0, 0xffffffff),
			columns = integer(v.columns, 8, 32),
			radix = v.radix === "Hexadecimal" ? 16 : 10;
		const letterCase = (s: string) =>
			v.case === "Uppercase" ? s.toUpperCase() : s;
		const offsetWidth = Math.max(
				8,
				(start + bytes.length).toString(radix).length,
			),
			address = (n: number) =>
				letterCase(n.toString(radix).padStart(offsetWidth, "0"));
		const lines: string[] = [];
		for (let i = 0; i < bytes.length; i += columns) {
			const row = bytes.slice(i, i + columns),
				hex = Array.from(row, (n) =>
					letterCase(n.toString(16).padStart(2, "0")),
				).join(" ");
			const gutter = Array.from(row, (n) =>
				n >= 32 && n <= 126 ? String.fromCharCode(n) : ".",
			).join("");
			lines.push(
				`${address(start + i)}  ${v.ascii === "Include" ? `${hex.padEnd(columns * 3 - 1, " ")}  |${gutter}|` : hex}`,
			);
		}
		lines.push(address(start + bytes.length));
		return lines.join("\n");
	},
};
