import { json, object } from "./local-tools/types";

export function finite(text: string, min = -1e100, max = 1e100): number {
	if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()))
		throw new Error("Enter a finite decimal number.");
	const value = Number(text);
	if (!Number.isFinite(value) || value < min || value > max)
		throw new Error(`Use a number between ${min} and ${max}.`);
	return value;
}

export function array(text: string, limit = 5000): unknown[] {
	const value = json(text);
	if (!Array.isArray(value) || value.length > limit)
		throw new Error(`Enter a JSON array with at most ${limit} items.`);
	return value;
}

export function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (object(value))
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
			.join(",")}}`;
	return JSON.stringify(value);
}

export function numbers(text: string, limit = 5000): number[] {
	const tokens = text.trim().split(/[\s,;]+/);
	if (!text.trim() || tokens.length > limit)
		throw new Error(`Enter between 1 and ${limit} numbers.`);
	return tokens.map((token) => finite(token));
}
