import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Operand A", type: "text", value: "0xF0" },
		{
			key: "other",
			label: "Operand B (AND, OR, XOR only)",
			type: "text",
			value: "0xCC",
			optional: true,
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "AND",
			options: [
				"AND",
				"OR",
				"XOR",
				"NOT",
				"Shift left",
				"Logical shift right",
				"Arithmetic shift right",
				"Rotate left",
				"Rotate right",
			],
		},
		{
			key: "width",
			label: "Bit width",
			type: "select",
			value: "8",
			options: ["8", "16", "32", "64", "128"],
		},
		{
			key: "shift",
			label: "Shift or rotation count",
			type: "text",
			value: "1",
		},
		{
			key: "overflow",
			label: "Out-of-range operands",
			type: "select",
			value: "Reject",
			options: ["Reject", "Wrap"],
		},
	],
	filename: "bitwise-result.json",
	smoke: '"hex": "0xc0"',
	help: "Accepts decimal, 0x hex, 0b binary and 0o octal integers with an optional minus sign. Reject accepts signed negatives down to −2^(width−1) and unsigned positives up to 2^width−1. Wrap keeps the low bits. All results are masked to the selected width and expose both signed two’s-complement and unsigned interpretations. Arithmetic right shift sign-extends; logical right shift zero-fills. Shift counts 0–1,024 are not reduced modulo width; rotation counts are. Decimal outputs are strings to avoid precision loss.",
	run: (v) => {
		const width = Number(v.width),
			bits = BigInt(width),
			shift = BigInt(integer(v.shift, 0, 1024)),
			mask = (1n << bits) - 1n;
		const parse = (text: string) => {
			const s = text.trim();
			if (
				s.length > 256 ||
				!/^-?(?:0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)$/i.test(s)
			)
				throw new Error(
					"Enter an integer in decimal, hex, binary or octal (up to 256 characters).",
				);
			const n = s.startsWith("-") ? -BigInt(s.slice(1)) : BigInt(s);
			if (v.overflow === "Reject" && (n < -(1n << (bits - 1n)) || n > mask))
				throw new Error("Operand is outside the selected bit width.");
			return BigInt.asUintN(width, n);
		};
		const a = parse(v.input),
			b = ["AND", "OR", "XOR"].includes(v.operation) ? parse(v.other) : null;
		let result: bigint;
		switch (v.operation) {
			case "AND":
				result = a & (b as bigint);
				break;
			case "OR":
				result = a | (b as bigint);
				break;
			case "XOR":
				result = a ^ (b as bigint);
				break;
			case "NOT":
				result = ~a;
				break;
			case "Shift left":
				result = a << shift;
				break;
			case "Logical shift right":
				result = a >> shift;
				break;
			case "Arithmetic shift right":
				result = BigInt.asIntN(width, a) >> shift;
				break;
			case "Rotate left": {
				const n = shift % bits;
				result = (a << n) | (a >> (bits - n));
				break;
			}
			default: {
				const n = shift % bits;
				result = (a >> n) | (a << (bits - n));
				break;
			}
		}
		const describe = (value: bigint) => {
			const n = value & mask,
				binary = n.toString(2).padStart(width, "0");
			return {
				unsigned: n.toString(),
				signed: BigInt.asIntN(width, n).toString(),
				hex: `0x${n.toString(16).padStart(width / 4, "0")}`,
				binary,
				setBits: binary.replaceAll("0", "").length,
			};
		};
		return print({
			width,
			operation: v.operation,
			operandA: describe(a),
			operandB: b === null ? null : describe(b),
			result: describe(result),
		});
	},
};
