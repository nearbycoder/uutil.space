import { integer, type LocalTool, print } from "./types";

function parse(text: string, base: number): bigint {
	let source = text.trim(),
		sign = 1n;
	if (source.startsWith("-") || source.startsWith("+")) {
		if (source[0] === "-") sign = -1n;
		source = source.slice(1);
	}
	const prefix =
		base === 16 ? "0x" : base === 8 ? "0o" : base === 2 ? "0b" : "";
	if (prefix && source.toLowerCase().startsWith(prefix))
		source = source.slice(2);
	if (!source.length || source.length > 1024)
		throw new Error("Use between 1 and 1,024 digits per operand.");
	let value = 0n;
	for (const char of source.toLowerCase()) {
		const digit = "0123456789abcdef".indexOf(char);
		if (digit < 0 || digit >= base)
			throw new Error(`Invalid base-${base} digit.`);
		value = value * BigInt(base) + BigInt(digit);
	}
	return value * sign;
}
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Integer A", type: "text", value: "ff" },
		{ key: "other", label: "Integer B", type: "text", value: "10" },
		{
			key: "base",
			label: "Input base (both operands)",
			type: "select",
			value: "16",
			options: ["2", "8", "10", "16"],
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
				"Remainder",
				"Compare",
			],
		},
	],
	help: "Calculate with exact signed integers in binary, octal, decimal or hexadecimal, without floating-point rounding. Optional matching 0b/0o/0x prefixes are accepted; separators and fractional digits are not. Results include all four bases as strings. Division truncates toward zero and includes its remainder; remainder has the dividend's sign. Nondecimal negative values use a minus sign, not two's complement. At most 1,024 digits per operand.",
	filename: "radix-result.json",
	smoke: '"decimal": "271"',
	run: (v) => {
		const base = integer(v.base, 2, 16),
			a = parse(v.input, base),
			b = parse(v.other, base);
		if (v.operation === "Compare")
			return print({
				comparison: a === b ? 0 : a < b ? -1 : 1,
				relation: a === b ? "equal" : a < b ? "less than" : "greater than",
			});
		if ((v.operation === "Divide" || v.operation === "Remainder") && b === 0n)
			throw new Error("Cannot divide by zero.");
		const result =
			v.operation === "Add"
				? a + b
				: v.operation === "Subtract"
					? a - b
					: v.operation === "Multiply"
						? a * b
						: v.operation === "Divide"
							? a / b
							: a % b;
		return print({
			decimal: result.toString(),
			binary: result.toString(2),
			octal: result.toString(8),
			hexadecimal: result.toString(16),
			remainderDecimal:
				v.operation === "Divide" ? (a % b).toString() : undefined,
		});
	},
};
