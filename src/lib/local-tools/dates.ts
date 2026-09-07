export function parseIsoInstant(text: string): Date {
	const match =
		/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/i.exec(
			text,
		);
	if (!match)
		throw new Error(
			"Use ISO 8601 with seconds and an explicit Z or ±HH:MM offset (up to 3 fractional digits).",
		);
	const calendar = new Date(`${match[1]}T00:00:00Z`);
	if (
		!Number.isFinite(calendar.getTime()) ||
		calendar.toISOString().slice(0, 10) !== match[1] ||
		+match[2] > 23 ||
		+match[3] > 59 ||
		+match[4] > 59
	)
		throw new Error("Invalid calendar date or clock time.");
	const offset = match[6];
	if (
		offset.toUpperCase() !== "Z" &&
		(+offset.slice(1, 3) > 23 || +offset.slice(4) > 59)
	)
		throw new Error("Invalid timezone offset.");
	const date = new Date(text);
	if (!Number.isFinite(date.getTime()))
		throw new Error("Timestamp is outside the supported date range.");
	return date;
}
