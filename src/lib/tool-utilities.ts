import CryptoJS from "crypto-js";

export type JsonPathToken = string | number;

function tokenizeJsonPath(path: string): JsonPathToken[] {
	const value = path.trim();
	if (!value || value === "$") {
		return [];
	}

	const tokens: JsonPathToken[] = [];
	let cursor = value.startsWith("$") ? 1 : 0;

	while (cursor < value.length) {
		if (value[cursor] === ".") {
			cursor += 1;
			if (cursor >= value.length) {
				throw new Error("JSON path cannot end with a dot.");
			}
		}

		if (value[cursor] === "[") {
			let closing = cursor + 1;
			let quote: '"' | "'" | null = null;
			let escaped = false;
			for (; closing < value.length; closing += 1) {
				const char = value[closing];
				if (escaped) {
					escaped = false;
					continue;
				}
				if (char === "\\") {
					escaped = true;
					continue;
				}
				if (quote) {
					if (char === quote) quote = null;
					continue;
				}
				if (char === '"' || char === "'") {
					quote = char;
					continue;
				}
				if (char === "]") break;
			}

			if (closing >= value.length || value[closing] !== "]") {
				throw new Error("JSON path contains an unclosed bracket.");
			}

			const bracketValue = value.slice(cursor + 1, closing).trim();
			if (!bracketValue) {
				throw new Error("JSON path brackets cannot be empty.");
			}

			if (/^(0|[1-9]\d*)$/.test(bracketValue)) {
				tokens.push(Number(bracketValue));
			} else if (
				(bracketValue.startsWith('"') && bracketValue.endsWith('"')) ||
				(bracketValue.startsWith("'") && bracketValue.endsWith("'"))
			) {
				const quoteCharacter = bracketValue[0];
				const inner = bracketValue.slice(1, -1);
				tokens.push(
					quoteCharacter === '"'
						? (JSON.parse(bracketValue) as string)
						: inner.replace(/\\'/g, "'").replace(/\\\\/g, "\\"),
				);
			} else {
				throw new Error("Bracket keys must be an array index or a quoted key.");
			}

			cursor = closing + 1;
			continue;
		}

		const start = cursor;
		while (cursor < value.length && !".[".includes(value[cursor])) {
			cursor += 1;
		}
		const key = value.slice(start, cursor).trim();
		if (!key) {
			throw new Error("JSON path contains an empty property name.");
		}
		tokens.push(key);
	}

	return tokens;
}

export function exploreJsonPath(json: string, path: string): unknown {
	const root = JSON.parse(json) as unknown;
	const tokens = tokenizeJsonPath(path);
	let current = root;

	for (const token of tokens) {
		if (current === null || typeof current !== "object") {
			throw new Error(`Cannot read '${String(token)}' from a primitive value.`);
		}

		if (!(token in current)) {
			throw new Error(`Path segment '${String(token)}' does not exist.`);
		}
		current = (current as Record<string | number, unknown>)[token];
	}

	return current;
}

export function queryStringToJson(
	input: string,
): Record<string, string | string[]> {
	const query = input
		.trim()
		.replace(/^[^?]*\?/, "")
		.replace(/^\?/, "");
	const params = new URLSearchParams(query);
	const output: Record<string, string | string[]> = {};

	params.forEach((value, key) => {
		const existing = output[key];
		if (existing === undefined) {
			output[key] = value;
		} else if (Array.isArray(existing)) {
			existing.push(value);
		} else {
			output[key] = [existing, value];
		}
	});

	return output;
}

export function jsonToQueryString(input: string): string {
	const value = JSON.parse(input) as unknown;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Query string input must be a JSON object.");
	}

	const params = new URLSearchParams();
	for (const [key, entry] of Object.entries(value)) {
		const values = Array.isArray(entry) ? entry : [entry];
		for (const item of values) {
			if (item === null) {
				params.append(key, "");
			} else if (typeof item === "object") {
				params.append(key, JSON.stringify(item));
			} else {
				params.append(key, String(item));
			}
		}
	}

	return params.toString();
}

