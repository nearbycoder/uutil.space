import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "retries",
			label: "Retries after the initial attempt",
			type: "text",
			value: "5",
		},
		{ key: "base", label: "Base delay (ms)", type: "text", value: "500" },
		{
			key: "mode",
			label: "Backoff strategy",
			type: "select",
			value: "Exponential",
			options: ["Constant", "Linear", "Exponential"],
		},
		{
			key: "factor",
			label: "Exponential multiplier",
			type: "text",
			value: "2",
		},
		{
			key: "cap",
			label: "Maximum pre-jitter delay (ms)",
			type: "text",
			value: "10000",
		},
		{
			key: "jitter",
			label: "Jitter",
			type: "select",
			value: "None",
			options: ["None", "Full", "Equal"],
		},
		{
			key: "duration",
			label: "Assumed duration of every attempt (ms)",
			type: "text",
			value: "1000",
		},
		{
			key: "budget",
			label: "Total time budget (ms; 0 means unlimited)",
			type: "text",
			value: "30000",
		},
	],
	filename: "retry-plan.json",
	smoke: '"totalAttempts": 6',
	help: "A deterministic planner: no timers or requests run. The initial attempt starts immediately; retries wait after the previous attempt finishes. Linear delay is base × retry number; exponential is base × multiplier^(retry number − 1), then capped. Full jitter is uniform from 0 to delay; Equal from half-delay to delay. Estimates assume all attempts run for exactly the supplied duration, with no early success. Budget checks use those assumptions, not real network guarantees. Up to 50 retries; delays/duration up to 24 hours each.",
	run: (v) => {
		const retries = integer(v.retries, 0, 50),
			base = integer(v.base, 0, 86400000),
			cap = integer(v.cap, 1, 86400000),
			duration = integer(v.duration, 0, 86400000),
			budget = integer(v.budget, 0, Number.MAX_SAFE_INTEGER),
			factor = Number(v.factor);
		if (
			!v.factor.trim() ||
			!Number.isFinite(factor) ||
			factor < 1 ||
			factor > 10
		)
			throw new Error("Multiplier must be between 1 and 10.");
		const round = (n: number) => Number(n.toFixed(3));
		let minimum = 0,
			maximum = 0,
			expected = 0,
			totalWaitMin = 0,
			totalWaitMax = 0,
			totalWaitExpected = 0;
		const attempts = Array.from({ length: retries + 1 }, (_, index) => {
			const delay =
				index === 0
					? 0
					: Math.min(
							cap,
							base *
								(v.mode === "Exponential"
									? factor ** (index - 1)
									: v.mode === "Linear"
										? index
										: 1),
						);
			const min =
					v.jitter === "Full" ? 0 : v.jitter === "Equal" ? delay / 2 : delay,
				max = delay,
				mean = (min + max) / 2;
			totalWaitMin += min;
			totalWaitMax += max;
			totalWaitExpected += mean;
			minimum += min;
			maximum += max;
			expected += mean;
			const row = {
				attempt: index + 1,
				retry: index,
				preJitterDelayMs: round(delay),
				waitMs: {
					minimum: round(min),
					maximum: round(max),
					expected: round(mean),
				},
				startMs: {
					minimum: round(minimum),
					maximum: round(maximum),
					expected: round(expected),
				},
			};
			minimum += duration;
			maximum += duration;
			expected += duration;
			return row;
		});
		return print({
			totalAttempts: attempts.length,
			strategy: v.mode,
			jitter: v.jitter,
			assumedAttemptDurationMs: duration,
			totalWaitMs: {
				minimum: round(totalWaitMin),
				maximum: round(totalWaitMax),
				expected: round(totalWaitExpected),
			},
			totalElapsedMs: {
				minimum: round(minimum),
				maximum: round(maximum),
				expected: round(expected),
			},
			budget:
				budget === 0
					? null
					: {
							milliseconds: budget,
							allModeledSchedulesFit: maximum <= budget,
							someModeledSchedulesFit: minimum <= budget,
						},
			attempts,
		});
	},
};
