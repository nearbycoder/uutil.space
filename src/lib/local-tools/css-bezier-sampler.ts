import { integer, type LocalTool, print } from "./types";

const presets: Record<string, number[]> = {
	Ease: [0.25, 0.1, 0.25, 1],
	"Ease in": [0.42, 0, 1, 1],
	"Ease out": [0, 0, 0.58, 1],
	"Ease in out": [0.42, 0, 0.58, 1],
	Linear: [0, 0, 1, 1],
};
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Custom control points (x1, y1, x2, y2)",
			value: "0.25, 0.1, 0.25, 1",
		},
		{
			key: "preset",
			label: "Curve",
			type: "select",
			value: "Custom",
			options: [
				"Custom",
				"Ease",
				"Ease in",
				"Ease out",
				"Ease in out",
				"Linear",
			],
		},
		{ key: "duration", label: "Duration (ms)", type: "text", value: "300" },
		{ key: "intervals", label: "Sample intervals", type: "text", value: "10" },
		{ key: "from", label: "Starting value", type: "text", value: "0" },
		{ key: "to", label: "Ending value", type: "text", value: "100" },
	],
	filename: "bezier-samples.json",
	smoke: "cubic-bezier(0.25, 0.1, 0.25, 1)",
	help: "Accepts four comma-separated numbers or cubic-bezier(...). Presets override the custom points. X controls must be 0–1; this tool limits Y controls to -10–10. Solves X for each elapsed-time fraction before evaluating Y; sampling the curve parameter directly would give incorrect timing. Overshoot is preserved. The reported range is sampled, not an exact extremum. Values are rounded to six decimals. This is a numeric sampler, not an animation preview.",
	run: (v) => {
		const numeric = (s: string, min: number, max: number) => {
			const n = Number(s);
			if (!s.trim() || !Number.isFinite(n) || n < min || n > max)
				throw new Error("Enter finite values within the documented bounds.");
			return n;
		};
		const raw = v.input.trim().replace(/^cubic-bezier\((.*)\)$/i, "$1"),
			parts = raw.split(",");
		let controls: number[];
		if (v.preset === "Custom") {
			if (parts.length !== 4)
				throw new Error("Provide exactly four control points.");
			controls = parts.map((s, i) =>
				numeric(s, i % 2 === 0 ? 0 : -10, i % 2 === 0 ? 1 : 10),
			);
		} else controls = presets[v.preset];
		const [x1, y1, x2, y2] = controls,
			duration = integer(v.duration, 1, 600000),
			intervals = integer(v.intervals, 2, 200),
			from = numeric(v.from, -1000000, 1000000),
			to = numeric(v.to, -1000000, 1000000),
			round = (n: number) => Number(n.toFixed(6));
		const curve = (t: number, a: number, b: number) =>
			3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
		const samples = Array.from({ length: intervals + 1 }, (_, i) => {
			const inputProgress = i / intervals;
			let outputProgress = inputProgress;
			if (i !== 0 && i !== intervals) {
				let low = 0,
					high = 1;
				for (let iteration = 0; iteration < 48; iteration++) {
					const middle = (low + high) / 2;
					if (curve(middle, x1, x2) < inputProgress) low = middle;
					else high = middle;
				}
				outputProgress = curve((low + high) / 2, y1, y2);
			}
			return {
				timeMs: round(inputProgress * duration),
				inputProgress: round(inputProgress),
				outputProgress: round(outputProgress),
				value: round(from + (to - from) * outputProgress),
			};
		});
		const minimum = Math.min(...samples.map((s) => s.outputProgress)),
			maximum = Math.max(...samples.map((s) => s.outputProgress));
		return print({
			easing: `cubic-bezier(${controls.join(", ")})`,
			durationMs: duration,
			css: `transition-timing-function: cubic-bezier(${controls.join(", ")});\ntransition-duration: ${duration}ms;`,
			sampledOutputRange: { minimum, maximum },
			overshootDetectedInSamples: minimum < 0 || maximum > 1,
			samples,
		});
	},
};
