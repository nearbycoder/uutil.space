import { parseIsoInstant } from "./dates";
import { type LocalTool, print } from "./types";

type TimestampResult = { line: number; input: string } & (
	| { iso: string; unixSeconds: number; unixMilliseconds: number }
	| { error: string }
);
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Timestamps (one per line)",
			value: "0\n1700000000\nnot-a-timestamp",
		},
		{
			key: "unit",
			label: "Input format",
			type: "select",
			value: "Unix seconds",
			options: ["Unix seconds", "Unix milliseconds", "ISO 8601"],
		},
	],
	filename: "timestamps.json",
	smoke: "1970-01-01T00:00:00.000Z",
	help: "Convert up to 1,000 timestamps independently; one invalid row does not discard valid rows. Units are explicit, never guessed. Seconds support millisecond precision. ISO input requires seconds and a timezone offset. Blank lines are ignored; result line numbers refer to the original input.",
	run: (v) => {
		const lines = v.input.split(/\r?\n/);
		if (lines.length > 1000) throw new Error("Use at most 1,000 lines.");
		const results = lines.flatMap<TimestampResult>((line, index) => {
			const input = line.trim();
			if (!input) return [];
			try {
				let date: Date;
				if (v.unit === "ISO 8601") date = parseIsoInstant(input);
				else {
					if (!/^-?\d+(?:\.\d{1,3})?$/.test(input))
						throw new Error("Expected a numeric Unix timestamp.");
					const number = Number(input),
						milliseconds =
							v.unit === "Unix seconds" ? Math.round(number * 1000) : number;
					if (
						!Number.isSafeInteger(milliseconds) ||
						Math.abs(milliseconds) > 8.64e15
					)
						throw new Error(
							"Timestamp exceeds the supported range or millisecond precision.",
						);
					if (v.unit === "Unix milliseconds" && !Number.isInteger(number))
						throw new Error("Milliseconds must be a whole number.");
					date = new Date(milliseconds);
				}
				return [
					{
						line: index + 1,
						input,
						iso: date.toISOString(),
						unixSeconds: date.getTime() / 1000,
						unixMilliseconds: date.getTime(),
					},
				];
			} catch (error) {
				return [
					{
						line: index + 1,
						input,
						error: error instanceof Error ? error.message : "Invalid timestamp",
					},
				];
			}
		});
		return print({
			valid: results.filter((r) => !("error" in r)).length,
			invalid: results.filter((r) => "error" in r).length,
			results,
		});
	},
};
