import { numbers } from "../toolkit-utils";
import { integer, type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Series (comma, space or newline separated)",
			value: "10, 12, 14, 20, 18, 16, 22",
		},
		{ key: "window", label: "Window / EMA span", type: "text", value: "3" },
		{
			key: "method",
			label: "Smoothing method",
			type: "select",
			value: "Trailing simple",
			options: ["Trailing simple", "Centered simple", "Exponential"],
		},
		{
			key: "edges",
			label: "Incomplete simple windows",
			type: "select",
			value: "Require full window",
			options: ["Require full window", "Use available values"],
		},
	],
	help: "Smooth up to 5,000 numeric samples. Trailing averages use the current and preceding values; centered averages require an odd window and include equal positions on either side. Incomplete windows can return null or use available samples. EMA uses alpha = 2 / (span + 1), seeds from the first sample, and ignores the incomplete-window option. Indexes are zero-based. Results use floating-point arithmetic; no dates or missing-value interpolation are inferred.",
	filename: "moving-average.json",
	smoke: '"smoothed": 12',
	run: (v) => {
		const values = numbers(v.input),
			window = integer(v.window, 1, values.length);
		if (v.method === "Centered simple" && window % 2 === 0)
			throw new Error("Centered windows must have an odd size.");
		const alpha = 2 / (window + 1);
		let ema = values[0];
		const points = values.map((value, index) => {
			let smoothed: number | null;
			if (v.method === "Exponential") {
				ema = index ? alpha * value + (1 - alpha) * ema : value;
				smoothed = ema;
			} else {
				const start =
					v.method === "Centered simple"
						? index - (window - 1) / 2
						: index - window + 1;
				const end =
					v.method === "Centered simple" ? index + (window - 1) / 2 : index;
				const left = Math.max(0, start),
					right = Math.min(values.length - 1, end);
				if (
					v.edges === "Require full window" &&
					(start < 0 || end >= values.length)
				)
					smoothed = null;
				else {
					smoothed = 0;
					for (let i = left; i <= right; i++)
						smoothed += values[i] / (right - left + 1);
				}
			}
			return { index, value, smoothed };
		});
		return print({
			method: v.method,
			window,
			alpha: v.method === "Exponential" ? alpha : null,
			points,
		});
	},
};
