import { type LocalTool, print } from "./types";

type Token = {
	kind: "literal" | "one" | "star" | "all" | "dirs";
	value?: string;
};
function compile(pattern: string): Token[] {
	const chars = [...pattern],
		tokens: Token[] = [];
	for (let i = 0; i < chars.length; i++) {
		const c = chars[i];
		if (c === "\\") {
			if (i + 1 === chars.length)
				throw new Error("A backslash must escape a following character.");
			tokens.push({ kind: "literal", value: chars[++i] });
		} else if ("[]{}".includes(c))
			throw new Error(
				"Character classes and brace expansion are not supported; escape brackets for literals.",
			);
		else if (c === "?") tokens.push({ kind: "one" });
		else if (c === "*") {
			if (chars[i + 1] === "*") {
				i++;
				if (chars[i + 1] === "/") {
					i++;
					tokens.push({ kind: "dirs" });
				} else tokens.push({ kind: "all" });
			} else tokens.push({ kind: "star" });
		} else tokens.push({ kind: "literal", value: c });
	}
	return tokens;
}
function matches(tokens: Token[], path: string): boolean {
	const chars = [...path];
	let previous = new Uint8Array(chars.length + 1);
	previous[0] = 1;
	for (const t of tokens) {
		const next = new Uint8Array(chars.length + 1);
		if (["star", "all", "dirs"].includes(t.kind)) next[0] = previous[0];
		let prefix = previous[0];
		for (let j = 1; j <= chars.length; j++) {
			const c = chars[j - 1];
			if (t.kind === "literal")
				next[j] = Number(!!previous[j - 1] && c === t.value);
			else if (t.kind === "one")
				next[j] = Number(!!previous[j - 1] && c !== "/");
			else if (t.kind === "dirs") {
				next[j] = Number(!!previous[j] || (!!prefix && c === "/"));
				prefix = Number(!!prefix || !!previous[j]);
			} else
				next[j] = Number(
					!!previous[j] || (!!next[j - 1] && (t.kind === "all" || c !== "/")),
				);
		}
		previous = next;
	}
	return !!previous[chars.length];
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Paths (one per line)",
			value: "src/index.ts\nsrc/lib/parse.ts\nsrc/app.tsx\nREADME.md",
		},
		{
			key: "pattern",
			label: "Glob pattern",
			type: "text",
			value: "src/**/*.ts",
		},
		{
			key: "case",
			label: "Case comparison",
			type: "select",
			value: "Sensitive",
			options: ["Sensitive", "Insensitive"],
		},
		{
			key: "output",
			label: "Output",
			type: "select",
			value: "Report",
			options: ["Report", "Matched paths", "Unmatched paths"],
		},
	],
	filename: "glob-results.txt",
	smoke: '"matchedCount": 2',
	help: "Matches whole paths, not substrings. * matches within one path segment, ? one Unicode code point except /, ** crosses directories, and **/ also matches zero directories. Backslash escapes the next character; use forward slashes for paths. Dotfiles are ordinary names. No classes, braces, negation or filesystem access. This is an explicit portable subset, not a complete shell/gitignore implementation. Limits: 1,000 paths, 100,000 total path characters, 256 pattern characters.",
	run: (v) => {
		const paths = v.input
			.replaceAll("\r\n", "\n")
			.split("\n")
			.filter((p) => p.length > 0);
		if (
			paths.length > 1000 ||
			v.input.length > 100000 ||
			v.pattern.length > 256
		)
			throw new Error(
				"Limit to 1,000 paths, 100,000 input characters and a 256-character pattern.",
			);
		if (v.pattern.includes("\n") || v.pattern.includes("\r"))
			throw new Error("Use a single-line pattern.");
		const fold = (s: string) =>
				v.case === "Insensitive" ? s.toLowerCase() : s,
			tokens = compile(fold(v.pattern));
		const matched: string[] = [],
			unmatched: string[] = [];
		for (const path of paths)
			(matches(tokens, fold(path)) ? matched : unmatched).push(path);
		if (v.output === "Matched paths") return matched.join("\n");
		if (v.output === "Unmatched paths") return unmatched.join("\n");
		return print({
			pattern: v.pattern,
			total: paths.length,
			matchedCount: matched.length,
			unmatchedCount: unmatched.length,
			matched,
			unmatched,
		});
	},
};