function parseIpv4(input: string): number {
	const parts = input.split(".");
	if (parts.length !== 4) {
		throw new Error("IPv4 addresses must contain four octets.");
	}

	const octets = parts.map((part) => {
		if (!/^\d{1,3}$/.test(part)) {
			throw new Error("IPv4 octets must be decimal numbers from 0 to 255.");
		}
		const value = Number(part);
		if (value > 255) {
			throw new Error("IPv4 octets must be decimal numbers from 0 to 255.");
		}
		return value;
	});

	return (
		(((octets[0] << 24) >>> 0) +
			(octets[1] << 16) +
			(octets[2] << 8) +
			octets[3]) >>>
		0
	);
}

function formatIpv4(value: number): string {
	const normalized = value >>> 0;
	return [
		normalized >>> 24,
		(normalized >>> 16) & 255,
		(normalized >>> 8) & 255,
		normalized & 255,
	].join(".");
}

export type CidrDetails = {
	address: string;
	prefix: number;
	network: string;
	broadcast: string;
	netmask: string;
	wildcardMask: string;
	firstUsable: string;
	lastUsable: string;
	totalAddresses: number;
	usableAddresses: number;
};

export function calculateIpv4Cidr(input: string): CidrDetails {
	const [addressInput, prefixInput, ...extra] = input.trim().split("/");
	if (!addressInput || prefixInput === undefined || extra.length > 0) {
		throw new Error("Enter an IPv4 network in address/prefix format.");
	}

	const prefix = Number(prefixInput);
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
		throw new Error("CIDR prefix must be an integer from 0 to 32.");
	}

	const address = parseIpv4(addressInput);
	const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
	const network = (address & mask) >>> 0;
	const wildcard = ~mask >>> 0;
	const broadcast = (network | wildcard) >>> 0;
	const totalAddresses = 2 ** (32 - prefix);
	const firstUsable = prefix >= 31 ? network : network + 1;
	const lastUsable = prefix >= 31 ? broadcast : broadcast - 1;

	return {
		address: formatIpv4(address),
		prefix,
		network: formatIpv4(network),
		broadcast: formatIpv4(broadcast),
		netmask: formatIpv4(mask),
		wildcardMask: formatIpv4(wildcard),
		firstUsable: formatIpv4(firstUsable),
		lastUsable: formatIpv4(lastUsable),
		totalAddresses,
		usableAddresses: prefix >= 31 ? totalAddresses : totalAddresses - 2,
	};
}

const COMMON_PASSWORDS = new Set([
	"123456",
	"12345678",
	"admin",
	"letmein",
	"password",
	"password1",
	"qwerty",
	"welcome",
]);

export type PasswordAnalysis = {
	score: 0 | 1 | 2 | 3 | 4;
	label: "Very weak" | "Weak" | "Fair" | "Strong" | "Excellent";
	length: number;
	entropyBits: number;
	characterSets: string[];
	feedback: string[];
};

export function analyzePassword(input: string): PasswordAnalysis {
	const characterSets: string[] = [];
	let poolSize = 0;
	if (/[a-z]/.test(input)) {
		characterSets.push("lowercase");
		poolSize += 26;
	}
	if (/[A-Z]/.test(input)) {
		characterSets.push("uppercase");
		poolSize += 26;
	}
	if (/\d/.test(input)) {
		characterSets.push("numbers");
		poolSize += 10;
	}
	if (/[^\p{L}\p{N}\s]/u.test(input)) {
		characterSets.push("symbols");
		poolSize += 33;
	}
	if (/\s/.test(input)) {
		characterSets.push("whitespace");
		poolSize += 1;
	}
	if (
		Array.from(input).some((character) => (character.codePointAt(0) ?? 0) > 127)
	) {
		characterSets.push("unicode");
		poolSize += 100;
	}

	let entropyBits =
		input.length && poolSize ? input.length * Math.log2(poolSize) : 0;
	if (/(.)\1{2,}/u.test(input)) entropyBits *= 0.65;
	entropyBits = Math.round(entropyBits * 10) / 10;

	let score: PasswordAnalysis["score"] = 0;
	if (entropyBits >= 80 && input.length >= 14) score = 4;
	else if (entropyBits >= 60 && input.length >= 12) score = 3;
	else if (entropyBits >= 40 && input.length >= 8) score = 2;
	else if (entropyBits >= 24 && input.length >= 6) score = 1;

	const normalized = input.toLowerCase();
	if (COMMON_PASSWORDS.has(normalized)) score = 0;

	const labels = ["Very weak", "Weak", "Fair", "Strong", "Excellent"] as const;
	const feedback: string[] = [];
	if (input.length < 12) feedback.push("Use at least 12 characters.");
	if (characterSets.length < 3) feedback.push("Mix more character types.");
	if (/(.)\1{2,}/u.test(input)) feedback.push("Avoid repeated characters.");
	if (COMMON_PASSWORDS.has(normalized))
		feedback.push("This is a commonly used password.");
	if (!feedback.length) feedback.push("Good variety and length.");

	return {
		score,
		label: labels[score],
		length: input.length,
		entropyBits,
		characterSets,
		feedback,
	};
}

