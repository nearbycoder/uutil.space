import { integer, json, type LocalTool, print } from "./types";

const DAY = 86400000,
	names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function date(text: string) {
	const s = text.trim(),
		d = new Date(`${s}T00:00:00Z`);
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(s) ||
		!Number.isFinite(d.getTime()) ||
		d.getUTCFullYear() < 1 ||
		d.toISOString().slice(0, 10) !== s
	)
		throw new Error("Use valid YYYY-MM-DD dates in years 0001–9999.");
	return d.getTime() / DAY;
}
function label(day: number) {
	const d = new Date(day * DAY);
	if (d.getUTCFullYear() < 1 || d.getUTCFullYear() > 9999)
		throw new Error("Result leaves the supported years 0001–9999.");
	return d.toISOString().slice(0, 10);
}
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Start date", type: "text", value: "2026-09-04" },
		{
			key: "end",
			label: "End date (count mode)",
			type: "text",
			value: "2026-09-11",
			optional: true,
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Count between",
			options: ["Count between", "Add business days"],
		},
		{
			key: "amount",
			label: "Business days to add (negative goes backward)",
			type: "text",
			value: "5",
		},
		{
			key: "endpoints",
			label: "Count-mode endpoints",
			type: "select",
			value: "Exclude start, include end",
			options: [
				"Exclude start, include end",
				"Include both",
				"Exclude both",
				"Include start, exclude end",
			],
		},
		{
			key: "weekend",
			label: "Weekend days (JSON array)",
			value: '["Sat","Sun"]',
		},
		{
			key: "holidays",
			label: "Excluded dates (one per line)",
			value: "2026-09-07",
			optional: true,
		},
		{
			key: "details",
			label: "Result detail",
			type: "select",
			value: "Summary",
			options: ["Summary", "Include working dates"],
		},
	],
	filename: "business-days.json",
	smoke: '"businessDays": 4',
	help: "Uses date-only UTC arithmetic, so daylight-saving transitions do not change results. No holiday service is queried: supply every holiday or closure yourself. Weekend names are Sun–Sat; [] means every weekday is eligible. At least one working weekday is required. Count supports reversed ranges and returns a signed count in travel order; endpoint rules refer to the entered start and end. Add mode always excludes the start; adding zero returns it unchanged even if closed. Count spans up to 36,600 calendar days, offsets ±10,000 working days, and up to 1,000 holiday lines.",
	run: (v) => {
		const start = date(v.input),
			weekend = json(v.weekend);
		if (
			!Array.isArray(weekend) ||
			weekend.length >= 7 ||
			weekend.some((x) => !names.includes(x)) ||
			new Set(weekend).size !== weekend.length
		)
			throw new Error(
				"Choose unique Sun–Sat weekend names, leaving at least one working weekday.",
			);
		const holidayLines = v.holidays
			.split(/\r\n|\r|\n/)
			.map((x) => x.trim())
			.filter(Boolean);
		if (holidayLines.length > 1000)
			throw new Error("Use at most 1,000 holiday lines.");
		const holidays = new Set(holidayLines.map(date)),
			closed = new Set((weekend as string[]).map((x) => names.indexOf(x))),
			working = (d: number) =>
				!closed.has(new Date(d * DAY).getUTCDay()) && !holidays.has(d);
		const dates: string[] = [];
		let end: number,
			businessDays: number,
			checked = 0;
		if (v.operation === "Add business days") {
			const amount = integer(v.amount, -10000, 10000),
				direction = amount < 0 ? -1 : 1;
			let remaining = Math.abs(amount);
			end = start;
			while (remaining) {
				end += direction;
				checked++;
				if (checked > 100000)
					throw new Error("Search exceeds 100,000 calendar days.");
				label(end);
				if (working(end)) {
					remaining--;
					dates.push(label(end));
				}
			}
			businessDays = amount;
		} else {
			end = date(v.end);
			const distance = Math.abs(end - start),
				direction = end < start ? -1 : 1;
			if (distance > 36600)
				throw new Error("Keep count ranges within 36,600 calendar days.");
			const includeStart =
					v.endpoints === "Include both" ||
					v.endpoints === "Include start, exclude end",
				includeEnd =
					v.endpoints === "Include both" ||
					v.endpoints === "Exclude start, include end";
			for (let i = 0; i <= distance; i++) {
				if ((i === 0 && !includeStart) || (i === distance && !includeEnd))
					continue;
				checked++;
				const d = start + i * direction;
				if (working(d)) dates.push(label(d));
			}
			businessDays = dates.length * direction;
		}
		return print({
			start: label(start),
			end: label(end),
			operation: v.operation,
			businessDays,
			calendarDayDifference: end - start,
			checkedDates: checked,
			excludedDates: checked - dates.length,
			weekend,
			uniqueHolidays: holidays.size,
			startIsWorking: working(start),
			endIsWorking: working(end),
			...(v.details === "Include working dates" ? { workingDates: dates } : {}),
		});
	},
};
