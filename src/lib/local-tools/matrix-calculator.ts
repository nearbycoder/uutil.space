import { json, type LocalTool, print } from "./types";

function matrix(text: string): number[][] {
	const value = json(text);
	if (
		!Array.isArray(value) ||
		!value.length ||
		value.length > 20 ||
		value.some(
			(row) =>
				!Array.isArray(row) ||
				!row.length ||
				row.length > 20 ||
				row.length !== value[0].length ||
				row.some(
					(n) =>
						typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 1e50,
				),
		)
	)
		throw new Error(
			"Use a rectangular numeric matrix, 1–20 rows and columns, with values of magnitude at most 1e50.",
		);
	return value;
}
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Matrix A (JSON rows)", value: "[[1, 2], [3, 4]]" },
		{
			key: "other",
			label: "Matrix B (unused for transpose)",
			value: "[[5, 6], [7, 8]]",
			optional: true,
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Multiply",
			options: ["Multiply", "Add", "Subtract", "Transpose A"],
		},
	],
	help: "Multiply matrices using row-by-column dot products, add/subtract elementwise, or transpose A. Multiplication requires A's column count to equal B's row count; addition/subtraction require equal shapes. Supports rectangular matrices up to 20 × 20, finite numbers only, using JavaScript floating-point arithmetic. Matrix B is ignored for transpose.",
	filename: "matrix-result.json",
	smoke: "19",
	run: (v) => {
		const a = matrix(v.input);
		if (v.operation === "Transpose A")
			return print(a[0].map((_, j) => a.map((row) => row[j])));
		const b = matrix(v.other);
		if (v.operation === "Multiply") {
			if (a[0].length !== b.length)
				throw new Error("A's column count must equal B's row count.");
			return print(
				a.map((row) =>
					b[0].map((_, j) => row.reduce((sum, n, k) => sum + n * b[k][j], 0)),
				),
			);
		}
		if (a.length !== b.length || a[0].length !== b[0].length)
			throw new Error("Matrices must have equal shapes.");
		return print(
			a.map((row, i) =>
				row.map((n, j) => (v.operation === "Add" ? n + b[i][j] : n - b[i][j])),
			),
		);
	},
};
