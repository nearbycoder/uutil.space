import { parseIsoInstant } from "./dates";
import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "start",
			label: "Meeting start (ISO timestamp with offset)",
			value: "2026-09-14T15:00:00Z",
		},
		{
			key: "zones",
			label: "IANA timezones (one per line)",
			value: "UTC\nAmerica/Chicago\nEurope/London\nAsia/Tokyo",
		},
		{
			key: "duration",
			label: "Duration in minutes",
			type: "text",
			value: "60",
		},
		{
			key: "workStart",
			label: "Working day starts (hour, 0–23)",
			type: "text",
			value: "9",
		},
		{
			key: "workEnd",
			label: "Working day ends (hour, 1–24)",
			type: "text",
			value: "17",
		},
		{
			key: "weekends",
			label: "Weekend availability",
			type: "select",
			value: "Unavailable",
			options: ["Unavailable", "Available"],
		},
	],
	filename: "meeting-plan.json",
	smoke: "America/Chicago",
	help: "Compare one absolute meeting interval across up to 20 IANA timezones using browser timezone data, including daylight-saving changes. Working hours apply equally to each zone and cannot span midnight. Availability checks the whole interval at minute boundaries and its final instant; holidays are not modeled.",
	run: (v) => {
		const start = parseIsoInstant(v.start),
			duration = integer(v.duration, 1, 480),
			end = new Date(start.getTime() + duration * 60000),
			from = integer(v.workStart, 0, 23),
			to = integer(v.workEnd, 1, 24);
		if (to <= from)
			throw new Error("Working-day end must be later than its start.");
		const zones = [
			...new Set(
				v.zones
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean),
			),
		];
		if (zones.length > 20) throw new Error("Use at most 20 timezones.");
		const meetings = zones.map((zone) => {
			let formatter: Intl.DateTimeFormat;
			try {
				formatter = new Intl.DateTimeFormat("en-US", {
					timeZone: zone,
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					weekday: "short",
					hour: "2-digit",
					minute: "2-digit",
					hourCycle: "h23",
					timeZoneName: "shortOffset",
				});
			} catch {
				throw new Error(`Unknown timezone: ${zone}`);
			}
			const parts = (date: Date) =>
				Object.fromEntries(
					formatter
						.formatToParts(date)
						.filter((p) => p.type !== "literal")
						.map((p) => [p.type, p.value]),
				);
			const available = (date: Date) => {
				const p = parts(date);
				return (
					+p.hour >= from &&
					+p.hour < to &&
					(v.weekends === "Available" || !["Sat", "Sun"].includes(p.weekday))
				);
			};
			let withinWorkingHours = available(new Date(end.getTime() - 1));
			for (let i = 0; i < duration && withinWorkingHours; i++)
				withinWorkingHours = available(new Date(start.getTime() + i * 60000));
			return { zone, start: parts(start), end: parts(end), withinWorkingHours };
		});
		return print({
			startUtc: start.toISOString(),
			endUtc: end.toISOString(),
			durationMinutes: duration,
			allAvailable: meetings.every((m) => m.withinWorkingHours),
			meetings,
		});
	},
};
