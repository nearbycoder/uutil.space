import { type LocalTool, print } from "./types";

function scaled(text: string, factor: bigint) {
	if (!/^\d+(?:\.\d{1,3})?$/.test(text))
		throw new Error(
			"Use non-negative decimals with up to three fractional digits.",
		);
	const [whole, fraction = ""] = text.split("."),
		denominator = 10n ** BigInt(fraction.length),
		n = BigInt(whole + fraction) * factor;
	if (n % denominator !== 0n)
		throw new Error("Durations must resolve to whole milliseconds.");
	return n / denominator;
}
function parse(text: string, format: string) {
	const s = text.trim(),
		negative = s.startsWith("-"),
		body = s.replace(/^[-+]/, "");
	if (s.length > 100)
		throw new Error("Keep duration lines below 100 characters.");
	let n = 0n;
	if (format === "Milliseconds" || format === "Seconds")
		n = scaled(body, format === "Seconds" ? 1000n : 1n);
	else if (format === "Clock") {
		const m = /^(\d+):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/.exec(body);
		if (!m) throw new Error("Clock format is hours:MM:SS with optional .mmm.");
		n =
			BigInt(m[1]) * 3600000n +
			BigInt(m[2]) * 60000n +
			BigInt(m[3]) * 1000n +
			BigInt((m[4] ?? "").padEnd(3, "0"));
	} else {
		const tokens = /(\d+(?:\.\d{1,3})?)\s*(ms|s|m|h|d)\s*/gy;
		let position = 0;
		const factors: Record<string, bigint> = {
			ms: 1n,
			s: 1000n,
			m: 60000n,
			h: 3600000n,
			d: 86400000n,
		};
		while (position < body.length) {
			tokens.lastIndex = position;
			const match = tokens.exec(body);
			if (!match)
				throw new Error(
					"Use unit tokens such as 1h 30m 5.250s; one sign applies to the entire line.",
				);
			n += scaled(match[1], factors[match[2]]);
			position = tokens.lastIndex;
		}
		if (!body) throw new Error("A duration is required.");
	}
	if (n > 1000000000000000000n)
		throw new Error("A duration exceeds 10^18 milliseconds.");
	return negative ? -n : n;
}
function describe(n: bigint) {
	const sign = n < 0n ? "-" : "",
		a = n < 0n ? -n : n,
		ms = (a % 1000n).toString().padStart(3, "0");
	return {
		milliseconds: n.toString(),
		seconds: `${sign + a / 1000n}.${ms}`,
		clock: `${sign + a / 3600000n}:${((a / 60000n) % 60n).toString().padStart(2, "0")}:${((a / 1000n) % 60n).toString().padStart(2, "0")}.${ms}`,
		parts: {
			sign: n < 0n ? -1 : 1,
			days: (a / 86400000n).toString(),
			hours: Number((a / 3600000n) % 24n),
			minutes: Number((a / 60000n) % 60n),
			seconds: Number((a / 1000n) % 60n),
			milliseconds: Number(a % 1000n),
		},
	};
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Durations (one per line)",
			value: "1h 30m\n45m\n-15m",
		},
		{
			key: "format",
			label: "Input format",
			type: "select",
			value: "Unit tokens",
			options: ["Unit tokens", "Clock", "Seconds", "Milliseconds"],
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Sum",
			options: ["Sum", "Subtract subsequent", "Average", "Minimum", "Maximum"],
		},
		{
			key: "rounding",
			label: "Average rounding",
			type: "select",
			value: "Nearest millisecond",
			options: ["Nearest millisecond", "Truncate"],
		},
	],
	filename: "duration-result.json",
	smoke: '"clock": "2:00:00.000"',
	help: "Parses up to 1,000 nonblank lines; days are fixed 24-hour durations, not calendar days. Unit tokens support d, h, m, s and ms; repeated units are added. A leading sign applies to the entire line. Subtract subsequent means first minus every following value. Arithmetic is exact in milliseconds; averages round half away from zero or truncate toward zero and report whether rounding occurred. Decimal totals are strings to preserve precision.",
	run: (v) => {
		const lines = v.input
			.split(/\r\n|\r|\n/)
			.map((text, i) => ({ text, line: i + 1 }))
			.filter((x) => x.text.trim());
		if (!lines.length || lines.length > 1000)
			throw new Error("Provide 1–1,000 duration lines.");
		const values = lines.map((x) => {
			try {
				return parse(x.text, v.format);
			} catch (e) {
				throw new Error(
					`Line ${x.line}: ${e instanceof Error ? e.message : "Invalid duration"}`,
				);
			}
		});
		const sum = values.reduce((a, b) => a + b, 0n);
		let result = sum,
			rounded = false;
		if (v.operation === "Subtract subsequent") result = values[0] * 2n - sum;
		else if (v.operation === "Minimum")
			result = values.reduce((a, b) => (a < b ? a : b));
		else if (v.operation === "Maximum")
			result = values.reduce((a, b) => (a > b ? a : b));
		else if (v.operation === "Average") {
			const n = BigInt(values.length),
				remainder = sum % n;
			result = sum / n;
			rounded = remainder !== 0n;
			if (
				v.rounding === "Nearest millisecond" &&
				(remainder < 0n ? -remainder : remainder) * 2n >= n
			)
				result += sum < 0n ? -1n : 1n;
		}
		return print({
			count: values.length,
			operation: v.operation,
			rounded,
			...describe(result),
			inputs: values.map((n, i) => ({ line: lines[i].line, ...describe(n) })),
		});
	},
};
