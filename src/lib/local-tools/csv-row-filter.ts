import {
	csvField,
	delimiterField,
	formulaField,
	parseCsv,
	writeCsv,
} from "./csv";
import { json, type LocalTool, object } from "./types";

const ops = [
	"equals",
	"not equals",
	"contains",
	"starts with",
	"ends with",
	"empty",
	"not empty",
	">",
	">=",
	"<",
	"<=",
];
function numeric(s: string) {
	if (
		!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ||
		!Number.isFinite(Number(s))
	)
		throw new Error("Numeric comparisons require finite decimal values.");
	return Number(s);
}
export const tool: LocalTool = {
	fields: [
		csvField,
		{
			key: "rules",
			label: "Filter rules (JSON)",
			value:
				'[{"column":"team","operator":"equals","value":"Design"},{"column":"score","operator":">=","value":"90"}]',
		},
		{
			key: "combine",
			label: "Combine rules",
			type: "select",
			value: "All",
			options: ["All", "Any"],
		},
		{
			key: "keep",
			label: "Output rows",
			type: "select",
			value: "Matching",
			options: ["Matching", "Non-matching"],
		},
		{
			key: "case",
			label: "Text comparison",
			type: "select",
			value: "Case sensitive",
			options: ["Case sensitive", "Ignore case"],
		},
		{
			key: "trim",
			label: "Comparison whitespace",
			type: "select",
			value: "Trim",
			options: ["Trim", "Preserve"],
		},
		delimiterField,
		formulaField,
	],
	filename: "filtered.csv",
	smoke: "Alex,Design,92",
	help: "Use 1–20 rules with column, operator and string value. Operators: equals, not equals, contains, starts with, ends with, empty, not empty, >, >=, <, <=. Empty operators need no value. Numeric rules treat blank cells as non-matches and reject other non-numeric cells. All rules are evaluated; Any does not hide invalid numbers. Comparisons never change output cells. CSV limits are 5,000 rows and 200 columns.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter),
			rules = json(v.rules),
			norm = (s: string) => {
				const x = v.trim === "Trim" ? s.trim() : s;
				return v.case === "Ignore case" ? x.toLowerCase() : x;
			};
		if (!Array.isArray(rules) || !rules.length || rules.length > 20)
			throw new Error("Provide 1–20 filter rules.");
		const prepared = rules.map((r) => {
			if (
				!object(r) ||
				typeof r.column !== "string" ||
				!headers.includes(r.column) ||
				typeof r.operator !== "string" ||
				!ops.includes(r.operator)
			)
				throw new Error(
					"Each rule needs an existing column and supported operator.",
				);
			const op = r.operator,
				empty = op === "empty" || op === "not empty",
				num = [">", ">=", "<", "<="].includes(op);
			if (!empty && typeof r.value !== "string")
				throw new Error("Rule values must be strings.");
			const target = empty ? "" : norm(r.value as string);
			if (num) numeric(target);
			return { i: headers.indexOf(r.column), op, target, num };
		});
		const out = rows.filter((row) => {
			const results = prepared.map((r) => {
				const s = norm(row[r.i]);
				if (r.op === "empty") return s === "";
				if (r.op === "not empty") return s !== "";
				if (r.num) {
					if (!s.trim()) return false;
					const a = numeric(s),
						b = numeric(r.target);
					return r.op === ">"
						? a > b
						: r.op === ">="
							? a >= b
							: r.op === "<"
								? a < b
								: a <= b;
				}
				return r.op === "equals"
					? s === r.target
					: r.op === "not equals"
						? s !== r.target
						: r.op === "contains"
							? s.includes(r.target)
							: r.op === "starts with"
								? s.startsWith(r.target)
								: s.endsWith(r.target);
			});
			const match =
				v.combine === "All" ? results.every(Boolean) : results.some(Boolean);
			return v.keep === "Matching" ? match : !match;
		});
		parseCsv(writeCsv(headers, [], v.formulas === "Protect"), "Comma");
		return writeCsv(headers, out, v.formulas === "Protect");
	},
};