export function createSlug(input: string, separator: "-" | "_" = "-"): string {
	return input
		.normalize("NFKD")
		.replace(/\p{Mark}/gu, "")
		.replace(/&/g, " and ")
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, separator)
		.replace(new RegExp(`\\${separator}{2,}`, "g"), separator)
		.replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), "");
}

export type UnicodeCharacterDetails = {
	position: number;
	character: string;
	codePoint: string;
	decimal: number;
	utf8: string;
	utf16: string;
};

function displayUnicodeCharacter(character: string): string {
	const labels: Record<string, string> = {
		" ": "SPACE",
		"\n": "\\n",
		"\r": "\\r",
		"\t": "\\t",
	};
	return labels[character] ?? character;
}

export function inspectUnicode(input: string): UnicodeCharacterDetails[] {
	const encoder = new TextEncoder();
	let position = 0;

	return Array.from(input).map((character) => {
		const decimal = character.codePointAt(0) ?? 0;
		const utf8 = Array.from(encoder.encode(character), (byte) =>
			byte.toString(16).padStart(2, "0").toUpperCase(),
		).join(" ");
		const utf16 = Array.from({ length: character.length }, (_, index) =>
			character.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase(),
		).join(" ");
		const details = {
			position,
			character: displayUnicodeCharacter(character),
			codePoint: `U+${decimal.toString(16).padStart(4, "0").toUpperCase()}`,
			decimal,
			utf8,
			utf16,
		};
		position += character.length;
		return details;
	});
}

export const DATA_SIZE_UNITS = [
	"B",
	"KB",
	"MB",
	"GB",
	"TB",
	"KiB",
	"MiB",
	"GiB",
	"TiB",
] as const;

export type DataSizeUnit = (typeof DATA_SIZE_UNITS)[number];

const DATA_SIZE_FACTORS: Record<DataSizeUnit, number> = {
	B: 1,
	KB: 1_000,
	MB: 1_000_000,
	GB: 1_000_000_000,
	TB: 1_000_000_000_000,
	KiB: 1_024,
	MiB: 1_048_576,
	GiB: 1_073_741_824,
	TiB: 1_099_511_627_776,
};

export function convertDataSize(
	value: number,
	fromUnit: DataSizeUnit,
): { bytes: number; values: Record<DataSizeUnit, number> } {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error("Data size must be a finite, non-negative number.");
	}

	const bytes = value * DATA_SIZE_FACTORS[fromUnit];
	const values = Object.fromEntries(
		DATA_SIZE_UNITS.map((unit) => [
			unit,
			Number((bytes / DATA_SIZE_FACTORS[unit]).toPrecision(12)),
		]),
	) as Record<DataSizeUnit, number>;

	return { bytes, values };
}

export type DateDifference = {
	direction: "same" | "after" | "before";
	milliseconds: number;
	totalSeconds: number;
	totalMinutes: number;
	totalHours: number;
	totalDays: number;
	duration: { days: number; hours: number; minutes: number; seconds: number };
	human: string;
};

