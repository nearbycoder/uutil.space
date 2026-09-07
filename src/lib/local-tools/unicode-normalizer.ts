import { type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Unicode text", value: "Cafe\u0301 — ﬁle ①" },
		{
			key: "form",
			label: "Normalization form",
			type: "select",
			value: "NFC",
			options: ["NFC", "NFD", "NFKC", "NFKD"],
		},
		{
			key: "format",
			label: "Output format",
			type: "select",
			value: "Analysis JSON",
			options: ["Analysis JSON", "Normalized text"],
		},
	],
	filename: "normalized-text.txt",
	smoke: "Café",
	help: "NFC/NFD use canonical equivalence; NFKC/NFKD additionally fold compatibility characters such as ligatures and circled digits, which can change meaning or appearance. Analysis includes up to 256 code points from each version. Normalization does not remove look-alike characters or guarantee identifier security.",
	run: (v) => {
		const normalized = v.input.normalize(v.form);
		if (v.format === "Normalized text") return normalized;
		const inspect = (text: string) => {
			const chars = [...text];
			return {
				codePoints: chars.length,
				utf16Units: text.length,
				utf8Bytes: new TextEncoder().encode(text).length,
				preview: chars
					.slice(0, 256)
					.map(
						(c) =>
							`U+${c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`,
					),
				omittedCodePoints: Math.max(0, chars.length - 256),
			};
		};
		return print({
			form: v.form,
			changed: normalized !== v.input,
			normalized,
			before: inspect(v.input),
			after: inspect(normalized),
		});
	},
};
