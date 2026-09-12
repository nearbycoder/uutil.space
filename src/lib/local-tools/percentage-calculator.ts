import { integer, type LocalTool, print } from "./types";

function number(s: string) {
	if (
		!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s.trim()) ||
		!Number.isFinite(Number(s)) ||
		Math.abs(Number(s)) > 1e100
	)
		throw new Error("Use finite decimals with magnitude at most 1e100.");
	return Number(s);
}
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Value A", type: "text", value: "80" },
		{
			key: "other",
			label: "Value B (or percentage for adjustments)",
			type: "text",
			value: "100",
		},
		{
			key: "operation",
			label: "Calculation",
			type: "select",
			value: "Percent change",
			options: [
				"A percent of B",
				"A as percent of B",
				"Percent change",
				"Percent difference",
				"Increase A by B percent",
				"Decrease A by B percent",
				"Reverse increase",
				"Reverse decrease",
			],
		},
		{
			key: "places",
			label: "Display decimal places",
			type: "text",
			value: "4",
		},
	],
	filename: "percentage-result.json",
	smoke: '"result": 25',
	help: "Percent change compares A (original) to B (new) using |A| as baseline, so negative starting values have an explicit convention. Percent difference is symmetric and uses the average of |A| and |B|; two zeros give 0%. Adjustment modes treat B as the percentage; reverse modes treat A as the final value. A zero denominator is rejected. Signed percentages are allowed. Full results use floating-point arithmetic; formatted display supports 0–12 decimal places.",
	run: (v) => {
		const a = number(v.input),
			b = number(v.other),
			places = integer(v.places, 0, 12);
		let result: number,
			formula: string,
			unit = "value";
		const divide = (n: number, d: number) => {
			if (d === 0)
				throw new Error(
					"This calculation is undefined because its denominator is zero.",
				);
			return n / d;
		};
		switch (v.operation) {
			case "A percent of B":
				result = (a / 100) * b;
				formula = "A / 100 × B";
				break;
			case "A as percent of B":
				result = divide(a, b) * 100;
				formula = "A / B × 100";
				unit = "percent";
				break;
			case "Percent change":
				result = divide(b - a, Math.abs(a)) * 100;
				formula = "(B − A) / |A| × 100";
				unit = "percent";
				break;
			case "Percent difference": {
				const scale = Math.max(Math.abs(a), Math.abs(b));
				result =
					scale === 0
						? 0
						: (Math.abs(b / scale - a / scale) /
								((Math.abs(a / scale) + Math.abs(b / scale)) / 2)) *
							100;
				formula = "|B − A| / ((|A| + |B|) / 2) × 100";
				unit = "percent";
				break;
			}
			case "Increase A by B percent":
				result = a * (1 + b / 100);
				formula = "A × (1 + B / 100)";
				break;
			case "Decrease A by B percent":
				result = a * (1 - b / 100);
				formula = "A × (1 − B / 100)";
				break;
			case "Reverse increase":
				result = divide(a, 1 + b / 100);
				formula = "A / (1 + B / 100)";
				break;
			default:
				result = divide(a, 1 - b / 100);
				formula = "A / (1 − B / 100)";
		}
		if (!Number.isFinite(result))
			throw new Error("Result exceeds the supported numeric range.");
		if (Object.is(result, -0)) result = 0;
		return print({
			operation: v.operation,
			A: a,
			B: b,
			formula,
			result,
			unit,
			formatted: result.toFixed(places) + (unit === "percent" ? "%" : ""),
			decimalPlaces: places,
		});
	},
};