export function calculateDateDifference(
	startInput: string,
	endInput: string,
): DateDifference {
	const start = new Date(startInput);
	const end = new Date(endInput);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		throw new Error("Enter two valid dates or timestamps.");
	}

	const signedMilliseconds = end.getTime() - start.getTime();
	let remainder = Math.abs(signedMilliseconds);
	const days = Math.floor(remainder / 86_400_000);
	remainder %= 86_400_000;
	const hours = Math.floor(remainder / 3_600_000);
	remainder %= 3_600_000;
	const minutes = Math.floor(remainder / 60_000);
	remainder %= 60_000;
	const seconds = Math.floor(remainder / 1_000);
	const milliseconds = Math.abs(signedMilliseconds);
	const humanParts = [
		days ? `${days}d` : "",
		hours ? `${hours}h` : "",
		minutes ? `${minutes}m` : "",
		seconds || !milliseconds ? `${seconds}s` : "",
	].filter(Boolean);

	return {
		direction:
			signedMilliseconds === 0
				? "same"
				: signedMilliseconds > 0
					? "after"
					: "before",
		milliseconds,
		totalSeconds: milliseconds / 1_000,
		totalMinutes: milliseconds / 60_000,
		totalHours: milliseconds / 3_600_000,
		totalDays: milliseconds / 86_400_000,
		duration: { days, hours, minutes, seconds },
		human: humanParts.join(" "),
	};
}

const HTTP_STATUS_NAMES = [
	[100, "Continue"],
	[101, "Switching Protocols"],
	[102, "Processing"],
	[103, "Early Hints"],
	[200, "OK"],
	[201, "Created"],
	[202, "Accepted"],
	[203, "Non-Authoritative Information"],
	[204, "No Content"],
	[205, "Reset Content"],
	[206, "Partial Content"],
	[207, "Multi-Status"],
	[208, "Already Reported"],
	[226, "IM Used"],
	[300, "Multiple Choices"],
	[301, "Moved Permanently"],
	[302, "Found"],
	[303, "See Other"],
	[304, "Not Modified"],
	[307, "Temporary Redirect"],
	[308, "Permanent Redirect"],
	[400, "Bad Request"],
	[401, "Unauthorized"],
	[402, "Payment Required"],
	[403, "Forbidden"],
	[404, "Not Found"],
	[405, "Method Not Allowed"],
	[406, "Not Acceptable"],
	[407, "Proxy Authentication Required"],
	[408, "Request Timeout"],
	[409, "Conflict"],
	[410, "Gone"],
	[411, "Length Required"],
	[412, "Precondition Failed"],
	[413, "Content Too Large"],
	[414, "URI Too Long"],
	[415, "Unsupported Media Type"],
	[416, "Range Not Satisfiable"],
	[417, "Expectation Failed"],
	[418, "I'm a Teapot"],
	[421, "Misdirected Request"],
	[422, "Unprocessable Content"],
	[423, "Locked"],
	[424, "Failed Dependency"],
	[425, "Too Early"],
	[426, "Upgrade Required"],
	[428, "Precondition Required"],
	[429, "Too Many Requests"],
	[431, "Request Header Fields Too Large"],
	[451, "Unavailable For Legal Reasons"],
	[500, "Internal Server Error"],
	[501, "Not Implemented"],
	[502, "Bad Gateway"],
	[503, "Service Unavailable"],
	[504, "Gateway Timeout"],
	[505, "HTTP Version Not Supported"],
	[506, "Variant Also Negotiates"],
	[507, "Insufficient Storage"],
	[508, "Loop Detected"],
	[510, "Not Extended"],
	[511, "Network Authentication Required"],
] as const;

export type HttpStatusDetails = {
	code: number;
	name: string;
	category:
		| "Informational"
		| "Success"
		| "Redirection"
		| "Client Error"
		| "Server Error";
};

function getHttpStatusCategory(code: number): HttpStatusDetails["category"] {
	if (code < 200) return "Informational";
	if (code < 300) return "Success";
	if (code < 400) return "Redirection";
	if (code < 500) return "Client Error";
	return "Server Error";
}

