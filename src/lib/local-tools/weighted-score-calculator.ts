import { json, type LocalTool, object, print } from "./types";

function number(x: unknown, max = 1e12): x is number {
	return typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= max;
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Criteria and candidates (JSON)",
			value:
				'{"criteria":[{"name":"quality","weight":70,"min":0,"max":10,"direction":"higher"},{"name":"ease","weight":30,"min":0,"max":10,"direction":"higher"}],"candidates":[{"name":"Option A","scores":{"quality":9,"ease":6}},{"name":"Option B","scores":{"quality":8,"ease":9}}]}',
		},
		{
			key: "missing",
			label: "Missing or null scores",
			type: "select",
			value: "Error",
			options: ["Error", "Zero normalized score", "Exclude criterion"],
		},
		{
			key: "bounds",
			label: "Scores outside criterion range",
			type: "select",
			value: "Error",
			options: ["Error", "Clamp"],
		},
		{
			key: "details",
			label: "Result detail",
			type: "select",
			value: "Include contributions",
			options: ["Include contributions", "Summary"],
		},
	],
	filename: "weighted-scorecard.json",
	smoke: '"name": "Option B"',
	help: "Provide 1–50 uniquely named criteria and 1–200 uniquely named candidates. Each criterion needs weight (0–1,000,000), min, max and direction (higher/lower). Scores normalize to 0–1 within those bounds; weights need not total 100. Missing-score exclusion renormalizes each candidate independently and may reduce comparability. Zero normalized score is always worst, including lower-is-better criteria. Unknown score keys are rejected. Exact score ties share competition rank; original order breaks ties. This is a transparent arithmetic model, not an objective recommendation.",
	run: (v) => {
		const data = json(v.input);
		if (
			!object(data) ||
			!Array.isArray(data.criteria) ||
			!data.criteria.length ||
			data.criteria.length > 50 ||
			!Array.isArray(data.candidates) ||
			!data.candidates.length ||
			data.candidates.length > 200
		)
			throw new Error("Provide criteria (1–50) and candidates (1–200) arrays.");
		const criteria = data.criteria.map((c) => {
			if (
				!object(c) ||
				typeof c.name !== "string" ||
				!c.name.trim() ||
				c.name.length > 100 ||
				!number(c.weight, 1000000) ||
				c.weight < 0 ||
				!number(c.min) ||
				!number(c.max) ||
				c.max <= c.min ||
				typeof c.direction !== "string" ||
				!["higher", "lower"].includes(c.direction)
			)
				throw new Error(
					"Each criterion needs name, non-negative weight, increasing min/max and higher/lower direction.",
				);
			return {
				name: c.name,
				weight: c.weight,
				min: c.min,
				max: c.max,
				direction: c.direction,
			};
		});
		const keys = new Set(criteria.map((c) => c.name));
		if (keys.size !== criteria.length || !criteria.some((c) => c.weight > 0))
			throw new Error(
				"Criterion names must be unique and at least one weight positive.",
			);
		const candidateNames = new Set<string>();
		const ranked = data.candidates
			.map((c, index) => {
				if (
					!object(c) ||
					typeof c.name !== "string" ||
					!c.name.trim() ||
					c.name.length > 100 ||
					candidateNames.has(c.name) ||
					!object(c.scores)
				)
					throw new Error("Candidates need unique names and score objects.");
				candidateNames.add(c.name);
				const scores = c.scores;
				if (Object.keys(scores).some((key) => !keys.has(key)))
					throw new Error(`Unknown score criterion for ${c.name}.`);
				const contributions = criteria.flatMap((criterion) => {
					const raw = Object.hasOwn(scores, criterion.name)
						? scores[criterion.name]
						: null;
					if (raw == null) {
						if (v.missing === "Error")
							throw new Error(`Missing ${criterion.name} score for ${c.name}.`);
						if (v.missing === "Exclude criterion") return [];
						return [
							{
								criterion: criterion.name,
								weight: criterion.weight,
								raw: null as number | null,
								normalized: 0,
								clamped: false,
							},
						];
					}
					if (!number(raw))
						throw new Error("Scores must be finite numbers within ±10^12.");
					const outOfBounds = raw < criterion.min || raw > criterion.max;
					if (outOfBounds && v.bounds === "Error")
						throw new Error(`Score outside the range for ${criterion.name}.`);
					const value = Math.max(criterion.min, Math.min(criterion.max, raw)),
						fraction =
							(value - criterion.min) / (criterion.max - criterion.min);
					return [
						{
							criterion: criterion.name,
							weight: criterion.weight,
							raw,
							normalized:
								criterion.direction === "lower" ? 1 - fraction : fraction,
							clamped: outOfBounds,
						},
					];
				});
				const weight = contributions.reduce((sum, c) => sum + c.weight, 0);
				if (weight === 0)
					throw new Error(`No positive-weight scores remain for ${c.name}.`);
				const details = contributions.map((c) => ({
					...c,
					weightedPoints: ((c.normalized * c.weight) / weight) * 100,
				}));
				return {
					name: c.name,
					index,
					scorePercent: details.reduce((sum, c) => sum + c.weightedPoints, 0),
					includedWeight: weight,
					excludedCriteria: criteria.length - contributions.length,
					contributions: details,
				};
			})
			.sort((a, b) => b.scorePercent - a.scorePercent || a.index - b.index);
		let rank = 0;
		return print({
			criteriaCount: criteria.length,
			candidateCount: ranked.length,
			missingPolicy: v.missing,
			rankings: ranked.map((r, i) => {
				if (i === 0 || r.scorePercent !== ranked[i - 1].scorePercent)
					rank = i + 1;
				return {
					rank,
					name: r.name,
					scorePercent: r.scorePercent,
					includedWeight: r.includedWeight,
					excludedCriteria: r.excludedCriteria,
					...(v.details === "Include contributions"
						? { contributions: r.contributions }
						: {}),
				};
			}),
		});
	},
};
