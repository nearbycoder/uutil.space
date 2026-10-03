import { describe, expect, it } from "vitest";
import {
	defaults,
	execute,
	type LocalTool,
	type Values,
} from "./local-tools/types";
import {
	checklistFormat,
	choreRotation,
	dateCountdown,
	discountStack,
	expenseSettlement,
	habitStreak,
	mealShopping,
	meetingAgenda,
	PRODUCTIVITY_TOOLS,
	packingList,
	readingPlan,
	recipeScale,
	savingsGoal,
	scheduleOverlap,
	shoppingList,
	subscriptionCosts,
	taskCapacity,
	taskPriority,
	travelBudget,
	unitPrice,
	weeklyBudget,
} from "./productivity-tools";

function run(tool: LocalTool, values: Values = {}) {
	return execute(tool, { ...defaults(tool), ...values });
}
describe("everyday productivity tools", () => {
	it("ships exactly 20 unique tools with working examples", () => {
		expect(PRODUCTIVITY_TOOLS).toHaveLength(20);
		expect(new Set(PRODUCTIVITY_TOOLS.map((t) => t.id)).size).toBe(20);
		for (const { tool } of PRODUCTIVITY_TOOLS)
			expect(run(tool)).toContain(tool.smoke);
	});
	it("combines grocery names case insensitively while keeping units separate", () => {
		expect(
			run(shoppingList, {
				input: "Rice | 2 | kg\nrice | 3 | KG\nRice | 1 | bag",
			}),
		).toContain("Rice: 5 kg\n- [ ] Rice: 1 bag");
		expect(() => run(shoppingList, { input: "Rice | -1 | kg" })).toThrow(
			"nonnegative",
		);
	});
	it("scales packing lists by the explicit trip rule", () => {
		expect(run(packingList, { scale: "Per person" })).toContain("Shirts × 2");
		expect(run(packingList, { scale: "Once for the trip" })).toContain(
			"Shirts × 1",
		);
		expect(() => run(packingList, { people: "0" })).toThrow();
	});
	it("assigns all four priority groups and validates flags", () => {
		expect(run(taskPriority)).toContain("Schedule\n- [ ] Plan weekend");
		expect(run(taskPriority)).toContain("Consider dropping\n- [ ] Browse sale");
		expect(() => run(taskPriority, { input: "Task | maybe | yes" })).toThrow(
			"yes or no",
		);
	});
	it("inserts buffers only between accepted tasks and skips tasks that do not fit", () => {
		expect(run(taskCapacity, { input: "A | 50\nB | 100\nC | 35" })).toContain(
			"Used: 90 min",
		);
		expect(run(taskCapacity, { input: "A | 90" })).toContain(
			"Remaining: 0 min",
		);
	});
	it("reports overbooking instead of negative spare hours", () => {
		expect(run(weeklyBudget, { input: "Sleep | 60\nWork | 120" })).toContain(
			"Overbooked: 12 h",
		);
	});
	it("detects nested overlaps but allows touching appointments", () => {
		expect(
			run(scheduleOverlap, {
				input: "A | 08:00 | 12:00\nB | 09:00 | 10:00\nC | 12:00 | 13:00",
			}),
		).toContain("3 appointments · 1 conflicts");
		expect(() => run(scheduleOverlap, { input: "A | 23:00 | 01:00" })).toThrow(
			"same day",
		);
		expect(() => run(scheduleOverlap, { input: "A | 8:00 | 10:00" })).toThrow(
			"HH:MM",
		);
	});
	it("builds agenda slots and rejects rollover", () => {
		expect(run(meetingAgenda)).toContain("10:05–10:25  Discuss options");
		expect(() => run(meetingAgenda, { start: "23:50" })).toThrow("midnight");
	});
	it("rotates chores across weeks and rejects duplicate people", () => {
		expect(run(choreRotation)).toContain("Week 2\n- Dishes: Sam");
		expect(() => run(choreRotation, { people: "Alex\nalex" })).toThrow(
			"unique",
		);
	});
	it("counts unique habit dates and yesterday's live streak", () => {
		expect(
			run(habitStreak, { input: "2026-10-03\n2026-10-04\n2026-10-04" }),
		).toContain("Current streak: 2 days");
		expect(run(habitStreak, { input: "2026-10-01" })).toContain(
			"Current streak: 0 days",
		);
		expect(() => run(habitStreak, { input: "2026-09-30" })).toThrow("inside");
		expect(() => run(habitStreak, { start: "2026-02-30" })).toThrow(
			"valid calendar",
		);
	});
	it("computes calendar countdowns across leap days", () => {
		expect(
			run(dateCountdown, { asof: "2024-02-28", input: "Event | 2024-03-01" }),
		).toContain("in 2 days");
		expect(run(dateCountdown, { input: "Today | 2026-10-02" })).toContain(
			"today",
		);
	});
	it("distributes reading pages exactly with remainder days", () => {
		expect(run(readingPlan, { pages: "10", read: "0", days: "3" })).toContain(
			"Day 1: 4 pages\nDay 2: 3 pages\nDay 3: 3 pages",
		);
		expect(run(readingPlan, { read: "320" })).toContain("Remaining: 0 pages");
		expect(() => run(readingPlan, { read: "321" })).toThrow();
	});
	it("settles cents exactly including uneven equal shares", () => {
		const output = run(expenseSettlement, { input: "A | 10.00\nB | 0\nC | 0" });
		expect(output).toContain("A: paid 10.00, share 3.34");
		expect(output).toContain("B → A: 3.33\nC → A: 3.33");
		expect(run(expenseSettlement, { input: "A | 0\nB | 0" })).toContain(
			"Everyone is settled",
		);
		expect(() => run(expenseSettlement, { input: "A | 0.001" })).toThrow(
			"two decimal",
		);
	});
	it("handles achieved savings goals and zero contributions", () => {
		expect(run(savingsGoal, { deposit: "0" })).toContain(
			"No progress with a zero contribution",
		);
		expect(run(savingsGoal, { saved: "1600" })).toContain("Remaining: 0.00");
		expect(run(savingsGoal, { goal: "1", saved: "0", periods: "3" })).toContain(
			"Required per period: 0.34",
		);
	});
	it("annualizes quarterly subscriptions and rejects unknown cycles", () => {
		expect(
			run(subscriptionCosts, { input: "Plan | 12.50 | quarterly" }),
		).toContain("Annual total: 50.00");
		expect(() =>
			run(subscriptionCosts, { input: "Plan | 1 | constructor" }),
		).toThrow("Billing cycle");
		expect(() => run(subscriptionCosts, { input: "Plan | 1 | daily" })).toThrow(
			"Billing cycle",
		);
	});
	it("ranks unit prices before display rounding and rejects zero quantities", () => {
		expect(run(unitPrice)).toContain("1. Large pack");
		expect(() => run(unitPrice, { input: "Empty | 1 | 0" })).toThrow(
			"Quantity",
		);
	});
	it("applies stacked discounts multiplicatively and rounds cents at each step", () => {
		expect(
			run(discountStack, { price: "0.05", input: "50\n50", tax: "0" }),
		).toContain("Final price: 0.02");
		expect(run(discountStack, { input: "100" })).toContain("Final price: 0.00");
		expect(() => run(discountStack, { input: "101" })).toThrow("100");
	});
	it("preserves fractional recipe quantities", () => {
		expect(run(recipeScale, { target: "1" })).toContain("Eggs: 0.5 each");
		expect(() => run(recipeScale, { original: "0" })).toThrow();
	});
	it("computes trip frequencies without multiplying shared lodging by travelers", () => {
		expect(run(travelBudget, { nights: "0", buffer: "0" })).toContain(
			"Lodging: 0.00",
		);
		expect(() => run(travelBudget, { input: "Cost | 10 | daily" })).toThrow(
			"per person",
		);
	});
	it("merges meal ingredients across meals", () => {
		expect(run(mealShopping)).toContain("Tomatoes: 5 each");
		expect(run(mealShopping)).toContain("- Tuesday salad");
	});
	it("preserves completion when deduplicating and supports numbered output", () => {
		expect(run(checklistFormat, { input: "Task\n[x] task" })).toBe(
			"- [x] Task",
		);
		expect(
			run(checklistFormat, { input: "[x] Task", format: "Numbered list" }),
		).toBe("1. Task (done)");
		expect(() => run(checklistFormat, { input: "[x]" })).toThrow(
			"contain text",
		);
	});
	it("bounds rows and rejects malformed delimiters", () => {
		expect(() =>
			run(shoppingList, { input: "a | 1 | each\n".repeat(501) }),
		).toThrow("500");
		expect(() => run(mealShopping, { input: "Meal | Rice | 1" })).toThrow(
			"Row 1",
		);
	});
});