export const HTTP_STATUSES: HttpStatusDetails[] = HTTP_STATUS_NAMES.map(
	([code, name]) => ({ code, name, category: getHttpStatusCategory(code) }),
);

export function searchHttpStatuses(query: string): HttpStatusDetails[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return HTTP_STATUSES;

	return HTTP_STATUSES.filter(
		(status) =>
			String(status.code).startsWith(normalized) ||
			status.name.toLowerCase().includes(normalized) ||
			status.category.toLowerCase().includes(normalized),
	);
}

export type HmacAlgorithm = "SHA1" | "SHA256" | "SHA512" | "MD5";

export function generateHmac(
	message: string,
	secret: string,
	algorithm: HmacAlgorithm,
): { hex: string; base64: string } {
	if (!secret) {
		throw new Error("A secret key is required.");
	}

	const digest =
		algorithm === "MD5"
			? CryptoJS.HmacMD5(message, secret)
			: algorithm === "SHA1"
				? CryptoJS.HmacSHA1(message, secret)
				: algorithm === "SHA256"
					? CryptoJS.HmacSHA256(message, secret)
					: CryptoJS.HmacSHA512(message, secret);

	return {
		hex: digest.toString(CryptoJS.enc.Hex),
		base64: digest.toString(CryptoJS.enc.Base64),
	};
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(input: string): string {
	const bytes = new TextEncoder().encode(input);
	let buffer = 0;
	let bits = 0;
	let output = "";

	for (const byte of bytes) {
		buffer = (buffer << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			output += BASE32_ALPHABET[(buffer >>> bits) & 31];
		}
	}

	if (bits > 0) {
		output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
	}

	return output.padEnd(Math.ceil(output.length / 8) * 8, "=");
}

export function decodeBase32(input: string): string {
	const normalized = input.toUpperCase().replace(/[\s=-]/g, "");
	if (!normalized) return "";
	if (
		[...normalized].some((character) => !BASE32_ALPHABET.includes(character))
	) {
		throw new Error("Base32 input contains unsupported characters.");
	}

	let buffer = 0;
	let bits = 0;
	const bytes: number[] = [];
	for (const character of normalized) {
		buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(character);
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((buffer >>> bits) & 255);
		}
	}

	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(
			new Uint8Array(bytes),
		);
	} catch {
		throw new Error("Decoded Base32 bytes are not valid UTF-8 text.");
	}
}

type ParsedSemVer = {
	major: number;
	minor: number;
	patch: number;
	prerelease: string[];
};

function parseSemVer(input: string): ParsedSemVer {
	const match = input
		.trim()
		.match(
			/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
		);
	if (!match) {
		throw new Error("Enter a valid semantic version such as 2.1.0-beta.1.");
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4]?.split(".") ?? [],
	};
}

export type SemVerComparison = {
	result: -1 | 0 | 1;
	relation: "older" | "equal" | "newer";
	summary: string;
};

export function compareSemVer(
	leftInput: string,
	rightInput: string,
): SemVerComparison {
	const left = parseSemVer(leftInput);
	const right = parseSemVer(rightInput);
	let result: -1 | 0 | 1 = 0;

	for (const key of ["major", "minor", "patch"] as const) {
		if (left[key] !== right[key]) {
			result = left[key] < right[key] ? -1 : 1;
			break;
		}
	}

	if (result === 0 && left.prerelease.length !== right.prerelease.length) {
		if (left.prerelease.length === 0) result = 1;
		else if (right.prerelease.length === 0) result = -1;
	}

	if (result === 0) {
		const length = Math.max(left.prerelease.length, right.prerelease.length);
		for (let index = 0; index < length; index += 1) {
			const leftPart = left.prerelease[index];
			const rightPart = right.prerelease[index];
			if (leftPart === rightPart) continue;
			if (leftPart === undefined) result = -1;
			else if (rightPart === undefined) result = 1;
			else {
				const leftNumeric = /^\d+$/.test(leftPart);
				const rightNumeric = /^\d+$/.test(rightPart);
				if (leftNumeric && rightNumeric) {
					result = Number(leftPart) < Number(rightPart) ? -1 : 1;
				} else if (leftNumeric !== rightNumeric) {
					result = leftNumeric ? -1 : 1;
				} else {
					result = leftPart < rightPart ? -1 : 1;
				}
			}
			break;
		}
	}

	const relation = result === 0 ? "equal" : result < 0 ? "older" : "newer";
	return {
		result,
		relation,
		summary:
			result === 0
				? `${leftInput.trim()} and ${rightInput.trim()} have equal precedence.`
				: `${leftInput.trim()} is ${relation} than ${rightInput.trim()}.`,
	};
}

