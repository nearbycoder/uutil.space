export const WORKSPACE_KEY = "uutil.workspace.v1";
export type SavedField = {
	label: string;
	kind: "input" | "setting";
	value: string | boolean;
};
export type SavedRun = {
	id: string;
	name: string;
	toolId: string;
	fields: SavedField[];
	created: number;
};
export type Scratchpad = { id: string; name: string; text: string };
export type WorkspaceState = {
	favorites: string[];
	recent: string[];
	presets: SavedRun[];
	scratchpads: Scratchpad[];
	history: SavedRun[];
	historyEnabled: boolean;
	retention: number;
};
export const emptyWorkspace = (): WorkspaceState => ({
	favorites: [],
	recent: [],
	presets: [],
	scratchpads: [],
	history: [],
	historyEnabled: false,
	retention: 7,
});
export function readFields(value: unknown): SavedField[] {
	if (!Array.isArray(value) || value.length > 100)
		throw new Error("Invalid saved fields.");
	return value.map((field) => {
		if (
			!field ||
			typeof field.label !== "string" ||
			field.label.length > 500 ||
			!["input", "setting"].includes(field.kind) ||
			!["string", "boolean"].includes(typeof field.value) ||
			String(field.value).length > 100_000
		)
			throw new Error("Invalid or oversized saved field.");
		return { label: field.label, kind: field.kind, value: field.value };
	});
}
export function pruneHistory(
	state: WorkspaceState,
	now = Date.now(),
): WorkspaceState {
	return {
		...state,
		history: state.historyEnabled
			? state.history
					.filter((run) => now - run.created < state.retention * 86400000)
					.slice(0, 50)
			: [],
	};
}
export function parseWorkspace(raw: string | null): WorkspaceState {
	const state = emptyWorkspace();
	if (!raw) return state;
	try {
		if (raw.length > 2_000_000) return state;
		const data = JSON.parse(raw);
		const ids = (v: unknown) =>
			Array.isArray(v)
				? ([
						...new Set(
							v.filter((x) => typeof x === "string" && x.length < 100),
						),
					].slice(0, 100) as string[])
				: [];
		state.favorites = ids(data.favorites);
		state.recent = ids(data.recent).slice(0, 12);
		state.historyEnabled = data.historyEnabled === true;
		state.retention = [1, 7, 30].includes(data.retention) ? data.retention : 7;
		const runs = (v: unknown) =>
			!Array.isArray(v)
				? []
				: v.slice(0, 50).flatMap((run) => {
						try {
							if (
								!run ||
								typeof run.id !== "string" ||
								typeof run.name !== "string" ||
								typeof run.toolId !== "string" ||
								!Number.isFinite(run.created)
							)
								return [];
							return [
								{
									id: run.id.slice(0, 100),
									name: run.name.slice(0, 100),
									toolId: run.toolId.slice(0, 100),
									created: run.created,
									fields: readFields(run.fields),
								},
							];
						} catch {
							return [];
						}
					});
		state.presets = runs(data.presets);
		state.history = runs(data.history);
		state.scratchpads = Array.isArray(data.scratchpads)
			? data.scratchpads
					.slice(0, 50)
					.filter(
						(p: Scratchpad) =>
							p &&
							typeof p.id === "string" &&
							typeof p.name === "string" &&
							typeof p.text === "string" &&
							p.text.length <= 100_000,
					)
					.map((p: Scratchpad) => ({
						id: p.id.slice(0, 100),
						name: p.name.slice(0, 100),
						text: p.text,
					}))
			: [];
		return pruneHistory(state);
	} catch {
		return state;
	}
}
export function encodeRecipe(
	toolId: string,
	fields: SavedField[],
	includeInput = false,
) {
	const payload = JSON.stringify({
		version: 1,
		toolId,
		fields: readFields(fields).filter(
			(field) => includeInput || field.kind === "setting",
		),
	});
	if (payload.length > 24_000)
		throw new Error(
			"Recipe is too large to share. Remove input or use a smaller sample.",
		);
	return `#recipe=${encodeURIComponent(payload)}`;
}
export function decodeRecipe(hash: string, toolIds: string[]) {
	if (!hash.startsWith("#recipe=")) return null;
	if (hash.length > 100_000) throw new Error("Recipe is too large.");
	const recipe = JSON.parse(decodeURIComponent(hash.slice(8)));
	if (recipe.version !== 1 || !toolIds.includes(recipe.toolId))
		throw new Error("Unknown recipe version or tool.");
	return { toolId: recipe.toolId as string, fields: readFields(recipe.fields) };
}
export function detectTools(input: string): { id: string; reason: string }[] {
	const value = input.trim();
	if (!value) return [];
	const matches: { id: string; reason: string }[] = [];
	const add = (id: string, reason: string) => matches.push({ id, reason });
	if (/^-----BEGIN (?:X509 )?CERTIFICATE-----/.test(value))
		add("certificate-decoder", "PEM certificate");
	if (/^[\w-]+\.[\w-]+\.[\w-]*$/.test(value))
		add("jwt-debugger", "JWT-shaped token");
	if (/^https?:\/\//i.test(value)) add("url-parser", "Web URL");
	if (/^-?\d{10}(?:\d{3})?$/.test(value))
		add("unix-time-converter", "Unix timestamp");
	try {
		if (value.length < 1_000_000) {
			JSON.parse(value);
			add("json-format-validate", "Valid JSON");
		}
	} catch {
		/* Other formats below. */
	}
	if (/%[\da-f]{2}/i.test(value))
		add("url-encode-decode", "Percent-encoded text");
	if (
		value.length >= 8 &&
		value.length % 4 === 0 &&
		/^[A-Za-z0-9+/]+={0,2}$/.test(value)
	)
		add("base64-string", "Possibly Base64");
	if (!matches.length)
		add("text-redactor", "Review text for secrets before sharing");
	return matches;
}
export function downloadText(text: string, name = "uutil-output.txt") {
	const url = URL.createObjectURL(
		new Blob([text], { type: "text/plain;charset=utf-8" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const FILE_OPERATIONS = [
	"JSON format",
	"JSON minify",
	"JSON to YAML",
	"YAML to JSON",
	"JSON to CSV",
	"CSV to JSON",
	"Base64 encode",
	"Base64 decode",
	"URL encode",
	"URL decode",
] as const;
export async function transformFile(
	text: string,
	operation: string,
): Promise<string> {
	if (text.length > 1_000_000) throw new Error("File exceeds the 1 MB limit.");
	switch (operation) {
		case "JSON format":
			return JSON.stringify(JSON.parse(text), null, 2);
		case "JSON minify":
			return JSON.stringify(JSON.parse(text));
		case "JSON to YAML":
			return (await import("js-yaml")).dump(JSON.parse(text));
		case "YAML to JSON":
			return JSON.stringify((await import("js-yaml")).load(text), null, 2);
		case "JSON to CSV": {
			const data = JSON.parse(text);
			if (!Array.isArray(data)) throw new Error("CSV needs a JSON array.");
			return (await import("papaparse")).default.unparse(data);
		}
		case "CSV to JSON": {
			const parsed = (await import("papaparse")).default.parse(text, {
				header: true,
				delimiter: ",",
				skipEmptyLines: true,
			});
			if (parsed.errors.length) throw new Error(parsed.errors[0].message);
			return JSON.stringify(parsed.data, null, 2);
		}
		case "Base64 encode": {
			const bytes = new TextEncoder().encode(text);
			let binary = "";
			for (const byte of bytes) binary += String.fromCharCode(byte);
			return btoa(binary);
		}
		case "Base64 decode":
			return new TextDecoder("utf-8", { fatal: true }).decode(
				Uint8Array.from(atob(text.trim()), (ch) => ch.charCodeAt(0)),
			);
		case "URL encode":
			return encodeURIComponent(text);
		case "URL decode":
			return decodeURIComponent(text);
		default:
			throw new Error("Unknown operation.");
	}
}
