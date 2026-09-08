import {
	csvField,
	delimiterField,
	formulaField,
	parseCsv,
	writeCsv,
} from "./csv";
import { json, type LocalTool, object } from "./types";
export const tool: LocalTool = {
	fields: [
		csvField,
		{
			key: "keys",
			label: "Sort keys (JSON array)",
			value:
				'[{"column":"team","type":"Text","direction":"Ascending"},{"column":"score","type":"Number","direction":"Descending"}]',
			help: "Types: Text, Natural, Number. Directions: Ascending, Descending. Earlier keys take priority.",
		},
		{
			key: "blanks",
			label: "Blank cells",
			type: "select",
			value: "Last",
			options: ["First", "Last"],
		},
		{
			key: "case",
			label: "Text case",
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
	filename: "sorted.csv",
	smoke: "Alex,Design,92",
	help: "Stable multi-key sorting leaves original cell values intact. Blank placement is independent of direction. Text uses code-point order; Natural uses English numeric collation (item2 before item10). Numeric columns accept finite decimal/scientific notation, reject unsafe integers and invalid cells, and use JavaScript floating-point precision.",
	run: (v) => {
		const { headers, rows } = parseCsv(v.input, v.delimiter);
		const raw = json(v.keys);
		if (!Array.isArray(raw) || !raw.length || raw.length > 20)
			throw new Error("Provide 1–20 sort keys.");
		const keys = raw.map((k) => {
			if (
				!object(k) ||
				typeof k.column !== "string" ||
				!headers.includes(k.column) ||
				!["Text", "Natural", "Number"].includes(String(k.type)) ||
				!["Ascending", "Descending"].includes(String(k.direction))
			)
				throw new Error(
					"Each key needs an existing column, valid type, and valid direction.",
				);
			return {
				index: headers.indexOf(k.column),
				type: k.type,
				direction: k.direction,
			};
		});
		if (new Set(keys.map((k) => k.index)).size !== keys.length)
			throw new Error("Sort columns must be unique.");
		const normalize = (s: string) => {
			let x = v.trim === "Trim" ? s.trim() : s;
			if (v.case === "Ignore case") x = x.toLowerCase();
			return x;
		};
		const data = rows.map((row, index) => ({
			row,
			index,
			values: keys.map((k) => {
				const value = normalize(row[k.index]);
				if (!value) return null;
				if (k.type !== "Number") return value;
				const n = Number(value);
				if (
					!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) ||
					!Number.isFinite(n) ||
					(Number.isInteger(n) && !Number.isSafeInteger(n))
				)
					throw new Error(
						"Numeric sort columns must contain safe finite decimal numbers or blanks.",
					);
				return n;
			}),
		}));
		const collator = new Intl.Collator("en", {
			numeric: true,
			sensitivity: v.case === "Ignore case" ? "base" : "variant",
		});
		data.sort((a, b) => {
			for (let i = 0; i < keys.length; i++) {
				const x = a.values[i],
					y = b.values[i],
					k = keys[i];
				if (x === null || y === null) {
					if (x === y) continue;
					return (x === null ? -1 : 1) * (v.blanks === "First" ? 1 : -1);
				}
				const result =
					k.type === "Natural"
						? collator.compare(String(x), String(y))
						: x === y
							? 0
							: x < y
								? -1
								: 1;
				if (result) return result * (k.direction === "Ascending" ? 1 : -1);
			}
			return a.index - b.index;
		});
		return writeCsv(
			headers,
			data.map((x) => x.row),
			v.formulas === "Protect",
		);
	},
};