function unquoteEnvValue(value: string): string {
	if (value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value) as string;
		} catch {
			throw new Error("A double-quoted environment value is malformed.");
		}
	}
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/\\'/g, "'");
	}
	return value.replace(/\s+#.*$/, "").trim();
}

export function envToJson(input: string): Record<string, string> {
	const output: Record<string, string> = {};
	input.split(/\r?\n/).forEach((rawLine, index) => {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) return;
		const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
		const equalsIndex = normalized.indexOf("=");
		if (equalsIndex < 1) {
			throw new Error(`Line ${index + 1} is not a KEY=value assignment.`);
		}
		const key = normalized.slice(0, equalsIndex).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
			throw new Error(`Line ${index + 1} contains an invalid variable name.`);
		}
		output[key] = unquoteEnvValue(normalized.slice(equalsIndex + 1).trim());
	});
	return output;
}

export function jsonToEnv(input: string): string {
	const value = JSON.parse(input) as unknown;
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Environment conversion requires a JSON object.");
	}

	return Object.entries(value)
		.map(([key, entry]) => {
			if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
				throw new Error(`'${key}' is not a valid environment variable name.`);
			}
			const normalized =
				entry === null
					? ""
					: typeof entry === "object"
						? JSON.stringify(entry)
						: String(entry);
			return `${key}=${JSON.stringify(normalized)}`;
		})
		.join("\n");
}

export function jsonLinesToJson(input: string): unknown[] {
	return input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => {
			try {
				return JSON.parse(line) as unknown;
			} catch {
				throw new Error(`Line ${index + 1} is not valid JSON.`);
			}
		});
}

export function jsonToJsonLines(input: string): string {
	const value = JSON.parse(input) as unknown;
	const entries = Array.isArray(value) ? value : [value];
	return entries.map((entry) => JSON.stringify(entry)).join("\n");
}

const CHMOD_SYMBOLS = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];

export type ChmodDetails = {
	octal: string;
	symbolic: string;
	owner: string;
	group: string;
	others: string;
};

export function calculateChmod(input: string): ChmodDetails {
	const normalized = input.trim();
	let octal: string;
	if (/^[0-7]{3}$/.test(normalized)) {
		octal = normalized;
	} else if (/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(normalized)) {
		octal = [
			normalized.slice(0, 3),
			normalized.slice(3, 6),
			normalized.slice(6, 9),
		]
			.map((segment) => String(CHMOD_SYMBOLS.indexOf(segment)))
			.join("");
	} else {
		throw new Error(
			"Enter a three-digit octal mode or a nine-character symbolic mode.",
		);
	}

	const labels = octal.split("").map((digit) => CHMOD_SYMBOLS[Number(digit)]);
	return {
		octal,
		symbolic: labels.join(""),
		owner: labels[0],
		group: labels[1],
		others: labels[2],
	};
}

const TRACKING_QUERY_PARAMS = new Set([
	"fbclid",
	"gclid",
	"mc_cid",
	"mc_eid",
	"ref",
]);

export type CanonicalUrlOptions = {
	removeTracking?: boolean;
	removeFragment?: boolean;
	removeTrailingSlash?: boolean;
};

