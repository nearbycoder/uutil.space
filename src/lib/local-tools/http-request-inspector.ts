import { type LocalTool, print } from "./types";

const token = (s: string) =>
	s.length > 0 &&
	[...s].every(
		(c) => /[a-z0-9!#$%&'*+.^_|~-]/i.test(c) || c.charCodeAt(0) === 96,
	);
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Raw HTTP request",
			value:
				'POST /api/users?notify=true HTTP/1.1\nHost: example.com\nContent-Type: application/json\nAuthorization: Bearer demo-token\nContent-Length: 15\n\n{"name":"Alex"}',
		},
		{
			key: "scheme",
			label: "Origin-form scheme",
			type: "select",
			value: "https",
			options: ["https", "http"],
		},
		{
			key: "secrets",
			label: "Sensitive headers",
			type: "select",
			value: "Mask",
			options: ["Mask", "Reveal"],
		},
		{
			key: "body",
			label: "Body output",
			type: "select",
			value: "Summary only",
			options: ["Summary only", "Include body"],
		},
	],
	filename: "http-request.json",
	smoke: '"method": "POST"',
	help: "Parses pasted HTTP/1.0 and HTTP/1.1 text locally; never sends a request. Header duplicates and query order are preserved. Authorization, Proxy-Authorization, Cookie, Set-Cookie and X-API-Key are masked by default; URLs and other headers can still contain secrets. Body byte counts reflect pasted UTF-8 text, not original wire bytes. Chunked and compressed bodies are not decoded. Warnings are diagnostic, not a complete security audit.",
	run: (v) => {
		const normalized = v.input.replaceAll("\r\n", "\n");
		const split = normalized.indexOf("\n\n"),
			head = split < 0 ? normalized : normalized.slice(0, split),
			body = split < 0 ? "" : normalized.slice(split + 2);
		const lines = head.split("\n"),
			start = lines.shift() ?? "",
			match = /^([^ ]+) ([^ ]+) HTTP\/(1\.[01])$/.exec(start);
		if (
			!match ||
			!token(match[1]) ||
			[...match[2]].some(
				(c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127,
			)
		)
			throw new Error(
				"Use METHOD target HTTP/1.0 or HTTP/1.1 on the first line.",
			);
		if (lines.length > 200) throw new Error("Limit requests to 200 headers.");
		const headers = lines.map((line) => {
			const colon = line.indexOf(":");
			if (
				colon < 1 ||
				!token(line.slice(0, colon)) ||
				[...line.slice(colon + 1)].some(
					(c) =>
						(c.charCodeAt(0) < 32 && c !== "\t") || c.charCodeAt(0) === 127,
				)
			)
				throw new Error(
					"Invalid header name/value; folded header lines are not supported.",
				);
			return {
				name: line.slice(0, colon),
				value: line.slice(colon + 1).trim(),
			};
		});
		const get = (name: string) =>
			headers.filter((h) => h.name.toLowerCase() === name).map((h) => h.value);
		const [, method, target, version] = match,
			warnings: string[] = [];
		if (version === "1.1" && get("host").length !== 1)
			warnings.push("HTTP/1.1 requires exactly one Host header.");
		let url: URL | undefined, targetForm: string;
		if (target === "*") {
			if (method !== "OPTIONS")
				throw new Error("Asterisk-form requires OPTIONS.");
			targetForm = "asterisk";
		} else if (method === "CONNECT") {
			if (
				!/^(?:\[[0-9a-f:]+\]|[a-z0-9.-]+):\d+$/i.test(target) ||
				Number(target.slice(target.lastIndexOf(":") + 1)) > 65535 ||
				Number(target.slice(target.lastIndexOf(":") + 1)) < 1
			)
				throw new Error("CONNECT requires a host:port authority.");
			targetForm = "authority";
		} else if (/^https?:\/\//i.test(target)) {
			url = new URL(target);
			targetForm = "absolute";
		} else if (target.startsWith("/")) {
			targetForm = "origin";
			const hosts = get("host");
			if (hosts.length === 1) {
				if (!hosts[0] || /[/?#@\s]/.test(hosts[0]))
					throw new Error("Invalid Host header.");
				const base = new URL(`${v.scheme}://${hosts[0]}`);
				url = new URL(base.origin + target);
			} else
				warnings.push("Cannot reconstruct URL without a single Host header.");
		} else
			throw new Error(
				"Use origin, absolute, CONNECT authority, or OPTIONS asterisk target form.",
			);
		if (target.includes("#") || url?.username || url?.password)
			throw new Error(
				"Request targets cannot contain fragments or embedded credentials.",
			);
		const lengths = get("content-length"),
			transfers = get("transfer-encoding"),
			bytes = new TextEncoder().encode(body).length;
		if (lengths.length > 1)
			warnings.push(
				"Duplicate Content-Length headers require rejection or strict normalization.",
			);
		if (
			lengths.some((n) => !/^\d+$/.test(n) || !Number.isSafeInteger(Number(n)))
		)
			warnings.push("Invalid Content-Length.");
		if (lengths.length && transfers.length)
			warnings.push(
				"Both Transfer-Encoding and Content-Length are present: ambiguous framing.",
			);
		if (transfers.length)
			warnings.push(
				"Transfer encoding is not decoded; pasted body length is not a framing check.",
			);
		else if (
			lengths.length === 1 &&
			/^\d+$/.test(lengths[0]) &&
			Number(lengths[0]) !== bytes
		)
			warnings.push(
				"Content-Length differs from pasted UTF-8 body byte count.",
			);
		const sensitive = new Set([
			"authorization",
			"proxy-authorization",
			"cookie",
			"set-cookie",
			"x-api-key",
		]);
		return print({
			method,
			version,
			targetForm,
			target,
			url: url?.href ?? null,
			query: url
				? [...url.searchParams].map(([name, value]) => ({ name, value }))
				: [],
			headers: headers.map((h) => ({
				...h,
				value:
					v.secrets === "Mask" && sensitive.has(h.name.toLowerCase())
						? "[redacted]"
						: h.value,
			})),
			body: {
				utf8Bytes: bytes,
				...(v.body === "Include body" ? { text: body } : {}),
			},
			warnings,
		});
	},
};
