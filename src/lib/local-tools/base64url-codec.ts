import { type LocalTool, print } from "./types";

const utf8 = () => new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const encode = (bytes: Uint8Array) =>
	btoa(Array.from(bytes, (c) => String.fromCharCode(c)).join(""))
		.replaceAll("+", "-")
		.replaceAll("/", "_");
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text, hex bytes, or Base64URL",
			value: "Hello, developer!",
		},
		{
			key: "mode",
			label: "Operation",
			type: "select",
			value: "Encode",
			options: ["Encode", "Decode"],
		},
		{
			key: "format",
			label: "Plain data format (input for encode, output for decode)",
			type: "select",
			value: "UTF-8 text",
			options: ["UTF-8 text", "Hex bytes"],
		},
		{
			key: "padding",
			label: "Encoded padding",
			type: "select",
			value: "Omit",
			options: ["Omit", "Include"],
		},
	],
	filename: "base64url.json",
	smoke: "SGVsbG8sIGRldmVsb3BlciE",
	help: "Uses the RFC 4648 URL-safe alphabet (- and _), not standard Base64 (+ and /). Decoder accepts canonical padded or unpadded input and rejects nonzero unused bits, internal whitespace and malformed padding. Hex accepts complete byte pairs with optional whitespace, without 0x prefixes. UTF-8 decoding is strict and preserves a leading BOM. Base64URL is encoding, not encryption. Limit: 100,000 decoded bytes.",
	run: (v) => {
		let bytes: Uint8Array, result: string;
		if (v.mode === "Encode") {
			if (v.format === "Hex bytes") {
				const hex = v.input.replace(/\s/g, "");
				if (!/^(?:[0-9a-f]{2})+$/i.test(hex))
					throw new Error("Use complete hexadecimal byte pairs.");
				bytes = Uint8Array.from(hex.match(/../g) ?? [], (x) =>
					Number.parseInt(x, 16),
				);
			} else {
				bytes = new TextEncoder().encode(v.input);
				if (utf8().decode(bytes) !== v.input)
					throw new Error("Input contains invalid Unicode surrogates.");
			}
			result = encode(bytes);
			if (v.padding === "Omit") result = result.replace(/=+$/, "");
		} else {
			const value = v.input.trim(),
				base = value.replace(/=+$/, "");
			if (
				!/^[A-Za-z0-9_-]+={0,2}$/.test(value) ||
				base.length % 4 === 1 ||
				(value.includes("=") && value.length % 4 !== 0)
			)
				throw new Error("Invalid Base64URL alphabet, length, or padding.");
			const padded = base
				.padEnd(Math.ceil(base.length / 4) * 4, "=")
				.replaceAll("-", "+")
				.replaceAll("_", "/");
			bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
			if (
				encode(bytes).replace(/=+$/, "") !== base ||
				(value.includes("=") && encode(bytes) !== value)
			)
				throw new Error("Non-canonical Base64URL padding bits.");
			result =
				v.format === "Hex bytes"
					? Array.from(bytes, (c) => c.toString(16).padStart(2, "0")).join("")
					: utf8().decode(bytes);
		}
		if (bytes.length > 100000) throw new Error("Limit data to 100,000 bytes.");
		return print({
			operation: v.mode,
			format: v.format,
			bytes: bytes.length,
			result,
		});
	},
};