export function canonicalizeUrl(
	input: string,
	options: CanonicalUrlOptions = {},
): string {
	const url = new URL(input.trim());
	if (!["http:", "https:"].includes(url.protocol)) {
		throw new Error("Only HTTP and HTTPS URLs can be canonicalized.");
	}
	if (url.username || url.password) {
		throw new Error("URLs containing embedded credentials are not accepted.");
	}

	if (options.removeTracking ?? true) {
		for (const key of [...url.searchParams.keys()]) {
			if (
				key.toLowerCase().startsWith("utm_") ||
				TRACKING_QUERY_PARAMS.has(key.toLowerCase())
			) {
				url.searchParams.delete(key);
			}
		}
	}
	url.searchParams.sort();
	if (options.removeFragment ?? true) url.hash = "";
	if ((options.removeTrailingSlash ?? true) && url.pathname !== "/") {
		url.pathname = url.pathname.replace(/\/+$/, "");
	}
	return url.toString();
}

export type MacAddressDetails = {
	normalized: string;
	compact: string;
	isUnicast: boolean;
	isMulticast: boolean;
	isLocallyAdministered: boolean;
	isUniversallyAdministered: boolean;
};

export function inspectMacAddress(input: string): MacAddressDetails {
	const compact = input.trim().replace(/[.:-]/g, "").toUpperCase();
	if (!/^[0-9A-F]{12}$/.test(compact)) {
		throw new Error("Enter a valid 48-bit MAC address.");
	}
	const firstOctet = Number.parseInt(compact.slice(0, 2), 16);
	const isMulticast = Boolean(firstOctet & 1);
	const isLocallyAdministered = Boolean(firstOctet & 2);
	return {
		normalized: compact.match(/.{2}/g)?.join(":") ?? compact,
		compact,
		isUnicast: !isMulticast,
		isMulticast,
		isLocallyAdministered,
		isUniversallyAdministered: !isLocallyAdministered,
	};
}

const MIME_ENTRIES = [
	["application/json", ["json"]],
	["application/ld+json", ["jsonld"]],
	["application/pdf", ["pdf"]],
	["application/wasm", ["wasm"]],
	["application/xml", ["xml"]],
	["application/zip", ["zip"]],
	["application/gzip", ["gz"]],
	["application/octet-stream", ["bin"]],
	["application/vnd.api+json", ["jsonapi"]],
	["application/x-tar", ["tar"]],
	["application/x-www-form-urlencoded", []],
	["font/otf", ["otf"]],
	["font/ttf", ["ttf"]],
	["font/woff", ["woff"]],
	["font/woff2", ["woff2"]],
	["image/avif", ["avif"]],
	["image/gif", ["gif"]],
	["image/jpeg", ["jpg", "jpeg"]],
	["image/png", ["png"]],
	["image/svg+xml", ["svg"]],
	["image/webp", ["webp"]],
	["text/css", ["css"]],
	["text/csv", ["csv"]],
	["text/html", ["html", "htm"]],
	["text/javascript", ["js", "mjs"]],
	["text/markdown", ["md", "markdown"]],
	["text/plain", ["txt", "log"]],
	["video/mp4", ["mp4"]],
	["video/webm", ["webm"]],
	["audio/mpeg", ["mp3"]],
	["audio/ogg", ["ogg"]],
] as const;

export type MimeTypeDetails = { mime: string; extensions: readonly string[] };

export function lookupMimeTypes(query: string): MimeTypeDetails[] {
	const normalized = query.trim().toLowerCase().replace(/^\./, "");
	return MIME_ENTRIES.filter(
		([mime, extensions]) =>
			!normalized ||
			mime.includes(normalized) ||
			extensions.some((extension) => extension.includes(normalized)),
	).map(([mime, extensions]) => ({ mime, extensions }));
}

function estimateSyllables(word: string): number {
	const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
	if (!normalized) return 0;
	if (normalized.length <= 3) return 1;
	const withoutSilentEnding = normalized.replace(/(?:es|ed|e)$/, "");
	return Math.max(1, withoutSilentEnding.match(/[aeiouy]+/g)?.length ?? 1);
}

export type ReadabilityAnalysis = {
	characters: number;
	words: number;
	sentences: number;
	paragraphs: number;
	readingMinutes: number;
	readingEase: number;
	gradeLevel: number;
	label: string;
};

