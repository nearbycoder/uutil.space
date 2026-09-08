import { json, type LocalTool, object, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Credentials JSON or Basic header",
			value: '{"username":"alex","password":"demo"}',
		},
		{
			key: "mode",
			label: "Operation",
			type: "select",
			value: "Encode",
			options: ["Encode", "Decode"],
		},
		{
			key: "charset",
			label: "Character encoding",
			type: "select",
			value: "UTF-8",
			options: ["UTF-8", "Latin-1"],
		},
		{
			key: "password",
			label: "Decoded password",
			type: "select",
			value: "Mask",
			options: ["Mask", "Reveal"],
		},
	],
	filename: "basic-auth.json",
	smoke: "Basic YWxleDpkZW1v",
	help: "Encode accepts JSON with string username and password fields; Decode accepts Basic followed by canonical padded Base64. Usernames cannot contain colons; passwords can. Choose the server's expected encoding explicitly. Basic authentication is reversible, not encryption, and requires HTTPS in transit. No request is sent. Output, saved presets and downloads may contain credentials; use sample values when possible.",
	run: (v) => {
		let username: string, password: string, header: string;
		if (v.mode === "Encode") {
			const data = json(v.input);
			if (
				!object(data) ||
				typeof data.username !== "string" ||
				typeof data.password !== "string"
			)
				throw new Error(
					"Provide username and password strings in a JSON object.",
				);
			username = data.username;
			password = data.password;
			if (username.includes(":"))
				throw new Error("The username cannot contain a colon.");
			const raw = `${username}:${password}`;
			if (
				[...raw].some(
					(c) =>
						c.length === 1 &&
						c.charCodeAt(0) >= 0xd800 &&
						c.charCodeAt(0) <= 0xdfff,
				)
			)
				throw new Error("Credentials contain an invalid Unicode surrogate.");
			let bytes: Uint8Array;
			if (v.charset === "Latin-1") {
				if ([...raw].some((c) => (c.codePointAt(0) ?? 0) > 255))
					throw new Error(
						"Latin-1 only supports characters U+0000 through U+00FF.",
					);
				bytes = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
			} else bytes = new TextEncoder().encode(raw);
			header = `Basic ${btoa(Array.from(bytes, (c) => String.fromCharCode(c)).join(""))}`;
		} else {
			const match = /^Basic +([A-Za-z0-9+/]*={0,2})$/i.exec(v.input.trim());
			if (!match?.[1] || match[1].length % 4 !== 0)
				throw new Error("Provide a padded Base64 Basic authorization header.");
			const binary = atob(match[1]);
			if (btoa(binary) !== match[1])
				throw new Error("Non-canonical Base64 padding bits.");
			const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
			const raw =
				v.charset === "UTF-8"
					? new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
							bytes,
						)
					: binary;
			const colon = raw.indexOf(":");
			if (colon < 0)
				throw new Error(
					"Decoded credentials must contain a username:password separator.",
				);
			username = raw.slice(0, colon);
			password = raw.slice(colon + 1);
			header = `Basic ${match[1]}`;
		}
		if (
			[...(username + password)].some(
				(c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
			)
		)
			throw new Error("Credentials cannot contain control characters.");
		return v.mode === "Encode"
			? print({ header, charset: v.charset })
			: print({
					username,
					password: v.password === "Reveal" ? password : "[redacted]",
					charset: v.charset,
					passwordCharacters: [...password].length,
				});
	},
};
