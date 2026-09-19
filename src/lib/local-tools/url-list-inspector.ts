import { type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "URLs (one per line)",
			value:
				"https://example.com/docs?page=1#intro\nhttps://example.com/docs?page=1#more\nhttps://api.example.com/v1\nnot a URL",
		},
		{
			key: "base",
			label: "Base URL for relative paths (optional)",
			type: "text",
			value: "",
			optional: true,
		},
		{
			key: "fragment",
			label: "Duplicate comparison",
			type: "select",
			value: "Ignore fragments",
			options: ["Ignore fragments", "Include fragments"],
		},
	],
	help: "Audit a list of HTTP(S) URLs locally without fetching any address. Reports invalid lines, normalized addresses, host counts and duplicate groups with original line numbers. An optional HTTP(S) base resolves relative paths. Duplicate comparison preserves query parameter order; URL normalization follows the browser URL parser. Credential-bearing URLs are rejected to avoid exposing embedded passwords in reports. Blank lines are ignored; maximum 2,000 URLs.",
	filename: "url-audit.json",
	smoke: '"duplicateGroups"',
	run: (v) => {
		const parse = (text: string, base?: string) => {
			const url = new URL(text, base);
			if (!/^https?:$/.test(url.protocol))
				throw new Error("Only HTTP(S) URLs are supported.");
			if (url.username || url.password)
				throw new Error("Credential-bearing URLs are not supported.");
			return url;
		};
		let base: string | undefined;
		if (v.base.trim()) {
			try {
				base = parse(v.base.trim()).href;
			} catch {
				throw new Error(
					"Base must be an absolute HTTP(S) URL without credentials.",
				);
			}
		}
		const lines = v.input
			.split(/\r?\n/)
			.map((text, i) => ({ text: text.trim(), line: i + 1 }))
			.filter(({ text }) => text);
		if (lines.length > 2000) throw new Error("Use at most 2,000 URLs.");
		const valid: unknown[] = [],
			invalid: { line: number; reason: string }[] = [],
			hosts = new Map<string, number>(),
			groups = new Map<string, number[]>();
		for (const { text, line } of lines) {
			try {
				const url = parse(text, base);
				valid.push({
					line,
					url: url.href,
					origin: url.origin,
					path: url.pathname,
					queryKeys: [...new Set(url.searchParams.keys())],
				});
				hosts.set(url.host, (hosts.get(url.host) ?? 0) + 1);
				if (v.fragment === "Ignore fragments") url.hash = "";
				groups.set(url.href, [...(groups.get(url.href) ?? []), line]);
			} catch (error) {
				invalid.push({
					line,
					reason:
						error instanceof Error && error.message.includes("supported")
							? error.message
							: "Invalid URL.",
				});
			}
		}
		return print({
			total: lines.length,
			validCount: valid.length,
			invalidCount: invalid.length,
			uniqueUrls: groups.size,
			hosts: [...hosts].map(([host, count]) => ({ host, count })),
			duplicateGroups: [...groups]
				.filter(([, lines]) => lines.length > 1)
				.map(([url, lines]) => ({ url, lines })),
			invalid,
			valid,
		});
	},
};
