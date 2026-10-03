import {
	type Field,
	integer,
	type LocalTool,
	type Values,
} from "./local-tools/types";

// Plain rows make these tools usable without writing JSON. Separators are literal.
function rows(input: string, columns: number): string[][] {
	const list = input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (!list.length || list.length > 500)
		throw new Error("Enter between 1 and 500 nonblank rows.");
	return list.map((line, i) => {
		const cells = line.split("|").map((cell) => cell.trim());
		if (cells.length !== columns || cells.some((cell) => !cell))
			throw new Error(
				`Row ${i + 1}: use ${columns} nonempty values separated by |.`,
			);
		return cells;
	});
}
function lines(input: string): string[] {
	return rows(input, 1).map((row) => row[0]);
}
function number(
	value: string,
	label: string,
	min = 0,
	max = 1_000_000,
): number {
	if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim()))
		throw new Error(`${label}: enter a nonnegative decimal number.`);
	const n = Number(value);
	if (!Number.isFinite(n) || n < min || n > max)
		throw new Error(`${label}: enter a number from ${min} to ${max}.`);
	return n;
}
function cents(value: string): number {
	if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))
		throw new Error(
			"Amounts must be nonnegative with at most two decimal places.",
		);
	return Math.round(number(value, "Amount") * 100);
}
function money(value: number): string {
	return (value / 100).toFixed(2);
}
function fmt(value: number): string {
	return Number(value.toFixed(4)).toString();
}
const DAY = 86_400_000;
function date(value: string): number {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
		throw new Error("Dates must use YYYY-MM-DD.");
	const time = Date.parse(`${value}T00:00:00Z`);
	if (
		!Number.isFinite(time) ||
		new Date(time).toISOString().slice(0, 10) !== value
	)
		throw new Error("Enter a valid calendar date.");
	return time;
}
function clock(value: string): number {
	if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
		throw new Error("Times must use 24-hour HH:MM.");
	const [h, m] = value.split(":").map(Number);
	return h * 60 + m;
}
function time(value: number): string {
	return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function input(label: string, value: string, help: string): Field {
	return { key: "input", label, value, help };
}
function setting(key: string, label: string, value: string): Field {
	return { key, label, value, type: "text" };
}
function choice(key: string, label: string, options: string[]): Field {
	return { key, label, value: options[0], type: "select", options };
}
function make(
	fields: Field[],
	help: string,
	run: (v: Values) => string,
	smoke: string,
): LocalTool {
	return { fields, help, run, smoke, filename: "plan.txt" };
}
function uniqueNames(names: string[]): void {
	if (
		new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length
	)
		throw new Error("Names must be unique (ignoring case).");
}
function quantities(
	input: string,
): { name: string; quantity: number; unit: string }[] {
	return rows(input, 3).map(([name, quantity, unit]) => ({
		name,
		quantity: number(quantity, "Quantity", 0.0001),
		unit,
	}));
}
function consolidate(items: ReturnType<typeof quantities>): string {
	const groups = new Map<
		string,
		{ name: string; quantity: number; unit: string }
	>();
	for (const item of items) {
		const key = JSON.stringify([
			item.name.toLocaleLowerCase(),
			item.unit.toLocaleLowerCase(),
		]);
		const prior = groups.get(key);
		if (prior) prior.quantity += item.quantity;
		else groups.set(key, { ...item });
	}
	return [...groups.values()]
		.map((item) => `- [ ] ${item.name}: ${fmt(item.quantity)} ${item.unit}`)
		.join("\n");
}

export const shoppingList = make(
	[
		input(
			"Shopping items",
			"Milk | 2 | liters\nEggs | 6 | each\nmilk | 1 | liters",
			"One item | quantity | unit per line. Matching names and units are combined; units are not converted.",
		),
	],
	"Combines up to 500 shopping rows using case-insensitive item and unit names. Keeps different units separate.",
	(v) => `SHOPPING LIST\n\n${consolidate(quantities(v.input))}`,
	"Milk: 3 liters",
);

export const packingList = make(
	[
		input(
			"Packing items",
			"Clothing | Shirts | 1\nClothing | Socks | 2\nEssentials | Charger | 1",
			"One category | item | quantity per person per day.",
		),
		setting("people", "Travelers", "2"),
		setting("days", "Days to pack for", "3"),
		choice("scale", "Quantity multiplier", [
			"Per person per day",
			"Per person",
			"Once for the trip",
		]),
	],
	"Use Once for the trip for shared essentials; Per person for personal items. All rows use the selected multiplier; run separate lists for different rules.",
	(v) => {
		const people = integer(v.people, 1, 100),
			days = integer(v.days, 1, 365);
		const multiplier =
			v.scale === "Per person per day"
				? people * days
				: v.scale === "Per person"
					? people
					: 1;
		const groups = new Map<string, string[]>();
		for (const [category, item, quantity] of rows(v.input, 3)) {
			const count = integer(quantity, 1, 10000) * multiplier;
			groups.set(category, [
				...(groups.get(category) ?? []),
				`- [ ] ${item} × ${count}`,
			]);
		}
		return `PACKING LIST\n\n${[...groups].map(([name, items]) => `${name}\n${items.join("\n")}`).join("\n\n")}`;
	},
	"Shirts × 6",
);

export const taskPriority = make(
	[
		input(
			"Tasks",
			"Book appointment | yes | yes\nPlan weekend | no | yes\nReply to promo | yes | no\nBrowse sale | no | no",
			"One task | urgent (yes/no) | important (yes/no).",
		),
	],
	"Groups tasks into an Eisenhower matrix from your explicit urgency and importance choices.",
	(v) => {
		const groups: string[][] = [[], [], [], []];
		for (const [task, urgent, important] of rows(v.input, 3)) {
			if (![urgent, important].every((x) => /^(yes|no)$/i.test(x)))
				throw new Error("Urgent and important must be yes or no.");
			groups[
				important.toLowerCase() === "yes"
					? urgent.toLowerCase() === "yes"
						? 0
						: 1
					: urgent.toLowerCase() === "yes"
						? 2
						: 3
			].push(`- [ ] ${task}`);
		}
		return ["Do first", "Schedule", "Delegate if possible", "Consider dropping"]
			.map((name, i) => `${name}\n${groups[i].join("\n") || "(none)"}`)
			.join("\n\n");
	},
	"Do first",
);

export const taskCapacity = make(
	[
		input(
			"Tasks in priority order",
			"Laundry | 30\nGroceries | 60\nRead | 25",
			"One task | estimated minutes. Your order sets the priority.",
		),
		setting("available", "Available minutes", "90"),
		setting("buffer", "Buffer between tasks (minutes)", "5"),
	],
	"Greedily fits tasks in your priority order, skipping tasks that will not fit. Buffer is inserted between accepted tasks, never after the last task.",
	(v) => {
		const available = integer(v.available, 1, 10080),
			buffer = integer(v.buffer, 0, 120);
		let used = 0;
		const accepted: string[] = [],
			deferred: string[] = [];
		for (const [name, minutes] of rows(v.input, 2)) {
			const duration = integer(minutes, 1, 10080),
				cost = duration + (accepted.length ? buffer : 0);
			if (used + cost <= available) {
				used += cost;
				accepted.push(`- [ ] ${name} (${duration} min)`);
			} else deferred.push(`- ${name} (${duration} min)`);
		}
		return `TODAY'S PLAN\n${accepted.join("\n") || "No task fits."}\n\nUsed: ${used} min\nRemaining: ${available - used} min\n\nDeferred\n${deferred.join("\n") || "(none)"}`;
	},
	"Remaining: 30 min",
);

export const weeklyBudget = make(
	[
		input(
			"Weekly activities",
			"Sleep | 56\nWork | 40\nCommute | 5\nMeals | 14\nExercise | 4",
			"One activity | hours per week. Count overlapping activities only once.",
		),
		setting("budget", "Hours in your planning period", "168"),
	],
	"Totals time commitments and reports spare hours or an overbooked budget. Percentages use your planning period.",
	(v) => {
		const budget = number(v.budget, "Budget", 0.01, 10000);
		let total = 0;
		const report = rows(v.input, 2).map(([name, hours]) => {
			const n = number(hours, "Hours", 0, 10000);
			total += n;
			return `${name}: ${fmt(n)} h (${fmt((n / budget) * 100)}%)`;
		});
		return `TIME BUDGET\n${report.join("\n")}\n\nCommitted: ${fmt(total)} h\n${total <= budget ? "Unallocated" : "Overbooked"}: ${fmt(Math.abs(budget - total))} h`;
	},
	"Unallocated: 49 h",
);

export const scheduleOverlap = make(
	[
		input(
			"Appointments",
			"School run | 08:00 | 08:45\nBreakfast | 08:30 | 09:00\nWork | 09:00 | 17:00",
			"One appointment | start HH:MM | end HH:MM on the same day.",
		),
	],
	"Checks all appointment pairs, including nested appointments. Touching endpoints do not conflict. Overnight events must be split across days.",
	(v) => {
		const events = rows(v.input, 3).map(([name, start, end]) => {
			const a = clock(start),
				b = clock(end);
			if (b <= a)
				throw new Error("End time must follow start time on the same day.");
			return { name, a, b };
		});
		const conflicts: string[] = [];
		for (let i = 0; i < events.length; i++)
			for (let j = i + 1; j < events.length; j++) {
				const a = events[i],
					b = events[j],
					start = Math.max(a.a, b.a),
					end = Math.min(a.b, b.b);
				if (start < end)
					conflicts.push(
						`${a.name} ↔ ${b.name}: ${time(start)}–${time(end)} (${end - start} min)`,
					);
			}
		return `SCHEDULE CHECK\n${events.length} appointments · ${conflicts.length} conflicts\n\n${conflicts.join("\n") || "No overlapping appointments."}`;
	},
	"15 min",
);

export const meetingAgenda = make(
	[
		input(
			"Agenda topics",
			"Check-in | 5\nDiscuss options | 20\nDecisions and next steps | 10",
			"One topic | minutes.",
		),
		setting("start", "Start time (HH:MM)", "10:00"),
		setting("budget", "Meeting budget (minutes)", "30"),
	],
	"Allocates consecutive time slots and highlights budget overruns. Agendas must finish before midnight.",
	(v) => {
		const start = clock(v.start),
			budget = integer(v.budget, 1, 1440);
		let cursor = start;
		const agenda = rows(v.input, 2).map(([topic, duration]) => {
			const n = integer(duration, 1, 1440),
				begin = cursor;
			cursor += n;
			if (cursor >= 1440)
				throw new Error("Agenda must finish before midnight.");
			return `${time(begin)}–${time(cursor)}  ${topic}`;
		});
		const duration = cursor - start;
		return `MEETING AGENDA\n${agenda.join("\n")}\n\nTotal: ${duration} min\n${duration > budget ? `Over budget: ${duration - budget} min` : `Spare time: ${budget - duration} min`}`;
	},
	"Over budget: 5 min",
);

export const choreRotation = make(
	[
		input("Chores", "Dishes\nVacuum\nTrash", "One chore per line."),
		{
			key: "people",
			label: "Household members",
			value: "Alex\nSam\nJordan",
			help: "One unique name per line.",
		},
		setting("weeks", "Weeks to plan", "3"),
		setting("offset", "Starting rotation offset", "0"),
	],
	"Round-robin rotation by chore and week. With unequal numbers of chores and people, some members may have more or no chores in a given week. Offset changes the starting assignee.",
	(v) => {
		const chores = lines(v.input),
			people = lines(v.people);
		uniqueNames(people);
		const weeks = integer(v.weeks, 1, 52),
			offset = integer(v.offset, 0, 10000);
		return Array.from(
			{ length: weeks },
			(_, week) =>
				`Week ${week + 1}\n${chores.map((chore, i) => `- ${chore}: ${people[(i + week + offset) % people.length]}`).join("\n")}`,
		).join("\n\n");
	},
	"Dishes: Alex",
);

export const habitStreak = make(
	[
		input(
			"Completed dates",
			"2026-10-01\n2026-10-02\n2026-10-04",
			"One YYYY-MM-DD per completed day. Duplicate dates count once.",
		),
		setting("start", "Tracking start", "2026-10-01"),
		setting("asof", "As of date", "2026-10-05"),
	],
	"Measures daily completion in an inclusive date range. Current streak may end today or yesterday. Dates outside the range are rejected. Maximum tracking period: 3,660 days.",
	(v) => {
		const start = date(v.start),
			end = date(v.asof),
			days = (end - start) / DAY + 1;
		if (days < 1 || days > 3660)
			throw new Error("Tracking range must contain 1–3,660 days.");
		const done = new Set(lines(v.input).map(date));
		if ([...done].some((d) => d < start || d > end))
			throw new Error("Completed dates must fall inside the tracking range.");
		let longest = 0,
			streak = 0;
		for (let day = start; day <= end; day += DAY) {
			streak = done.has(day) ? streak + 1 : 0;
			longest = Math.max(longest, streak);
		}
		let cursor = done.has(end) ? end : end - DAY,
			current = 0;
		while (cursor >= start && done.has(cursor)) {
			current++;
			cursor -= DAY;
		}
		return `HABIT SUMMARY\nCompleted: ${done.size} / ${days} days\nCompletion: ${fmt((done.size / days) * 100)}%\nLongest streak: ${longest} days\nCurrent streak: ${current} days`;
	},
	"Longest streak: 2 days",
);

export const dateCountdown = make(
	[
		input(
			"Upcoming dates",
			"Trip | 2026-10-20\nBirthday | 2026-11-03\nRenewal | 2026-09-30",
			"One event | YYYY-MM-DD.",
		),
		setting("asof", "Reference date", "2026-10-02"),
	],
	"Sorts events by date and reports calendar-day distances without timezone or daylight-saving shifts.",
	(v) => {
		const ref = date(v.asof);
		return `DATE COUNTDOWNS\n${rows(v.input, 2)
			.map(([name, day]) => ({ name, day, distance: (date(day) - ref) / DAY }))
			.sort((a, b) => a.distance - b.distance)
			.map(
				(e) =>
					`${e.name} · ${e.day}: ${e.distance === 0 ? "today" : e.distance > 0 ? `in ${e.distance} days` : `${-e.distance} days ago`}`,
			)
			.join("\n")}`;
	},
	"in 18 days",
);

export const readingPlan = make(
	[
		setting("pages", "Total pages", "320"),
		setting("read", "Pages already read", "80"),
		setting("days", "Reading days remaining", "12"),
		setting("speed", "Pages per hour", "30"),
	],
	"Calculates a rounded-up daily reading target and distributes remaining pages evenly across reading days. Maximum 366 days; no calendar or weekend assumptions.",
	(v) => {
		const pages = integer(v.pages, 1, 100000),
			read = integer(v.read, 0, pages),
			days = integer(v.days, 1, 366),
			speed = number(v.speed, "Reading speed", 0.01, 10000),
			remaining = pages - read;
		const base = Math.floor(remaining / days),
			extra = remaining % days;
		return `READING PLAN\nRemaining: ${remaining} pages\nDaily target: ${Math.ceil(remaining / days)} pages\nEstimated time: ${fmt(remaining / speed)} h\n\n${Array.from({ length: days }, (_, i) => `Day ${i + 1}: ${base + (i < extra ? 1 : 0)} pages`).join("\n")}`;
	},
	"Daily target: 20 pages",
);

export const expenseSettlement = make(
	[
		input(
			"Amounts paid",
			"Alex | 90\nSam | 30\nJordan | 0",
			"One unique participant | amount paid. Include everyone, even if they paid zero.",
		),
	],
	"Splits the total equally in one currency and suggests transfers. Uses integer cents; leftover cents are assigned to participants in input order. Transfers settle balances but are not guaranteed to minimize transfer count.",
	(v) => {
		const paid = rows(v.input, 2).map(([name, value]) => ({
			name,
			paid: cents(value),
		}));
		uniqueNames(paid.map((p) => p.name));
		const total = paid.reduce((s, p) => s + p.paid, 0),
			base = Math.floor(total / paid.length),
			remainder = total % paid.length;
		const balances = paid.map((p, i) => ({
			...p,
			share: base + (i < remainder ? 1 : 0),
			balance: p.paid - base - (i < remainder ? 1 : 0),
		}));
		const creditors = balances
				.filter((p) => p.balance > 0)
				.map((p) => ({ ...p })),
			debtors = balances.filter((p) => p.balance < 0).map((p) => ({ ...p }));
		const transfers: string[] = [];
		let c = 0;
		for (const debtor of debtors)
			while (debtor.balance < 0) {
				const creditor = creditors[c],
					amount = Math.min(-debtor.balance, creditor.balance);
				transfers.push(`${debtor.name} → ${creditor.name}: ${money(amount)}`);
				debtor.balance += amount;
				creditor.balance -= amount;
				if (!creditor.balance) c++;
			}
		return `SHARED EXPENSES\nTotal: ${money(total)}\n${balances.map((p) => `${p.name}: paid ${money(p.paid)}, share ${money(p.share)}`).join("\n")}\n\nSuggested transfers\n${transfers.join("\n") || "Everyone is settled."}`;
	},
	"Jordan → Alex: 40.00",
);

export const savingsGoal = make(
	[
		setting("goal", "Savings goal", "1500"),
		setting("saved", "Already saved", "300"),
		setting("deposit", "Contribution per period", "100"),
		setting("periods", "Periods until deadline", "10"),
	],
	"Simple contribution arithmetic in a single currency, with no interest, fees or investment assumptions. Periods may represent weeks or months; use the same period throughout.",
	(v) => {
		const goal = cents(v.goal),
			saved = cents(v.saved),
			deposit = cents(v.deposit),
			periods = integer(v.periods, 1, 10000),
			remaining = Math.max(0, goal - saved);
		return `SAVINGS GOAL\nRemaining: ${money(remaining)}\nRequired per period: ${money(Math.ceil(remaining / periods))}\nProjected balance: ${money(saved + deposit * periods)}\n${saved + deposit * periods < goal ? `Shortfall: ${money(goal - saved - deposit * periods)}` : "Goal covered by the deadline."}\nPeriods needed: ${remaining === 0 ? "0" : deposit ? Math.ceil(remaining / deposit) : "No progress with a zero contribution"}`;
	},
	"Required per period: 120.00",
);

export const subscriptionCosts = make(
	[
		input(
			"Subscriptions",
			"Music | 10.99 | monthly\nStorage | 24 | yearly\nNewsletter | 2 | weekly",
			"One name | cost | weekly, monthly, quarterly or yearly. Use one currency.",
		),
	],
	"Annualizes costs using 52 weeks, 12 months or 4 quarters per year. Monthly equivalents are estimates, not actual billing dates.",
	(v) => {
		const factors: Record<string, number> = {
			weekly: 52,
			monthly: 12,
			quarterly: 4,
			yearly: 1,
		};
		let total = 0;
		const report = rows(v.input, 3).map(([name, cost, cycle]) => {
			const factor = factors[cycle.toLowerCase()];
			if (!Object.hasOwn(factors, cycle.toLowerCase()))
				throw new Error(
					"Billing cycle must be weekly, monthly, quarterly or yearly.",
				);
			const annual = cents(cost) * factor;
			total += annual;
			return `${name}: ${money(annual)} / year`;
		});
		return `SUBSCRIPTION AUDIT\n${report.join("\n")}\n\nAnnual total: ${money(total)}\nMonthly equivalent: ${money(Math.round(total / 12))}`;
	},
	"Annual total: 259.88",
);

export const unitPrice = make(
	[
		input(
			"Products",
			"Small pack | 3.50 | 500\nLarge pack | 6.00 | 1000",
			"One product | price | quantity in the SAME unit for every product.",
		),
		setting("unit", "Quantity unit", "g"),
		setting("basis", "Compare price per this many units", "100"),
	],
	"Ranks products by normalized unit price in a single currency. Quantities must use one common unit; this tool does not convert units.",
	(v) => {
		const basis = number(v.basis, "Comparison quantity", 0.0001);
		const products = rows(v.input, 3)
			.map(([name, price, quantity]) => ({
				name,
				cost: cents(price),
				amount: number(quantity, "Quantity", 0.0001),
			}))
			.sort((a, b) => a.cost / a.amount - b.cost / b.amount);
		return `UNIT PRICE COMPARISON\n${products.map((p, i) => `${i + 1}. ${p.name}: ${money(Math.round((p.cost / p.amount) * basis))} per ${fmt(basis)} ${v.unit}${i === 0 ? " · best value" : ""}`).join("\n")}`;
	},
	"Large pack: 0.60",
);

export const discountStack = make(
	[
		setting("price", "Original price", "100"),
		{
			key: "input",
			label: "Successive discounts (%)",
			value: "20\n10",
			help: "One percentage per line. Discounts apply sequentially, not additively.",
		},
		setting("tax", "Tax after discounts (%)", "8"),
	],
	"Applies each discount sequentially, rounding to cents at each step, then applies tax to the discounted subtotal. Enter rates from your receipt; no tax rules are inferred.",
	(v) => {
		const original = cents(v.price);
		let subtotal = original;
		const steps = lines(v.input).map((value, i) => {
			const rate = number(value, "Discount", 0, 100);
			subtotal = Math.round(subtotal * (1 - rate / 100));
			return `After discount ${i + 1} (${fmt(rate)}%): ${money(subtotal)}`;
		});
		const tax = Math.round((subtotal * number(v.tax, "Tax", 0, 100)) / 100);
		return `DISCOUNT CALCULATOR\n${steps.join("\n")}\nSavings before tax: ${money(original - subtotal)}\nTax: ${money(tax)}\nFinal price: ${money(subtotal + tax)}`;
	},
	"Final price: 77.76",
);

export const recipeScale = make(
	[
		input(
			"Ingredients",
			"Flour | 200 | g\nMilk | 150 | ml\nEggs | 2 | each",
			"One ingredient | decimal quantity | unit. Convert fractions to decimals first.",
		),
		setting("original", "Original servings", "4"),
		setting("target", "Desired servings", "6"),
	],
	"Scales quantities proportionally without changing units. Fractional eggs and other indivisible ingredients are retained for your judgment; cooking times are not scaled.",
	(v) => {
		const ratio =
			number(v.target, "Desired servings", 0.01, 10000) /
			number(v.original, "Original servings", 0.01, 10000);
		return `SCALED RECIPE · ×${fmt(ratio)}\n${quantities(v.input)
			.map((i) => `${i.name}: ${fmt(i.quantity * ratio)} ${i.unit}`)
			.join("\n")}`;
	},
	"Flour: 300 g",
);

export const travelBudget = make(
	[
		input(
			"Trip costs",
			"Lodging | 120 | per night\nFood | 35 | per person per day\nTickets | 50 | per person\nTransport | 80 | once",
			"One cost | amount | once, per night, per person or per person per day.",
		),
		setting("people", "Travelers", "2"),
		setting("days", "Days", "3"),
		setting("nights", "Nights", "2"),
		setting("buffer", "Contingency (%)", "10"),
	],
	"Multiplies each cost by its explicit frequency, then adds contingency. Lodging per night is shared by the group. Use one currency; no exchange rates or price estimates are fetched.",
	(v) => {
		const people = integer(v.people, 1, 100),
			days = integer(v.days, 1, 365),
			nights = integer(v.nights, 0, 365);
		const factors: Record<string, number> = {
			once: 1,
			"per night": nights,
			"per person": people,
			"per person per day": people * days,
		};
		let total = 0;
		const costs = rows(v.input, 3).map(([name, amount, frequency]) => {
			if (!Object.hasOwn(factors, frequency.toLowerCase()))
				throw new Error(
					"Use once, per night, per person or per person per day.",
				);
			const cost = cents(amount) * factors[frequency.toLowerCase()];
			total += cost;
			return `${name}: ${money(cost)}`;
		});
		const buffer = Math.round(
			(total * number(v.buffer, "Contingency", 0, 100)) / 100,
		);
		return `TRAVEL BUDGET\n${costs.join("\n")}\n\nSubtotal: ${money(total)}\nContingency: ${money(buffer)}\nTotal: ${money(total + buffer)}\nPer traveler: ${money(Math.round((total + buffer) / people))}`;
	},
	"Total: 693.00",
);

export const mealShopping = make(
	[
		input(
			"Meal ingredients",
			"Monday pasta | Pasta | 200 | g\nMonday pasta | Tomatoes | 3 | each\nTuesday salad | Tomatoes | 2 | each",
			"One meal | ingredient | quantity | unit. Enter the total quantity needed for that meal.",
		),
	],
	"Collects meal names and merges ingredient quantities by case-insensitive name and unit. Different units stay separate. Amounts represent your entire household, not per-serving quantities.",
	(v) => {
		const data = rows(v.input, 4),
			meals = [...new Set(data.map((row) => row[0]))];
		const items = data.map(([, name, quantity, unit]) => ({
			name,
			quantity: number(quantity, "Quantity", 0.0001),
			unit,
		}));
		return `MEAL PLAN\n${meals.map((meal) => `- ${meal}`).join("\n")}\n\nGROCERY CHECKLIST\n${consolidate(items)}`;
	},
	"Tomatoes: 5 each",
);

export const checklistFormat = make(
	[
		input(
			"Checklist items",
			"Book tickets\n[x] Charge phone\n- [ ] Pack bag\nBook tickets",
			"One item per line. Existing [x] or [ ] markers are recognized.",
		),
		choice("format", "Output format", [
			"Markdown checklist",
			"Numbered list",
			"Plain text",
		]),
		choice("duplicates", "Duplicate items", ["Remove", "Keep"]),
	],
	"Cleans bullets and checkbox markers. Case-insensitive duplicates keep the first spelling and become completed if any duplicate was checked.",
	(v) => {
		const items: { text: string; checked: boolean }[] = [];
		const seen = new Map<string, number>();
		for (const line of lines(v.input)) {
			const match = line.match(/^(?:[-*]\s+)?\[([ xX])\]\s*(.*)$/);
			const checked = !!match && match[1].toLowerCase() === "x",
				text = (match ? match[2] : line.replace(/^[-*]\s+/, "")).trim();
			if (!text) throw new Error("Checklist items must contain text.");
			const key = text.toLocaleLowerCase(),
				index = seen.get(key);
			if (v.duplicates === "Remove" && index !== undefined)
				items[index].checked ||= checked;
			else {
				seen.set(key, items.length);
				items.push({ text, checked });
			}
		}
		return items
			.map((item, i) =>
				v.format === "Markdown checklist"
					? `- [${item.checked ? "x" : " "}] ${item.text}`
					: v.format === "Numbered list"
						? `${i + 1}. ${item.text}${item.checked ? " (done)" : ""}`
						: `${item.text}${item.checked ? " (done)" : ""}`,
			)
			.join("\n");
	},
	"- [x] Charge phone",
);

export const PRODUCTIVITY_TOOLS = [
	{
		id: "shopping-list",
		name: "Shopping List Consolidator",
		summary: "Combine repeated items and quantities into a grocery checklist.",
		tool: shoppingList,
	},
	{
		id: "packing-list",
		name: "Packing List Planner",
		summary:
			"Group packing items and scale quantities for travelers and trip length.",
		tool: packingList,
	},
	{
		id: "task-priority",
		name: "Task Priority Matrix",
		summary: "Sort urgent and important tasks into four actionable groups.",
		tool: taskPriority,
	},
	{
		id: "task-capacity",
		name: "Daily Task Planner",
		summary: "Fit prioritized tasks into your available time with breaks.",
		tool: taskCapacity,
	},
	{
		id: "weekly-time-budget",
		name: "Weekly Time Budget",
		summary: "Find unallocated hours and overbooked commitments.",
		tool: weeklyBudget,
	},
	{
		id: "schedule-overlap",
		name: "Schedule Conflict Checker",
		summary: "Find overlapping appointments in a daily schedule.",
		tool: scheduleOverlap,
	},
	{
		id: "meeting-agenda",
		name: "Meeting Agenda Builder",
		summary: "Turn discussion topics into timed slots and flag overruns.",
		tool: meetingAgenda,
	},
	{
		id: "chore-rotation",
		name: "Chore Rotation Planner",
		summary: "Rotate household chores fairly across people and weeks.",
		tool: choreRotation,
	},
	{
		id: "habit-streak",
		name: "Habit Streak Analyzer",
		summary: "Measure daily completion and current and longest streaks.",
		tool: habitStreak,
	},
	{
		id: "date-countdown",
		name: "Event Countdown Planner",
		summary: "Sort important dates and see days remaining or elapsed.",
		tool: dateCountdown,
	},
	{
		id: "reading-plan",
		name: "Reading Plan Calculator",
		summary: "Break remaining pages into daily targets and reading hours.",
		tool: readingPlan,
	},
	{
		id: "expense-settlement",
		name: "Shared Expense Settler",
		summary:
			"Split group expenses equally and calculate reimbursement transfers.",
		tool: expenseSettlement,
	},
	{
		id: "savings-goal",
		name: "Savings Goal Planner",
		summary:
			"Calculate contributions, remaining periods and deadline shortfalls.",
		tool: savingsGoal,
	},
	{
		id: "subscription-costs",
		name: "Subscription Cost Audit",
		summary: "Compare recurring costs with monthly and annual totals.",
		tool: subscriptionCosts,
	},
	{
		id: "unit-price",
		name: "Unit Price Comparison",
		summary: "Compare pack sizes and rank products by price per unit.",
		tool: unitPrice,
	},
	{
		id: "discount-stack",
		name: "Stacked Discount Calculator",
		summary: "Apply successive discounts and receipt tax with cent rounding.",
		tool: discountStack,
	},
	{
		id: "recipe-scale",
		name: "Recipe Serving Scaler",
		summary: "Adjust ingredient amounts to your desired serving count.",
		tool: recipeScale,
	},
	{
		id: "travel-budget",
		name: "Travel Budget Planner",
		summary: "Estimate shared and per-person costs with contingency.",
		tool: travelBudget,
	},
	{
		id: "meal-shopping",
		name: "Meal Plan Grocery Builder",
		summary: "Combine ingredients from planned meals into one shopping list.",
		tool: mealShopping,
	},
	{
		id: "checklist-format",
		name: "Checklist Cleaner",
		summary: "Clean, deduplicate and format tasks while preserving completion.",
		tool: checklistFormat,
	},
].map((entry) => ({
	...entry,
	tool: { ...entry.tool, filename: `${entry.id}.txt` },
}));
