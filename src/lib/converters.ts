export type ParsedCurl = {
	url: string;
	method: string;
	headers: Record<string, string>;
	data: string | null;
};

export type CurlTarget = "node-fetch" | "javascript" | "python" | "go" | "php";

export type RegexRunResult = {
	matches: Array<{
		index: number;
		match: string;
		position: number | undefined;
		groups: Record<string, string> | null;
	}>;
	replacement: string;
};

export function parseTimestampInput(input: string): Date {
	const value = input.trim();
	if (!value) {
		throw new Error("Enter a Unix timestamp or date string.");
	}

	let date: Date;
	if (/^-?\d+$/.test(value)) {
		const numeric = Number(value);
		if (!Number.isFinite(numeric)) {
			throw new Error("Timestamp is outside the supported range.");
		}

		const milliseconds = Math.abs(numeric) >= 100_000_000_000;
		date = new Date(milliseconds ? numeric : numeric * 1000);
	} else {
		date = new Date(value);
	}

	if (Number.isNaN(date.getTime())) {
		throw new Error("Could not parse that timestamp or date.");
	}

	return date;
}

export function unescapeBackslashes(input: string): string {
	let output = "";

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		if (char !== "\\" || index === input.length - 1) {
			output += char;
			continue;
		}

		const next = input[index + 1];
		const simpleEscapes: Record<string, string> = {
			0: "\0",
			b: "\b",
			f: "\f",
			n: "\n",
			r: "\r",
			t: "\t",
			v: "\v",
			"\\": "\\",
			'"': '"',
			"'": "'",
		};

		if (next in simpleEscapes) {
			output += simpleEscapes[next];
			index += 1;
			continue;
		}

		if (next === "x") {
			const hex = input.slice(index + 2, index + 4);
			if (/^[\da-f]{2}$/i.test(hex)) {
				output += String.fromCodePoint(Number.parseInt(hex, 16));
				index += 3;
				continue;
			}
		}

		if (next === "u" && input[index + 2] === "{") {
			const closingBrace = input.indexOf("}", index + 3);
			const hex = input.slice(index + 3, closingBrace);
			if (
				closingBrace > -1 &&
				/^[\da-f]{1,6}$/i.test(hex) &&
				Number.parseInt(hex, 16) <= 0x10ffff
			) {
				output += String.fromCodePoint(Number.parseInt(hex, 16));
				index = closingBrace;
				continue;
			}
		}

		if (next === "u") {
			const hex = input.slice(index + 2, index + 6);
			if (/^[\da-f]{4}$/i.test(hex)) {
				output += String.fromCharCode(Number.parseInt(hex, 16));
				index += 5;
				continue;
			}
		}

		output += `\\${next}`;
		index += 1;
	}

	return output;
}

export function runRegex(
	pattern: string,
	flags: string,
	text: string,
	replacement: string,
): RegexRunResult {
	const replacementRegex = new RegExp(pattern, flags);
	const matchFlags = flags.includes("g") ? flags : `${flags}g`;
	const matchRegex = new RegExp(pattern, matchFlags);
	const matches = Array.from(text.matchAll(matchRegex)).map((match, index) => ({
		index,
		match: match[0],
		position: match.index,
		groups: match.groups ?? null,
	}));

	return {
		matches,
		replacement: text.replace(replacementRegex, replacement),
	};
}

export function parseBaseToBigInt(input: string, base: number): bigint {
	const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const normalized = input.trim().toUpperCase();
	if (!normalized) {
		throw new Error("Value is required.");
	}

	if (!Number.isInteger(base) || base < 2 || base > 36) {
		throw new Error("Base must be an integer from 2 to 36.");
	}

	const sign = normalized.startsWith("-") ? -1n : 1n;
	const body = normalized.replace(/^[+-]/, "");
	if (!body) {
		throw new Error("Value must contain at least one digit.");
	}

	let value = 0n;
	for (const char of body) {
		const digit = digits.indexOf(char);
		if (digit < 0 || digit >= base) {
			throw new Error(`Invalid digit '${char}' for base ${base}.`);
		}
		value = value * BigInt(base) + BigInt(digit);
	}

	return sign * value;
}

