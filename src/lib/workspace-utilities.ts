import Color from "color";
import { type Schema, Validator } from "jsonschema";

export function validateJsonSchema(input: string, schemaText: string) {
	if (input.length + schemaText.length > 1_000_000)
		throw new Error("Keep the combined document and schema below 1 MB.");
	const instance = JSON.parse(input);
	const schema = JSON.parse(schemaText);
	if (
		typeof schema !== "boolean" &&
		(!schema || typeof schema !== "object" || Array.isArray(schema))
	)
		throw new Error("A schema must be an object or boolean.");
	if (schema.$schema && !/draft-0[467]\/schema#?$/.test(schema.$schema))
		throw new Error(
			"This validator supports JSON Schema drafts 4, 6, and 7. Choose a supported draft.",
		);
	const result = new Validator().validate(instance, schema as Schema, {
		nestedErrors: true,
	});
	return {
		valid: result.valid,
		errors: result.errors.map((error) => ({
			path: error.path.length
				? `/${error.path.map((part) => String(part).replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`
				: "",
			message: error.message,
			property: error.path.at(-1) ?? "",
		})),
	};
}

export function locateJsonPointer(
	input: string,
	pointer: string,
): [number, number] {
	const tokens = [
		...input.matchAll(
			/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}[\]:,]/g,
		),
	];
	let cursor = 0;
	const locations = new Map<string, [number, number]>();
	const visit = (path: string, depth: number) => {
		if (depth > 500) throw new Error("Document nesting is too deep to locate.");
		const first = tokens[cursor++];
		if (!first) return;
		if (first[0] === "{") {
			while (tokens[cursor]?.[0] !== "}" && cursor < tokens.length) {
				const key = JSON.parse(tokens[cursor++][0]);
				cursor++;
				visit(
					`${path}/${String(key).replace(/~/g, "~0").replace(/\//g, "~1")}`,
					depth + 1,
				);
				if (tokens[cursor]?.[0] === ",") cursor++;
			}
			cursor++;
		} else if (first[0] === "[") {
			let index = 0;
			while (tokens[cursor]?.[0] !== "]" && cursor < tokens.length) {
				visit(`${path}/${index++}`, depth + 1);
				if (tokens[cursor]?.[0] === ",") cursor++;
			}
			cursor++;
		}
		const last = tokens[cursor - 1] ?? first;
		locations.set(path, [first.index, last.index + last[0].length]);
	};
	try {
		visit("", 0);
	} catch {
		return [0, input.length];
	}
	return locations.get(pointer) ?? [0, input.length];
}

export type RedactionOptions = {
	emails: boolean;
	tokens: boolean;
	ips: boolean;
	phones: boolean;
};
export function redactText(input: string, options: RedactionOptions) {
	let count = 0;
	let text = input;
	const replace = (pattern: RegExp, label: string) => {
		text = text.replace(pattern, () => {
			count++;
			return `[${label}]`;
		});
	};
	if (options.tokens) {
		replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "REDACTED_TOKEN");
		replace(
			/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
			"REDACTED_JWT",
		);
		replace(
			/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/g,
			"REDACTED_KEY",
		);
		text = text.replace(
			/(["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)["']?\s*[:=]\s*)(["']?)([^\s,"';}]+)\2/gi,
			(_match, prefix: string, quote: string) => {
				count++;
				return `${prefix}${quote}[REDACTED]${quote}`;
			},
		);
	}
	if (options.emails)
		replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "REDACTED_EMAIL");
	if (options.ips)
		replace(
			/\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
			"REDACTED_IP",
		);
	if (options.phones)
		replace(
			/(?<!\w)(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}(?!\w)/g,
			"REDACTED_PHONE",
		);
	return { text, count };
}

const FIRST_NAMES = [
	"Alex",
	"Sam",
	"Jordan",
	"Morgan",
	"Taylor",
	"Casey",
	"Avery",
	"Riley",
];
const LAST_NAMES = [
	"Chen",
	"Patel",
	"Rivera",
	"Kim",
	"Wilson",
	"Singh",
	"Garcia",
	"Martin",
];
export type MockFieldType =
	| "id"
	| "name"
	| "email"
	| "integer"
	| "boolean"
	| "date"
	| "company";
