import { type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text to clean",
			value: "Hello\u200B world\u00A0!\uFEFF",
		},
		{
			key: "hidden",
			label: "Zero-width spaces, word joiners, BOM and soft hyphens",
			type: "select",
			value: "Remove",
			options: ["Remove", "Preserve"],
		},
		{
			key: "spaces",
			label: "Special spacing characters",
			type: "select",
			value: "Convert to ordinary spaces",
			options: ["Convert to ordinary spaces", "Preserve"],
		},
		{
			key: "bidi",
			label: "Bidirectional text controls",
			type: "select",
			value: "Preserve",
			options: ["Preserve", "Remove"],
		},
		{
			key: "lines",
			label: "Line endings",
			type: "select",
			value: "Preserve",
			options: ["Preserve", "LF", "CRLF"],
		},
		{
			key: "format",
			label: "Output format",
			type: "select",
			value: "Change report",
			options: ["Change report", "Cleaned text"],
		},
	],
	filename: "cleaned-text.txt",
	smoke: "cleaned",
	help: "Inspect or remove invisible formatting with explicit controls. ZWJ and ZWNJ are always retained because emoji and many writing systems need them. Removing bidi controls can change how legitimate text reads. The report lists detected characters, including preserved ones; this is not a complete security sanitizer.",
	run: (v) => {
		const found = new Map<
			string,
			{ codePoint: string; count: number; action: string }
		>();
		const cleaned = v.input.replace(
			/[\u00AD\u200B\u2060\uFEFF\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
			(char) => {
				const code = char.charCodeAt(0),
					hidden = [0xad, 0x200b, 0x2060, 0xfeff].includes(code),
					space =
						code === 0xa0 ||
						code === 0x1680 ||
						(code >= 0x2000 && code <= 0x200a) ||
						[0x202f, 0x205f, 0x3000].includes(code);
				const next = hidden
					? v.hidden === "Remove"
						? ""
						: char
					: space
						? v.spaces === "Preserve"
							? char
							: " "
						: v.bidi === "Remove"
							? ""
							: char;
				const key = `U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
					entry = found.get(key);
				if (entry) entry.count++;
				else
					found.set(key, {
						codePoint: key,
						count: 1,
						action:
							next === char
								? "preserved"
								: next === ""
									? "removed"
									: "replaced with space",
					});
				return next;
			},
		);
		const output =
			v.lines === "Preserve"
				? cleaned
				: cleaned.replace(/\r\n|\r|\n/g, v.lines === "LF" ? "\n" : "\r\n");
		return v.format === "Cleaned text"
			? output
			: print({
					cleaned: output,
					changed: output !== v.input,
					lineEndingsChanged: output !== cleaned,
					characters: [...found.values()],
				});
	},
};