export function formatBigIntToBase(value: bigint, base: number): string {
	const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	if (!Number.isInteger(base) || base < 2 || base > 36) {
		throw new Error("Base must be an integer from 2 to 36.");
	}
	if (value === 0n) {
		return "0";
	}

	const negative = value < 0n;
	let remainder = negative ? -value : value;
	let output = "";

	while (remainder > 0n) {
		const digit = Number(remainder % BigInt(base));
		output = `${digits[digit]}${output}`;
		remainder /= BigInt(base);
	}

	return negative ? `-${output}` : output;
}

function tokenizeShellLike(input: string): string[] {
	const tokens: string[] = [];
	let token = "";
	let quote: '"' | "'" | null = null;
	let escaped = false;

	for (const char of input) {
		if (escaped) {
			token += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) {
				quote = null;
			} else {
				token += char;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (/\s/.test(char)) {
			if (token) {
				tokens.push(token);
				token = "";
			}
			continue;
		}

		token += char;
	}

	if (quote) {
		throw new Error("cURL command contains an unterminated quote.");
	}
	if (escaped) {
		token += "\\";
	}
	if (token) {
		tokens.push(token);
	}

	return tokens;
}

function splitHeader(header: string): [string, string] | null {
	const splitIndex = header.indexOf(":");
	if (splitIndex <= 0) {
		return null;
	}
	return [
		header.slice(0, splitIndex).trim(),
		header.slice(splitIndex + 1).trim(),
	];
}

export function parseCurlCommand(input: string): ParsedCurl {
	const tokens = tokenizeShellLike(input.trim());
	if (!tokens.length || tokens[0].toLowerCase() !== "curl") {
		throw new Error("Input must start with 'curl'.");
	}

	let method = "GET";
	let url = "";
	let data: string | null = null;
	const headers: Record<string, string> = {};

	for (let index = 1; index < tokens.length; index += 1) {
		const token = tokens[index];
		const next = tokens[index + 1];

		if (token === "-X" || token === "--request") {
			if (!next) throw new Error(`${token} requires a method.`);
			method = next.toUpperCase();
			index += 1;
			continue;
		}
		if (token.startsWith("-X") && token.length > 2) {
			method = token.slice(2).toUpperCase();
			continue;
		}
		if (token.startsWith("--request=")) {
			method = token.slice("--request=".length).toUpperCase();
			continue;
		}

		let headerValue: string | null = null;
		if (token === "-H" || token === "--header") {
			if (!next) throw new Error(`${token} requires a header.`);
			headerValue = next;
			index += 1;
		} else if (token.startsWith("-H") && token.length > 2) {
			headerValue = token.slice(2);
		} else if (token.startsWith("--header=")) {
			headerValue = token.slice("--header=".length);
		}
		if (headerValue !== null) {
			const header = splitHeader(headerValue);
			if (!header) throw new Error(`Invalid header: ${headerValue}`);
			headers[header[0]] = header[1];
			continue;
		}

		let dataValue: string | null = null;
		if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) {
			if (!next) throw new Error(`${token} requires a value.`);
			dataValue = next;
			index += 1;
		} else if (token.startsWith("--data=")) {
			dataValue = token.slice("--data=".length);
		} else if (token.startsWith("--data-raw=")) {
			dataValue = token.slice("--data-raw=".length);
		}
		if (dataValue !== null) {
			data = dataValue;
			continue;
		}

		if (token === "--url") {
			if (!next) throw new Error("--url requires a value.");
			url = next;
			index += 1;
			continue;
		}
		if (token.startsWith("--url=")) {
			url = token.slice("--url=".length);
			continue;
		}

		if (!token.startsWith("-") && /^[a-z][a-z\d+.-]*:\/\//i.test(token)) {
			url = token;
		}
	}

	if (!url) {
		throw new Error("Could not detect a target URL in the cURL command.");
	}

	if (data !== null && method === "GET") {
		method = "POST";
	}

	return { url, method, headers, data };
}

function renderJavaScriptOptions(parsed: ParsedCurl): string {
	const lines = [`method: ${JSON.stringify(parsed.method)}`];
	if (Object.keys(parsed.headers).length > 0) {
		lines.push(`headers: ${JSON.stringify(parsed.headers, null, 2)}`);
	}
	if (parsed.data !== null) {
		lines.push(`body: ${JSON.stringify(parsed.data)}`);
	}
	return lines.map((line) => `  ${line.replace(/\n/g, "\n  ")}`).join(",\n");
}

