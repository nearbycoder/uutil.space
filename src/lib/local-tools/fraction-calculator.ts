import { integer, type LocalTool, print } from "./types";

type Fraction = { n: bigint; d: bigint };
function reduce(n: bigint, d: bigint): Fraction {
	if (d === 0n) throw new Error("A denominator or divisor cannot be zero.");
	if (d < 0n) {
		n = -n;
		d = -d;
	}
	let a = n < 0n ? -n : n,
		b = d;
	while (b) {
		const r = a % b;
		a = b;
		b = r;
	}
	return { n: n / a, d: d / a };
}
function parse(text: string): Fraction {
	const s = text.trim();
	if (s.length > 200)
		throw new Error("Keep each fraction below 200 characters.");
	if (s.includes("/")) {
		const parts = s.split("/").map((x) => x.trim());
		if (parts.length !== 2 || parts.some((x) => !/^[-+]?\d{1,100}$/.test(x)))
			throw new Error(
				"Use numerator/denominator with integer components up to 100 digits.",
			);
		return reduce(BigInt(parts[0]), BigInt(parts[1]));
	}
	if (!/^[-+]?(?:\d{1,100}(?:\.\d{0,50})?|\.\d{1,50})$/.test(s))
		throw new Error(
			"Use a fraction, integer or decimal with up to 50 fractional digits.",
		);
	const negative = s.startsWith("-"),
		[whole, part = ""] = s.replace(/^[-+]/, "").split(".");
	return reduce(
		BigInt((negative ? "-" : "") + (whole || "0") + part),
		10n ** BigInt(part.length),
	);
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "First fraction or decimal",
			type: "text",
			value: "1/3",
		},
		{
			key: "other",
			label: "Second fraction or decimal",
			type: "text",
			value: "1/6",
			optional: true,
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Add",
			options: [
				"Add",
				"Subtract",
				"Multiply",
				"Divide",
				"Compare",
				"Simplify first",
			],
		},
		{
			key: "places",
			label: "Decimal preview places",
			type: "text",
			value: "12",
		},
		{
			key: "rounding",
			label: "Decimal preview rounding",
			type: "select",
			value: "Half away from zero",
			options: ["Half away from zero", "Truncate"],
		},
	],
	filename: "fraction-result.json",
	smoke: '"fraction": "1/2"',
	help: "All fraction arithmetic and comparisons use exact BigInt integers. Fractions are reduced with a positive denominator; decimal inputs are converted exactly. Mixed-number output uses a leading sign for the entire value. Decimal previews allow 0–100 places and explicitly report whether the representation is exact. Inputs support integers, decimal notation, or integer/integer fractions; no mixed-number or exponent input. The second value is ignored for Simplify first.",
	run: (v) => {
		const a = parse(v.input),
			b = v.operation === "Simplify first" ? { n: 0n, d: 1n } : parse(v.other),
			places = integer(v.places, 0, 100);
		let result: Fraction;
		if (v.operation === "Compare") {
			const diff = a.n * b.d - b.n * a.d;
			return print({
				comparison: diff < 0n ? -1 : diff > 0n ? 1 : 0,
				relation:
					diff < 0n ? "less than" : diff > 0n ? "greater than" : "equal",
				first: `${a.n}/${a.d}`,
				second: `${b.n}/${b.d}`,
			});
		}
		switch (v.operation) {
			case "Add":
				result = reduce(a.n * b.d + b.n * a.d, a.d * b.d);
				break;
			case "Subtract":
				result = reduce(a.n * b.d - b.n * a.d, a.d * b.d);
				break;
			case "Multiply":
				result = reduce(a.n * b.n, a.d * b.d);
				break;
			case "Divide":
				result = reduce(a.n * b.d, a.d * b.n);
				break;
			default:
				result = a;
		}
		const { n, d } = result,
			abs = n < 0n ? -n : n,
			scale = 10n ** BigInt(places),
			remainder = (abs * scale) % d;
		let decimal = (abs * scale) / d;
		if (v.rounding === "Half away from zero" && remainder * 2n >= d) decimal++;
		const digits = decimal.toString().padStart(places + 1, "0"),
			preview =
				(n < 0n && decimal !== 0n ? "-" : "") +
				(places
					? `${digits.slice(0, -places)}.${digits.slice(-places)}`
					: digits),
			whole = abs / d,
			rest = abs % d;
		return print({
			fraction: `${n}/${d}`,
			numerator: n.toString(),
			denominator: d.toString(),
			mixedNumber:
				(n < 0n ? "-" : "") +
				(rest === 0n
					? whole.toString()
					: whole === 0n
						? `${rest}/${d}`
						: `${whole} ${rest}/${d}`),
			decimalPreview: preview,
			decimalPlaces: places,
			decimalExact: remainder === 0n,
			rounding: v.rounding,
		});
	},
};
