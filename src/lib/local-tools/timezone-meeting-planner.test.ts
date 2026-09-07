import { expect, test } from "vitest";
import { tool } from "./timezone-meeting-planner";
import { defaults, execute } from "./types";

test("compares dates and working-hour availability across zones", () => {
	const result = JSON.parse(execute(tool, defaults(tool)));
	expect(result.meetings[1].start.hour).toBe("10");
	expect(result.meetings[1].withinWorkingHours).toBe(true);
	expect(result.meetings[3].start.day).toBe("15");
	expect(result.allAvailable).toBe(false);
});
test("handles DST jumps and catches intervals ending outside work hours", () => {
	const v = {
		...defaults(tool),
		zones: "America/Chicago",
		start: "2026-03-08T07:30:00Z",
		weekends: "Available",
		workStart: "0",
		workEnd: "24",
	};
	const meeting = JSON.parse(execute(tool, v)).meetings[0];
	expect(meeting.start.hour).toBe("01");
	expect(meeting.end.hour).toBe("03");
	expect(
		JSON.parse(
			execute(tool, {
				...v,
				zones: "UTC",
				start: "2026-09-14T16:00:30Z",
				workEnd: "17",
			}),
		).allAvailable,
	).toBe(false);
	expect(() => execute(tool, { ...v, zones: "Mars/Olympus" })).toThrow();
	expect(() =>
		execute(tool, { ...v, workStart: "18", workEnd: "9" }),
	).toThrow();
});