export function analyzeReadability(input: string): ReadabilityAnalysis {
	const text = input.trim();
	const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
	const sentences = text
		? Math.max(1, (text.match(/[.!?]+(?=\s|$)/g) ?? []).length)
		: 0;
	const paragraphs = text
		? text.split(/\n\s*\n/).filter((entry) => entry.trim()).length
		: 0;
	const syllables = words.reduce(
		(sum, word) => sum + estimateSyllables(word),
		0,
	);
	const readingEase =
		words.length && sentences
			? 206.835 -
				1.015 * (words.length / sentences) -
				84.6 * (syllables / words.length)
			: 0;
	const gradeLevel =
		words.length && sentences
			? 0.39 * (words.length / sentences) +
				11.8 * (syllables / words.length) -
				15.59
			: 0;
	const roundedEase = Math.round(readingEase * 10) / 10;

	return {
		characters: Array.from(text).length,
		words: words.length,
		sentences,
		paragraphs,
		readingMinutes: Math.round((words.length / 200) * 10) / 10,
		readingEase: roundedEase,
		gradeLevel: Math.max(0, Math.round(gradeLevel * 10) / 10),
		label:
			roundedEase >= 80
				? "Easy"
				: roundedEase >= 60
					? "Standard"
					: roundedEase >= 30
						? "Difficult"
						: "Very difficult",
	};
}

const SECURITY_HEADER_RULES = [
	{
		name: "content-security-policy",
		label: "Content-Security-Policy",
		recommendation:
			"Restrict permitted script, style, image, and connection sources.",
	},
	{
		name: "strict-transport-security",
		label: "Strict-Transport-Security",
		recommendation:
			"Enforce HTTPS with a long max-age after validating every subdomain.",
	},
	{
		name: "x-content-type-options",
		label: "X-Content-Type-Options",
		recommendation: "Set the value to nosniff.",
	},
	{
		name: "referrer-policy",
		label: "Referrer-Policy",
		recommendation:
			"Limit cross-origin referrer data, such as strict-origin-when-cross-origin.",
	},
	{
		name: "permissions-policy",
		label: "Permissions-Policy",
		recommendation:
			"Disable browser capabilities that the application does not use.",
	},
	{
		name: "x-frame-options",
		label: "X-Frame-Options",
		recommendation: "Set DENY or SAMEORIGIN, or use CSP frame-ancestors.",
	},
] as const;

export type SecurityHeadersAnalysis = {
	score: number;
	present: string[];
	missing: string[];
	findings: string[];
};

export function analyzeSecurityHeaders(input: string): SecurityHeadersAnalysis {
	const headers = new Map<string, string>();
	for (const rawLine of input.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || /^HTTP\/\d(?:\.\d)?\s+\d{3}/i.test(line)) continue;
		const separator = line.indexOf(":");
		if (separator < 1) continue;
		headers.set(
			line.slice(0, separator).trim().toLowerCase(),
			line.slice(separator + 1).trim(),
		);
	}

	const present: string[] = [];
	const missing: string[] = [];
	const findings: string[] = [];
	for (const rule of SECURITY_HEADER_RULES) {
		const value = headers.get(rule.name);
		if (value) present.push(rule.label);
		else {
			missing.push(rule.label);
			findings.push(`${rule.label}: ${rule.recommendation}`);
		}
	}

	const contentSecurityPolicy = headers
		.get("content-security-policy")
		?.toLowerCase();
	if (contentSecurityPolicy?.includes("unsafe-inline")) {
		findings.push(
			"Content-Security-Policy contains unsafe-inline; prefer nonces or hashes where possible.",
		);
	}
	if (contentSecurityPolicy?.includes("unsafe-eval")) {
		findings.push(
			"Content-Security-Policy contains unsafe-eval, which weakens script protections.",
		);
	}
	const contentTypeOptions = headers
		.get("x-content-type-options")
		?.toLowerCase();
	if (contentTypeOptions && contentTypeOptions !== "nosniff") {
		findings.push("X-Content-Type-Options should be exactly nosniff.");
	}

	return {
		score: Math.round((present.length / SECURITY_HEADER_RULES.length) * 100),
		present,
		missing,
		findings: findings.length
			? findings
			: ["All baseline security headers are present."],
	};
}
