import { type LocalTool, print } from "./types";

function number(s: string) {
	if (
		!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ||
		!Number.isFinite(Number(s)) ||
		Math.abs(Number(s)) > 1e100
	)
		throw new Error("Use finite decimal numbers with magnitude at most 1e100.");
	return Number(s);
}
function sum(values: number[]) {
	let total = 0,
		correction = 0;
	for (const x of values) {
		const next = total + x;
		correction +=
			Math.abs(total) >= Math.abs(x) ? total - next + x : x - next + total;
		total = next;
	}
	return total + correction;
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Numbers (commas or whitespace)",
			value: "2, 4, 4, 4, 5, 5, 7, 9",
		},
		{
			key: "variance",
			label: "Variance convention",
			type: "select",
			value: "Population",
			options: ["Population", "Sample"],
		},
		{
			key: "percentile",
			label: "Additional percentile (0–100)",
			type: "text",
			value: "95",
		},
	],
	filename: "number-statistics.json",
	smoke: '"mean": 5',
	help: "Summarizes 1–10,000 decimal/scientific numbers. Repeated separators are ignored; commas are separators, not thousands marks. Quantiles use linear interpolation at (n−1) × p. Population variance divides by n; sample variance divides by n−1 and is null for a single value. Modes are omitted when no value repeats. Outliers are strictly outside Q1−1.5×IQR and Q3+1.5×IQR. Uses compensated sums, but results remain floating-point estimates, not exact decimal arithmetic.",
	run: (v) => {
		const tokens = v.input
			.trim()
			.split(/[\s,]+/u)
			.filter(Boolean);
		if (!tokens.length || tokens.length > 10000)
			throw new Error("Provide 1–10,000 numbers.");
		const values = tokens.map(number).sort((a, b) => a - b),
			p = number(v.percentile.trim());
		if (p < 0 || p > 100)
			throw new Error("Percentile must be between 0 and 100.");
		const n = values.length,
			total = sum(values),
			mean = total / n,
			quantile = (p: number) => {
				const i = ((n - 1) * p) / 100,
					lo = Math.floor(i),
					fraction = i - lo;
				return values[lo] * (1 - fraction) + values[Math.ceil(i)] * fraction;
			};
		const squared = sum(values.map((x) => (x - mean) ** 2)),
			variance =
				v.variance === "Sample" && n < 2
					? null
					: squared / (v.variance === "Sample" ? n - 1 : n),
			q1 = quantile(25),
			q3 = quantile(75),
			iqr = q3 - q1,
			lower = q1 - 1.5 * iqr,
			upper = q3 + 1.5 * iqr;
		const frequencies = new Map<number, number>();
		for (const x of values) frequencies.set(x, (frequencies.get(x) ?? 0) + 1);
		const maxFrequency = Math.max(...frequencies.values());
		return print({
			count: n,
			distinctCount: frequencies.size,
			sum: total,
			mean,
			median: quantile(50),
			minimum: values[0],
			maximum: values[n - 1],
			range: values[n - 1] - values[0],
			varianceConvention: v.variance,
			variance,
			standardDeviation: variance === null ? null : Math.sqrt(variance),
			quartiles: { q1, q3, iqr },
			percentile: { percent: p, value: quantile(p) },
			modes:
				maxFrequency === 1
					? []
					: [...frequencies]
							.filter(([, count]) => count === maxFrequency)
							.map(([value]) => value),
			modeFrequency: maxFrequency === 1 ? null : maxFrequency,
			outlierFences: { lower, upper },
			outliers: values.filter((x) => x < lower || x > upper),
		});
	},
};
