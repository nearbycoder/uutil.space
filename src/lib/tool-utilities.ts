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
