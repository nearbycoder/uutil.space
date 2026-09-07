import { type LocalTool, print } from "./types";

type CookieResult = {
	line: number;
	error?: string;
	name?: string;
	value?: string;
	valueLength?: number;
	attributes?: Record<string, string | boolean>;
	notes?: string[];
};
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Set-Cookie headers (one per line)",
			value:
				"Set-Cookie: __Host-session=demo-token; Path=/; Secure; HttpOnly; SameSite=Lax\nSet-Cookie: preference=dark; Max-Age=86400; SameSite=None",
		},
		{
			key: "values",
			label: "Cookie values in output",
			type: "select",
			value: "Mask",
			options: ["Mask", "Reveal"],
		},
	],
	filename: "cookie-inspection.json",
	smoke: "SameSite=None requires Secure",
	help: "Inspect pasted response headers without reading or setting browser cookies. Use one Set-Cookie header per line; combined comma-separated headers are not supported. Values are masked by default. Notes are guidance, not a guarantee a browser will accept a cookie; domain matching, public suffixes, request context and browser policies are not evaluated.",
	run: (v) => {
		const lines = v.input.split(/\r?\n/);
		if (lines.length > 100)
			throw new Error("Inspect at most 100 header lines.");
		const cookies = lines.flatMap<CookieResult>((line, index) => {
			if (!line.trim()) return [];
			const [pair, ...segments] = line
					.replace(/^\s*set-cookie:\s*/i, "")
					.trim()
					.split(";"),
				equals = pair.indexOf("=");
			if (equals < 1)
				return [
					{ line: index + 1, error: "Expected a cookie name=value pair." },
				];
			const name = pair.slice(0, equals).trim(),
				raw = pair.slice(equals + 1).trim(),
				value =
					raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
			if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name))
				return [
					{
						line: index + 1,
						error: "Cookie name contains unsupported characters.",
					},
				];
			const attributes: Record<string, string | boolean> = Object.create(null),
				notes: string[] = [];
			for (const segment of segments) {
				if (!segment.trim()) continue;
				const i = segment.indexOf("="),
					key = (i < 0 ? segment : segment.slice(0, i)).trim().toLowerCase(),
					val = i < 0 ? true : segment.slice(i + 1).trim();
				if (Object.hasOwn(attributes, key))
					notes.push(`Duplicate ${key} attribute; displaying the last value.`);
				attributes[key] = val;
			}
			const secure = Object.hasOwn(attributes, "secure"),
				httpOnly = Object.hasOwn(attributes, "httponly"),
				sameSite = String(attributes.samesite ?? "").toLowerCase();
			if (!secure)
				notes.push("Secure is absent; this cookie may be sent over HTTP.");
			if (!httpOnly)
				notes.push(
					"HttpOnly is absent; JavaScript access is not restricted by this attribute.",
				);
			if (sameSite === "none" && !secure)
				notes.push("SameSite=None requires Secure.");
			if (sameSite && !["lax", "strict", "none"].includes(sameSite))
				notes.push("Unrecognized SameSite value.");
			if (Object.hasOwn(attributes, "partitioned") && !secure)
				notes.push("Partitioned cookies require Secure.");
			if (name.startsWith("__Secure-") && !secure)
				notes.push("__Secure- prefix requires Secure and a secure origin.");
			if (
				name.startsWith("__Host-") &&
				(!secure ||
					attributes.path !== "/" ||
					Object.hasOwn(attributes, "domain"))
			)
				notes.push(
					"__Host- prefix requires Secure, Path=/ and no Domain attribute.",
				);
			if (
				(name.startsWith("__Http-") || name.startsWith("__Host-Http-")) &&
				(!secure || !httpOnly)
			)
				notes.push(
					"__Http- prefixes require Secure and HttpOnly in supporting browsers.",
				);
			if (Object.hasOwn(attributes, "max-age")) {
				if (!/^-?\d+$/.test(String(attributes["max-age"])))
					notes.push("Max-Age must be an integer number of seconds.");
				else
					notes.push(
						BigInt(String(attributes["max-age"])) <= 0n
							? "Max-Age requests immediate expiry."
							: "Max-Age takes precedence over Expires.",
					);
			}
			if (
				Object.hasOwn(attributes, "expires") &&
				!Number.isFinite(Date.parse(String(attributes.expires)))
			)
				notes.push("Expires could not be parsed as a date.");
			if (
				[...value].some((c) => {
					const n = c.charCodeAt(0);
					return n < 0x21 || n > 0x7e || [0x22, 0x2c, 0x3b, 0x5c].includes(n);
				})
			)
				notes.push(
					"Value contains characters outside the RFC 6265 cookie-octet range; encode the value or check for combined headers.",
				);
			return [
				{
					line: index + 1,
					name,
					value: v.values === "Reveal" ? value : "[hidden]",
					valueLength: value.length,
					attributes,
					notes,
				},
			];
		});
		return print({ count: cookies.length, cookies });
	},
};