export function renderCurlAsCode(
	parsed: ParsedCurl,
	target: CurlTarget,
): string {
	const url = JSON.stringify(parsed.url);

	if (target === "node-fetch" || target === "javascript") {
		const prefix =
			target === "node-fetch" ? 'import fetch from "node-fetch";\n\n' : "";
		return `${prefix}const response = await fetch(${url}, {\n${renderJavaScriptOptions(parsed)}\n});\n\nconst data = await response.text();\nconsole.log(data);`;
	}

	if (target === "python") {
		const args = [JSON.stringify(parsed.method), url];
		if (Object.keys(parsed.headers).length > 0) {
			args.push(`headers=${JSON.stringify(parsed.headers, null, 2)}`);
		}
		if (parsed.data !== null) {
			args.push(`data=${JSON.stringify(parsed.data)}`);
		}
		return `import requests\n\nresponse = requests.request(${args.join(", ")})\nprint(response.text)`;
	}

	if (target === "go") {
		const imports = ['"fmt"', '"io"', '"net/http"'];
		const body =
			parsed.data === null
				? "nil"
				: `strings.NewReader(${JSON.stringify(parsed.data)})`;
		if (parsed.data !== null) imports.push('"strings"');
		const headerLines = Object.entries(parsed.headers)
			.map(
				([key, value]) =>
					`  req.Header.Set(${JSON.stringify(key)}, ${JSON.stringify(value)})`,
			)
			.join("\n");
		return `package main\n\nimport (\n  ${imports.join("\n  ")}\n)\n\nfunc main() {\n  req, err := http.NewRequest(${JSON.stringify(parsed.method)}, ${url}, ${body})\n  if err != nil { panic(err) }\n${headerLines ? `${headerLines}\n` : ""}  res, err := http.DefaultClient.Do(req)\n  if err != nil { panic(err) }\n  defer res.Body.Close()\n\n  data, err := io.ReadAll(res.Body)\n  if err != nil { panic(err) }\n  fmt.Println(string(data))\n}`;
	}

	const phpOptions = [
		`CURLOPT_URL => ${url}`,
		"CURLOPT_RETURNTRANSFER => true",
		`CURLOPT_CUSTOMREQUEST => ${JSON.stringify(parsed.method)}`,
	];
	const headerValues = Object.entries(parsed.headers).map(
		([key, value]) => `${key}: ${value}`,
	);
	if (headerValues.length > 0) {
		phpOptions.push(`CURLOPT_HTTPHEADER => ${JSON.stringify(headerValues)}`);
	}
	if (parsed.data !== null) {
		phpOptions.push(`CURLOPT_POSTFIELDS => ${JSON.stringify(parsed.data)}`);
	}
	return `<?php\n\n$ch = curl_init();\ncurl_setopt_array($ch, [\n  ${phpOptions.join(",\n  ")}\n]);\n\n$response = curl_exec($ch);\nif ($response === false) {\n  throw new RuntimeException(curl_error($ch));\n}\ncurl_close($ch);\n\necho $response;`;
}

export function decodeHexToAscii(value: string): string {
	const clean = value
		.trim()
		.replace(/0x/gi, "")
		.replace(/[\s,;:_-]+/g, "");
	if (!clean) {
		throw new Error("Enter at least one hexadecimal byte.");
	}
	if (!/^[\da-f]+$/i.test(clean)) {
		throw new Error("Hex input may only contain digits 0-9 and letters A-F.");
	}
	if (clean.length % 2 !== 0) {
		throw new Error("Hex input must contain complete two-digit bytes.");
	}

	const pairs = clean.match(/.{2}/g) ?? [];
	const bytes = Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new Error("Hex bytes are not valid UTF-8 text.");
	}
}

export function encodeAsciiToHex(value: string): string {
	return Array.from(new TextEncoder().encode(value))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join(" ");
}

function words(input: string): string[] {
	return input
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.replace(/([a-z\d])([A-Z])/g, "$1 $2")
		.replace(/[^a-z\d]+/gi, " ")
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
}

export function toCamelCase(input: string): string {
	return words(input)
		.map((word, index) =>
			index === 0 ? word : `${word[0].toUpperCase()}${word.slice(1)}`,
		)
		.join("");
}

export function toPascalCase(input: string): string {
	const camel = toCamelCase(input);
	return camel ? `${camel[0].toUpperCase()}${camel.slice(1)}` : "";
}

export function toSnakeCase(input: string): string {
	return words(input).join("_");
}

export function toKebabCase(input: string): string {
	return words(input).join("-");
}

export function toTitleCase(input: string): string {
	return words(input)
		.map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
		.join(" ");
}