export function generateMockData(
	count: number,
	seed: number,
	fields: { name: string; type: MockFieldType }[],
) {
	if (!Number.isInteger(count) || count < 1 || count > 1000)
		throw new Error("Choose between 1 and 1,000 records.");
	if (!Number.isInteger(seed) || !Number.isFinite(seed))
		throw new Error("Seed must be an integer.");
	if (
		!fields.length ||
		fields.length > 20 ||
		fields.some((field) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name))
	)
		throw new Error("Use 1–20 fields with identifier names.");
	if (new Set(fields.map((field) => field.name)).size !== fields.length)
		throw new Error("Field names must be unique.");
	let state = seed >>> 0;
	const random = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
	return Array.from({ length: count }, (_, index) => {
		const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
		const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
		return Object.fromEntries(
			fields.map((field) => {
				let value: string | number | boolean;
				switch (field.type) {
					case "id":
						value = index + 1;
						break;
					case "name":
						value = `${first} ${last}`;
						break;
					case "email":
						value = `${first.toLowerCase()}.${last.toLowerCase()}.${index + 1}@example.com`;
						break;
					case "integer":
						value = Math.floor(random() * 1000);
						break;
					case "boolean":
						value = random() > 0.5;
						break;
					case "date":
						value = new Date(
							Date.UTC(2025, 0, 1) + Math.floor(random() * 365) * 86400000,
						).toISOString();
						break;
					case "company":
						value = `${["North", "Pine", "Cedar", "Maple"][Math.floor(random() * 4)]} ${["Labs", "Studio", "Systems", "Works"][Math.floor(random() * 4)]}`;
						break;
					default:
						throw new Error(`Unknown field type: ${field.type}`);
				}
				return [field.name, value];
			}),
		);
	});
}

export function checkContrast(foreground: string, background: string) {
	const fg = Color(foreground),
		bg = Color(background);
	if (fg.alpha() !== 1 || bg.alpha() !== 1)
		throw new Error(
			"Use opaque colors to calculate a reliable contrast ratio.",
		);
	const ratio =
		(Math.max(fg.luminosity(), bg.luminosity()) + 0.05) /
		(Math.min(fg.luminosity(), bg.luminosity()) + 0.05);
	const alternatives: string[] = [];
	for (const target of [4.5, 7]) {
		let closest: { distance: number; color: string } | null = null;
		for (let lightness = 0; lightness <= 100; lightness++) {
			const candidate = fg.hsl().lightness(lightness);
			const contrast =
				(Math.max(candidate.luminosity(), bg.luminosity()) + 0.05) /
				(Math.min(candidate.luminosity(), bg.luminosity()) + 0.05);
			const distance = Math.abs(lightness - fg.lightness());
			if (contrast >= target && (!closest || distance < closest.distance))
				closest = { distance, color: candidate.hex() };
		}
		if (closest && !alternatives.includes(closest.color))
			alternatives.push(closest.color);
	}
	return {
		ratio,
		aa: ratio >= 4.5,
		aaa: ratio >= 7,
		large: ratio >= 3,
		foreground: fg.hex(),
		background: bg.hex(),
		alternatives,
	};
}

export type CronSchedule =
	| "minutes"
	| "hourly"
	| "daily"
	| "weekly"
	| "monthly";
export function buildCron(
	schedule: CronSchedule,
	minute: number,
	hour: number,
	day: number,
	interval: number,
) {
	if (![minute, hour, day, interval].every(Number.isInteger))
		throw new Error("Schedule values must be integers.");
	if (minute < 0 || minute > 59 || hour < 0 || hour > 23)
		throw new Error("Choose a valid hour and minute.");
	if (schedule === "minutes") {
		if (interval < 1 || interval > 59)
			throw new Error("Minute interval must be 1–59.");
		return `*/${interval} * * * *`;
	}
	if (schedule === "hourly") return `${minute} * * * *`;
	if (schedule === "daily") return `${minute} ${hour} * * *`;
	if (schedule === "weekly") {
		if (day < 0 || day > 6) throw new Error("Choose a weekday from 0 to 6.");
		return `${minute} ${hour} * * ${day}`;
	}
	if (schedule === "monthly") {
		if (day < 1 || day > 31) throw new Error("Choose a date from 1 to 31.");
		return `${minute} ${hour} ${day} * *`;
	}
	throw new Error("Choose a supported schedule.");
}
