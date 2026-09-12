import { integer, type LocalTool, print } from "./types";

type Decimal = { n: bigint; scale: number };
function normalize(d: Decimal) {
	while (d.scale > 0 && d.n % 10n === 0n) {
		d.n /= 10n;
		d.scale--;
	}
	return d;
}
function decimal(text: string): Decimal {
	const s = text.trim();
	if (s.length > 64 || !/^[-+]?(?:\d+(?:\.\d{0,12})?|\.\d{1,12})$/.test(s))
		throw new Error(
			"Use decimal input up to 64 characters and 12 fractional digits; no exponent notation.",
		);
	const negative = s.startsWith("-"),
		[whole, fraction = ""] = s.replace(/^[-+]/, "").split(".");
	return normalize({
		n: BigInt((negative ? "-" : "") + (whole || "0") + fraction),
		scale: fraction.length,
	});
}
function format(d: Decimal) {
	const sign = d.n < 0n ? "-" : "",
		digits = (d.n < 0n ? -d.n : d.n).toString();
	if (d.scale > 2000 || digits.length > 2000)
		throw new Error("A sequence value exceeds 2,000 digits or decimal places.");
	const padded = digits.padStart(d.scale + 1, "0");
	return (
		sign +
		(d.scale
			? `${padded.slice(0, -d.scale)}.${padded.slice(-d.scale)}`
			: padded)
	);
}
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Starting value", type: "text", value: "0" },
		{
			key: "change",
			label: "Step (arithmetic) or ratio (geometric)",
			type: "text",
			value: "0.1",
		},
		{
			key: "mode",
			label: "Sequence type",
			type: "select",
			value: "Arithmetic",
			options: ["Arithmetic", "Geometric"],
		},
		{ key: "count", label: "Number of values", type: "text", value: "6" },
		{
			key: "output",
			label: "Output format",
			type: "select",
			value: "JSON strings",
			options: ["JSON strings", "One per line", "Comma separated"],
		},
	],
	filename: "number-sequence.txt",
	smoke: '"0.3"',
	help: "Includes the starting value as item one. Arithmetic adds the step; geometric multiplies by the ratio. Negative and zero steps/ratios are supported. Uses exact decimal BigInt arithmetic, not floating-point increments. JSON exports strings intentionally to preserve precision. Up to 1,000 values, 2,000 digits/decimal places per value and 1 MB of value text. Excessive geometric growth or precision is rejected.",
	run: (v) => {
		let current = decimal(v.input);
		const change = decimal(v.change),
			count = integer(v.count, 1, 1000),
			values: string[] = [];
		let size = 0;
		for (let i = 0; i < count; i++) {
			const value = format(current);
			size += value.length;
			if (size > 1000000) throw new Error("Sequence exceeds 1 MB.");
			values.push(value);
			if (i === count - 1) break;
			if (v.mode === "Geometric")
				current = normalize({
					n: current.n * change.n,
					scale: current.scale + change.scale,
				});
			else {
				const scale = Math.max(current.scale, change.scale);
				current = normalize({
					n:
						current.n * 10n ** BigInt(scale - current.scale) +
						change.n * 10n ** BigInt(scale - change.scale),
					scale,
				});
			}
		}
		return v.output === "JSON strings"
			? print(values)
			: values.join(v.output === "One per line" ? "\n" : ", ");
	},
};
