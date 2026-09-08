import { integer, type LocalTool, print } from "./types";

const meanings: Record<string, string> = {
	"max-age": "Maximum acceptable age or response freshness lifetime.",
	"s-maxage": "Shared-cache freshness lifetime; overrides max-age there.",
	"no-cache":
		"Requires validation before reuse; storage is not inherently forbidden.",
	"no-store": "Prohibits storage, subject to must-understand semantics.",
	private: "Restricts shared-cache storage; optional field-name qualification.",
	public: "Explicitly permits cache storage subject to other requirements.",
	"must-revalidate": "Requires successful validation when stale.",
	"proxy-revalidate": "Requires shared-cache validation when stale.",
	"no-transform": "Disallows intermediary transformations.",
	"only-if-cached": "Requests a stored response instead of origin retrieval.",
	"min-fresh": "Requests this much remaining freshness.",
	"max-stale": "Allows stale responses within the specified tolerance.",
	"must-understand":
		"Limits storage to caches understanding status-code requirements.",
};
const token = (s: string) =>
	!!s &&
	[...s].every(
		(c) => /[a-z0-9!#$%&'*+.^_|~-]/i.test(c) || c.charCodeAt(0) === 96,
	);
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Cache-Control header",
			value: "public, max-age=60, s-maxage=300, must-revalidate",
		},
		{
			key: "context",
			label: "Header context",
			type: "select",
			value: "Response",
			options: ["Response", "Request"],
		},
		{
			key: "age",
			label: "Current age in seconds (response estimate)",
			type: "text",
			value: "20",
		},
	],
	filename: "cache-control.json",
	smoke: '"privateSeconds": 60',
	help: "Inspects a single Cache-Control value or a prefixed header. Quoted commas and extensions are preserved. Response freshness estimates use only valid, unique max-age/s-maxage directives and your supplied age; they do not decide cache eligibility, account for Expires, Vary, authorization, validators or network delay. Unknown extensions are reported without assuming their behavior.",
	run: (v) => {
		const input = v.input.replace(/^Cache-Control\s*:\s*/i, "").trim();
		if ([...input].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
			throw new Error("Use a single header line without control characters.");
		const chunks: string[] = [];
		let current = "",
			quoted = false,
			escaped = false;
		for (const c of input) {
			if (escaped) {
				current += c;
				escaped = false;
				continue;
			}
			if (quoted && c === "\\") {
				current += c;
				escaped = true;
				continue;
			}
			if (c === '"') quoted = !quoted;
			if (c === "," && !quoted) {
				chunks.push(current.trim());
				current = "";
			} else current += c;
		}
		if (quoted || escaped)
			throw new Error("Unterminated quoted directive value.");
		chunks.push(current.trim());
		if (chunks.length > 100 || chunks.some((c) => !c))
			throw new Error("Use 1–100 nonempty directives.");
		const warnings: string[] = [],
			counts = new Map<string, number>();
		const directives = chunks.map((chunk) => {
			const eq = chunk.indexOf("="),
				name = (eq < 0 ? chunk : chunk.slice(0, eq)).trim().toLowerCase(),
				raw = eq < 0 ? null : chunk.slice(eq + 1).trim();
			if (!token(name)) throw new Error("Invalid directive name.");
			let value: string | null = raw;
			if (raw !== null) {
				if (raw.startsWith('"')) {
					if (!/^"(?:[^"\\]|\\.)*"$/.test(raw))
						throw new Error("Invalid quoted value.");
					value = raw.slice(1, -1).replace(/\\(.)/g, "$1");
				} else if (!token(raw)) throw new Error("Invalid directive argument.");
			}
			counts.set(name, (counts.get(name) ?? 0) + 1);
			const numeric = [
				"max-age",
				"s-maxage",
				"min-fresh",
				"max-stale",
			].includes(name);
			let valid = true;
			if (
				numeric &&
				!(name === "max-stale" && value === null) &&
				(value === null ||
					!/^\d+$/.test(value) ||
					!Number.isSafeInteger(Number(value)))
			) {
				warnings.push(`${name}: requires nonnegative integer seconds.`);
				valid = false;
			}
			if (numeric && raw?.startsWith('"'))
				warnings.push(`${name}: send seconds without quotes.`);
			if (
				[
					"no-store",
					"public",
					"must-revalidate",
					"proxy-revalidate",
					"no-transform",
					"only-if-cached",
					"must-understand",
				].includes(name) &&
				value !== null
			) {
				warnings.push(`${name}: unexpected argument.`);
				valid = false;
			}
			if (
				["no-cache", "private"].includes(name) &&
				value !== null &&
				(v.context === "Request" ||
					!value.split(",").every((field) => token(field.trim())))
			) {
				warnings.push(`${name}: invalid field-name qualification.`);
				valid = false;
			}
			if (
				v.context === "Request" &&
				[
					"s-maxage",
					"private",
					"public",
					"must-revalidate",
					"proxy-revalidate",
					"must-understand",
				].includes(name)
			)
				warnings.push(`${name}: response directive in a request.`);
			if (
				v.context === "Response" &&
				["min-fresh", "max-stale", "only-if-cached"].includes(name)
			)
				warnings.push(`${name}: request directive in a response.`);
			return {
				name,
				value,
				valid,
				explanation:
					meanings[name] ??
					"Extension: consult its specification; no behavior inferred.",
			};
		});
		for (const [name, count] of counts)
			if (count > 1)
				warnings.push(
					`${name}: duplicate directive; freshness is not inferred from duplicates.`,
				);
		if (counts.has("public") && counts.has("private"))
			warnings.push("public and private conflict; review policy.");
		if (
			counts.has("no-store") &&
			(counts.has("max-age") || counts.has("s-maxage"))
		)
			warnings.push("Freshness does not override no-store.");
		const seconds = (name: string) => {
			const d = directives.find((x) => x.name === name);
			return counts.get(name) === 1 && d?.valid && d.value !== null
				? Number(d.value)
				: null;
		};
		const privateSeconds = seconds("max-age"),
			sharedSeconds = counts.has("s-maxage")
				? seconds("s-maxage")
				: privateSeconds,
			age = integer(v.age, 0, Number.MAX_SAFE_INTEGER);
		return print({
			context: v.context,
			directives,
			warnings,
			freshness:
				v.context === "Response"
					? {
							privateSeconds,
							sharedSeconds,
							age,
							privateRemainingSeconds:
								privateSeconds === null
									? null
									: Math.max(0, privateSeconds - age),
							sharedRemainingSeconds:
								sharedSeconds === null
									? null
									: Math.max(0, sharedSeconds - age),
							note: "Freshness budget only, not permission to store or reuse.",
						}
					: null,
		});
	},
};
