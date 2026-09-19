import { describe, expect, it } from "vitest";
import { tool as gradient } from "./local-tools/css-gradient-builder";
import { tool as shadow } from "./local-tools/css-shadow-builder";
import { parseCsv } from "./local-tools/csv";
import { tool as combine } from "./local-tools/csv-concatenate";
import { tool as diff } from "./local-tools/csv-keyed-diff";
import { tool as pivot } from "./local-tools/csv-pivot-table";
import { tool as sample } from "./local-tools/csv-seeded-sampler";
import { tool as set } from "./local-tools/json-array-set";
import { tool as zip } from "./local-tools/json-array-zip";
import { tool as codec } from "./local-tools/json-string-codec";
import { tool as tree } from "./local-tools/json-tree-inspector";
import { tool as regression } from "./local-tools/linear-regression";
import { tool as matrix } from "./local-tools/matrix-calculator";
import { tool as average } from "./local-tools/moving-average";
import { tool as radix } from "./local-tools/radix-arithmetic";
import { tool as indent } from "./local-tools/text-indentation";
import { tool as numbering } from "./local-tools/text-line-numbering";
import { tool as split } from "./local-tools/text-literal-splitter";
import { tool as ngram } from "./local-tools/text-ngram-analyzer";
import {
	defaults,
	execute,
	type LocalTool,
	type Values,
} from "./local-tools/types";
import { tool as units } from "./local-tools/unit-converter";
import { tool as urls } from "./local-tools/url-list-inspector";

const run = (tool: LocalTool, values: Values = {}) =>
	execute(tool, { ...defaults(tool), ...values });
const result = (tool: LocalTool, values: Values = {}) =>
	JSON.parse(run(tool, values));
const tools = {
	zip,
	tree,
	codec,
	set,
	pivot,
	diff,
	combine,
	sample,
	indent,
	numbering,
	ngram,
	split,
	urls,
	regression,
	matrix,
	average,
	radix,
	units,
	shadow,
	gradient,
};

describe.each(Object.entries(tools))("%s shared contract", (_, tool) => {
	it("runs its documented example", () =>
		expect(run(tool)).toContain(tool.smoke));
	it("rejects empty required input", () =>
		expect(() => run(tool, { input: " " })).toThrow("required"));
	it("rejects oversized input before processing", () =>
		expect(() => run(tool, { input: "x".repeat(200001) })).toThrow("200,000"));
});

describe("JSON Array Zipper", () => {
	it("bounds repeated key expansion", () =>
		expect(() => run(zip, { leftKey: "x".repeat(201) })).toThrow(
			"200 characters",
		));
	it("zips without coercing values", () =>
		expect(
			result(zip, { input: '[false,0,""]', right: "[1,2,3]", shape: "Pairs" }),
		).toEqual([
			[false, 1],
			[0, 2],
			["", 3],
		]));
	it("rejects mismatched lengths in strict mode", () =>
		expect(() => run(zip, { right: "[]" })).toThrow("lengths"));
	it("supports shortest and null padding", () => {
		expect(
			result(zip, { right: "[1]", length: "Shortest", shape: "Pairs" }),
		).toEqual([["Alex", 1]]);
		expect(
			result(zip, {
				input: "[]",
				right: "[1]",
				length: "Pad with null",
				shape: "Pairs",
			}),
		).toEqual([[null, 1]]);
	});
	it("preserves prototype-like keys safely", () =>
		expect(
			Object.getOwnPropertyDescriptor(
				result(zip, { input: "[1]", right: "[2]", leftKey: "__proto__" })[0],
				"__proto__",
			)?.value,
		).toBe(1));
	it("rejects colliding output keys", () =>
		expect(() => run(zip, { rightKey: "name" })).toThrow("differ"));
});
describe("JSON Tree Inspector", () => {
	it("escapes pointers and counts Unicode code points", () => {
		const value = result(tree, { input: '{"a/b~c":"😀"}' });
		expect(value.nodes[1]).toEqual({
			pointer: "/a~1b~0c",
			type: "string",
			depth: 1,
			size: 1,
		});
		expect(value.totalNodes).toBe(2);
	});
	it("keeps totals independent of filters", () => {
		const value = result(tree, {
			input: '{"a":[1,2]}',
			filter: "Leaves",
			depth: "1",
		});
		expect(value.totalNodes).toBe(4);
		expect(value.nodes).toEqual([]);
	});
	it("handles scalar roots", () =>
		expect(result(tree, { input: "null" }).nodes).toEqual([
			{ pointer: "", type: "null", depth: 0 },
		]));
	it("bounds expanded node counts", () =>
		expect(() =>
			run(tree, { input: JSON.stringify(Array(10000).fill(0)) }),
		).toThrow("10,000"));
});
describe("JSON String Literal Codec", () => {
	it("round trips multiple layers and Unicode", () => {
		const input = 'quote " slash \\ emoji 😀\n';
		const encoded = run(codec, { input, layers: "3", ascii: "ASCII escapes" });
		expect(encoded).not.toContain("😀");
		expect(
			run(codec, { input: encoded, layers: "3", operation: "Decode" }),
		).toBe(input);
	});
	it("decodes empty strings", () =>
		expect(run(codec, { input: '""', operation: "Decode" })).toBe(""));
	it("rejects nonstrings and malformed layers", () => {
		expect(() => run(codec, { input: "{}", operation: "Decode" })).toThrow(
			"string",
		);
		expect(() =>
			run(codec, { input: '"abc"', operation: "Decode", layers: "2" }),
		).toThrow("Layer 2");
	});
});
describe("JSON Array Set Operations", () => {
	it("ignores object key order but preserves array order and types", () =>
		expect(
			result(set, {
				input: '[{"a":1,"b":2},[1,2],1,"1"]',
				right: '[{"b":2,"a":1},[2,1],1]',
				operation: "Intersection",
			}),
		).toEqual([{ a: 1, b: 2 }, 1]));
	it.each([
		["Union", [1, 2, 3]],
		["Intersection", [2]],
		["Left difference", [1]],
		["Symmetric difference", [1, 3]],
	])("supports %s", (operation, expected) =>
		expect(
			result(set, {
				input: "[1,1,2]",
				right: "[2,3]",
				operation: String(operation),
			}),
		).toEqual(expected),
	);
	it("rejects unsafe JSON integers", () =>
		expect(() => run(set, { input: "[9007199254740993]" })).toThrow(
			"safe range",
		));
});
describe("CSV Pivot Table", () => {
	it.each([
		["Sum", "15"],
		["Count", "2"],
		["Average", "7.5"],
		["Minimum", "3"],
		["Maximum", "12"],
	])("aggregates %s", (aggregation, expected) =>
		expect(parseCsv(run(pivot, { aggregation }), "Comma").rows[0][1]).toBe(
			expected,
		),
	);
	it("keeps empty categories and missing combinations", () =>
		expect(
			parseCsv(
				run(pivot, {
					input: "team,quarter,sales\n,Q1,\nB,Q2,4",
					missing: "Zero",
				}),
				"Comma",
			).rows,
		).toEqual([
			["", "0", "0"],
			["B", "0", "4"],
		]));
	it("rejects invalid numeric cells", () =>
		expect(() => run(pivot, { input: "team,quarter,sales\nA,Q1,no" })).toThrow(
			"number",
		));
	it("protects formulas", () =>
		expect(run(pivot, { input: "team,quarter,sales\n=1+1,Q1,2" })).toContain(
			"'=1+1",
		));
});
describe("CSV Snapshot Diff", () => {
	it("reports row additions, removals and cell changes", () => {
		const value = result(diff);
		expect(value.added[0].id).toBe("4");
		expect(value.removed[0].id).toBe("2");
		expect(value.changed[0].changes).toEqual([
			{ column: "score", before: "90", after: "92" },
		]);
	});
	it("ignores row/column order", () =>
		expect(
			result(diff, { input: "id,x\n1,a\n2,b", after: "x,id\nb,2\na,1" })
				.unchangedRows,
		).toBe(2));
	it("distinguishes absent columns from empty strings", () =>
		expect(
			result(diff, { input: "id,x\n1,", after: "id,y\n1," }).changed[0].changes,
		).toEqual([
			{ column: "x", before: "", after: null },
			{ column: "y", before: null, after: "" },
		]));
	it("rejects duplicate keys", () =>
		expect(() => run(diff, { input: "id,x\n1,a\n1,b" })).toThrow(
			"Duplicate key",
		));
	it("handles composite keys and prototype names", () =>
		expect(
			result(diff, {
				input: "id,__proto__,x\n1,a,old",
				after: "id,__proto__,x\n1,a,new",
				keys: "id\n__proto__",
			}).changed[0].key,
		).toEqual(["1", "a"]));
});
describe("CSV File Combiner", () => {
	it("unions reordered schemas", () =>
		expect(parseCsv(run(combine), "Comma").rows).toEqual([
			["Alex", "Design", ""],
			["Sam", "Engineering", ""],
			["Riley", "Design", "Remote"],
		]));
	it("intersects and deduplicates after projection", () =>
		expect(
			parseCsv(
				run(combine, {
					input: "a,b\n1,x",
					second: "b,c\nx,2",
					schema: "Intersection",
					duplicates: "Remove",
				}),
				"Comma",
			),
		).toEqual({ headers: ["b"], rows: [["x"]] }));
	it("strict mode allows reordered headers", () =>
		expect(
			parseCsv(
				run(combine, {
					input: "a,b\n1,2",
					second: "b,a\n3,4",
					schema: "Require same columns",
				}),
				"Comma",
			).rows,
		).toEqual([
			["1", "2"],
			["4", "3"],
		]));
	it("rejects mismatched or empty schemas", () => {
		expect(() => run(combine, { schema: "Require same columns" })).toThrow(
			"same column",
		);
		expect(() =>
			run(combine, { second: "x\n1", schema: "Intersection" }),
		).toThrow("between 1");
	});
});
describe("Reproducible CSV Sampler", () => {
	const input = `id\n${Array.from({ length: 50 }, (_, i) => i).join("\n")}`;
	it("is deterministic and without replacement", () => {
		const a = run(sample, { input, count: "10" });
		expect(a).toBe(run(sample, { input, count: "10" }));
		const rows = parseCsv(a, "Comma").rows;
		expect(rows).toHaveLength(10);
		expect(new Set(rows.flat()).size).toBe(10);
	});
	it("produces an exact complementary partition", () => {
		const a = parseCsv(
			run(sample, { input, count: "10" }),
			"Comma",
		).rows.flat();
		const b = parseCsv(
			run(sample, { input, count: "10", partition: "Remaining rows" }),
			"Comma",
		).rows.flat();
		expect(b).toHaveLength(40);
		expect(new Set([...a, ...b]).size).toBe(50);
		expect(a.some((x) => b.includes(x))).toBe(false);
	});
	it("changes samples with the seed", () =>
		expect(run(sample, { input, count: "10", seed: "other" })).not.toBe(
			run(sample, { input, count: "10" }),
		));
	it("handles empty samples and rejects excessive counts", () => {
		expect(parseCsv(run(sample, { count: "0" }), "Comma").rows).toEqual([]);
		expect(() => run(sample, { count: "6" })).toThrow("between");
	});
});
describe("Text Indentation Converter", () => {
	it("expands mixed prefixes at tab stops", () =>
		expect(
			run(indent, { input: " \tx\t y", operation: "Tabs to spaces" }),
		).toBe("    x\t y"));
	it("removes visual common indentation", () =>
		expect(run(indent, { input: "\tfoo\n      bar\n" })).toBe("foo\n  bar\n"));
	it("compresses full stops only", () =>
		expect(run(indent, { input: "      x", operation: "Spaces to tabs" })).toBe(
			"\t  x",
		));
	it("adds a level without modifying blank lines", () =>
		expect(
			run(indent, {
				input: " x\r\n\r\ny",
				operation: "Add indent",
				width: "2",
			}),
		).toBe("   x\n\n  y"));
});
describe("Text Line Numbering", () => {
	it("bounds repeated separator expansion", () =>
		expect(() =>
			run(numbering, { input: "a\n".repeat(2000), separator: "x".repeat(600) }),
		).toThrow("1 MB"));
	it("skips blanks and preserves trailing newline", () =>
		expect(
			run(numbering, {
				input: "a\n\nb\n",
				start: "8",
				step: "2",
				padding: "Zeros",
			}),
		).toBe("08. a\n\n10. b\n"));
	it("numbers blank lines when requested", () =>
		expect(run(numbering, { input: "a\n\nb", blank: "Number" })).toBe(
			"1. a\n2. \n3. b",
		));
	it("removes only exact separators", () =>
		expect(
			run(numbering, {
				input: "  01. abc\n2) def\n3. ghi",
				operation: "Remove numbers",
			}),
		).toBe("abc\n2) def\nghi"));
	it("round trips padded numbering", () => {
		const input = "one\ntwo\n";
		const numbered = run(numbering, { input, start: "99", padding: "Spaces" });
		expect(
			run(numbering, { input: numbered, operation: "Remove numbers" }),
		).toBe(input);
	});
});
describe("Repeated Phrase Analyzer", () => {
	it("counts repeated Unicode phrases", () =>
		expect(
			result(ngram, { input: "Café noir. café noir!", minimum: "1" }).results,
		).toEqual([{ phrase: "café noir", count: 2, sharePercent: 100 }]));
	it("does not cross punctuation by default", () => {
		expect(result(ngram, { input: "a. b", minimum: "1" }).windows).toBe(0);
		expect(
			result(ngram, {
				input: "a. b",
				minimum: "1",
				boundary: "Continuous words",
			}).windows,
		).toBe(1);
	});
	it("supports case sensitivity and result limits", () =>
		expect(
			result(ngram, {
				input: "A b a b",
				minimum: "1",
				case: "Case sensitive",
				limit: "1",
			}).results,
		).toHaveLength(1));
	it("bounds words and n-gram size", () => {
		expect(() => run(ngram, { size: "1" })).toThrow();
		expect(() => run(ngram, { input: "a ".repeat(20001) })).toThrow("20,000");
	});
});
describe("Literal Text Split / Join", () => {
	it("treats regex characters literally", () =>
		expect(result(split, { input: "a.*b.*c", separator: ".*" })).toEqual([
			"a",
			"b",
			"c",
		]));
	it("cleans items in the documented order", () =>
		expect(
			result(split, {
				input: "a | a | | b",
				empty: "Remove",
				duplicates: "Remove",
			}),
		).toEqual(["a", "b"]));
	it("joins only strings and supports tabs", () => {
		expect(
			run(split, {
				input: '["a","b"]',
				operation: "Join JSON array",
				separatorType: "Tab",
			}),
		).toBe("a\tb");
		expect(() =>
			run(split, { input: "[1]", operation: "Join JSON array" }),
		).toThrow("string items");
	});
	it("normalizes CRLF in newline mode", () =>
		expect(
			result(split, { input: "a\r\nb\r\n", separatorType: "Newline" }),
		).toEqual(["a", "b", ""]));
});
describe("URL List Inspector", () => {
	it("groups duplicate fragments and reports invalid lines", () => {
		const value = result(urls);
		expect(value.validCount).toBe(3);
		expect(value.invalidCount).toBe(1);
		expect(value.duplicateGroups[0].lines).toEqual([1, 2]);
	});
	it("can retain fragments", () =>
		expect(
			result(urls, { fragment: "Include fragments" }).duplicateGroups,
		).toEqual([]));
	it("resolves relative paths only with an explicit base", () =>
		expect(
			result(urls, { input: "../docs", base: "https://example.com/a/b/" })
				.valid[0].url,
		).toBe("https://example.com/a/docs"));
	it("rejects credentials and non-http URLs without echoing secrets", () => {
		const output = run(urls, {
			input: "https://user:secret@example.com\njavascript:alert(1)",
		});
		expect(output).not.toContain("secret");
		expect(JSON.parse(output).invalidCount).toBe(2);
	});
	it("rejects an invalid base", () =>
		expect(() => run(urls, { base: "relative" })).toThrow("Base"));
});
describe("Linear Regression Calculator", () => {
	it("keeps tiny-scale regression statistics finite", () => {
		const value = result(regression, {
			input: "[[1e-200,3e-200],[2e-200,5e-200],[3e-200,7e-200]]",
			predict: "",
		});
		expect(value.slope).toBeCloseTo(2);
		expect(value.rSquared).toBeCloseTo(1);
		expect(value.correlation).toBeCloseTo(1);
	});
	it("rejects unrepresentable slopes", () =>
		expect(() =>
			run(regression, { input: "[[0,0],[1e-320,1]]", predict: "" }),
		).toThrow("Rescale"));
	it("fits an exact line", () => {
		const value = result(regression);
		expect(value.slope).toBe(2);
		expect(value.intercept).toBeCloseTo(1);
		expect(value.rSquared).toBe(1);
		expect(value.prediction.y).toBe(13);
	});
	it("computes residual error and negative correlation", () => {
		const value = result(regression, { input: "[[1,4],[2,2],[3,1]]" });
		expect(value.slope).toBeCloseTo(-1.5);
		expect(value.rmse).toBeGreaterThan(0);
		expect(value.correlation).toBeLessThan(0);
	});
	it("handles constant y and rejects constant x", () => {
		expect(
			result(regression, { input: "[[1,5],[2,5]]" }).correlation,
		).toBeNull();
		expect(() => run(regression, { input: "[[1,2],[1,3]]" })).toThrow(
			"must vary",
		);
	});
	it("rejects nonnumeric pairs", () =>
		expect(() => run(regression, { input: '[[1,"2"],[2,3]]' })).toThrow(
			"numeric",
		));
});
describe("Matrix Calculator", () => {
	it("multiplies rectangular matrices", () =>
		expect(
			result(matrix, { input: "[[1,2,3],[4,5,6]]", other: "[[1],[2],[3]]" }),
		).toEqual([[14], [32]]));
	it("adds and subtracts elementwise", () => {
		expect(result(matrix, { operation: "Add" })).toEqual([
			[6, 8],
			[10, 12],
		]);
		expect(result(matrix, { operation: "Subtract" })).toEqual([
			[-4, -4],
			[-4, -4],
		]);
	});
	it("transposes without requiring B", () =>
		expect(
			result(matrix, {
				input: "[[1,2,3]]",
				other: "",
				operation: "Transpose A",
			}),
		).toEqual([[1], [2], [3]]));
	it("rejects ragged and incompatible shapes", () => {
		expect(() => run(matrix, { input: "[[1],[2,3]]" })).toThrow("rectangular");
		expect(() => run(matrix, { other: "[[1]]" })).toThrow("column count");
	});
});
describe("Moving Average Calculator", () => {
	it("computes trailing windows with null warmup", () =>
		expect(
			result(average, { input: "1,2,3,4" }).points.map(
				(p: { smoothed: number | null }) => p.smoothed,
			),
		).toEqual([null, null, 2, 3]));
	it("handles partial centered windows", () =>
		expect(
			result(average, {
				input: "1,2,3",
				method: "Centered simple",
				edges: "Use available values",
			}).points.map((p: { smoothed: number }) => p.smoothed),
		).toEqual([1.5, 2, 2.5]));
	it("uses the documented EMA seed and alpha", () =>
		expect(
			result(average, { input: "10,20,30", method: "Exponential" }).points.map(
				(p: { smoothed: number }) => p.smoothed,
			),
		).toEqual([10, 15, 22.5]));
	it("rejects even centered windows and invalid samples", () => {
		expect(() =>
			run(average, { method: "Centered simple", window: "2" }),
		).toThrow("odd");
		expect(() => run(average, { input: "1,no,3" })).toThrow("number");
	});
});
describe("Exact Radix Arithmetic", () => {
	it("preserves integers larger than Number's range", () =>
		expect(
			result(radix, { input: "9007199254740993", other: "1", base: "10" })
				.decimal,
		).toBe("9007199254740994"));
	it("divides signed integers toward zero", () => {
		const value = result(radix, {
			input: "-7",
			other: "3",
			base: "10",
			operation: "Divide",
		});
		expect(value.decimal).toBe("-2");
		expect(value.remainderDecimal).toBe("-1");
	});
	it("supports prefixes and comparison", () =>
		expect(
			result(radix, { input: "0xff", other: "ff", operation: "Compare" })
				.comparison,
		).toBe(0));
	it("rejects invalid digits and zero division", () => {
		expect(() => run(radix, { input: "2", base: "2" })).toThrow("digit");
		expect(() => run(radix, { other: "0", operation: "Divide" })).toThrow(
			"zero",
		);
	});
});
describe("Batch Unit Converter", () => {
	it("uses exact international length definitions", () =>
		expect(
			result(units, { input: "1", from: "Inches (in)", to: "Centimeters (cm)" })
				.results[0].output,
		).toBeCloseTo(2.54));
	it("converts affine absolute temperatures", () => {
		expect(
			result(units, {
				input: "32,212",
				from: "Fahrenheit (°F)",
				to: "Celsius (°C)",
			}).results.map((x: { output: number }) => Math.round(x.output)),
		).toEqual([0, 100]);
		expect(
			result(units, {
				input: "-273.15",
				from: "Celsius (°C)",
				to: "Kelvin (K)",
			}).results[0].output,
		).toBe(0);
	});
	it("rejects cross-family conversions and impossible temperatures", () => {
		expect(() => run(units, { to: "Seconds (s)" })).toThrow("same measurement");
		expect(() =>
			run(units, { input: "-1", from: "Kelvin (K)", to: "Celsius (°C)" }),
		).toThrow("absolute zero");
	});
	it("converts batch mass and speed values", () => {
		expect(
			result(units, { input: "1", from: "Pounds (lb)", to: "Kilograms (kg)" })
				.results[0].output,
		).toBe(0.45359237);
		expect(
			result(units, {
				input: "36",
				from: "Kilometers per hour (km/h)",
				to: "Meters per second (m/s)",
			}).results[0].output,
		).toBe(10);
	});
});
describe("CSS Shadow Builder", () => {
	it("renders inset and shorthand hex", () =>
		expect(
			run(shadow, {
				input:
					'[{"x":-1,"y":2,"blur":0,"spread":-3,"color":"#abc","opacity":0.5,"inset":true}]',
			}),
		).toContain("inset -1px 2px 0px -3px rgba(170, 187, 204, 0.5)"));
	it("rejects negative blur and invalid colors", () => {
		const layer = {
			x: 0,
			y: 0,
			blur: -1,
			spread: 0,
			color: "#fff",
			opacity: 1,
		};
		expect(() => run(shadow, { input: JSON.stringify([layer]) })).toThrow(
			"Layer 1",
		);
		expect(() =>
			run(shadow, {
				input: JSON.stringify([{ ...layer, blur: 0, color: "red;" }]),
			}),
		).toThrow("Layer 1");
	});
	it("rejects selector injection and empty layers", () => {
		expect(() => run(shadow, { selector: "x}body{" })).toThrow("class");
		expect(() => run(shadow, { input: "[]" })).toThrow("at least");
	});
});
describe("CSS Gradient Builder", () => {
	it("normalizes angles and supports conic repetition", () =>
		expect(
			run(gradient, { kind: "Conic", repeat: "Yes", angle: "-90" }),
		).toContain("repeating-conic-gradient(from 270deg at center"));
	it("supports alpha hex colors and radial gradients", () =>
		expect(
			run(gradient, {
				input:
					'[{"color":"#fff0","position":0},{"color":"#112233ff","position":100}]',
				kind: "Radial circle",
			}),
		).toContain("radial-gradient(circle at center, #fff0 0%, #112233ff 100%)"));
	it("rejects descending stops and zero repeating intervals", () => {
		expect(() =>
			run(gradient, {
				input:
					'[{"color":"#fff","position":100},{"color":"#000","position":0}]',
			}),
		).toThrow("ascending");
		expect(() =>
			run(gradient, {
				input:
					'[{"color":"#fff","position":50},{"color":"#000","position":50}]',
				repeat: "Yes",
			}),
		).toThrow("nonzero");
	});
	it("allows sharp transitions and rejects CSS injection", () => {
		expect(
			run(gradient, {
				input:
					'[{"color":"#fff","position":50},{"color":"#000","position":50}]',
			}),
		).toContain("#fff 50%, #000 50%");
		expect(() => run(gradient, { selector: "x;" })).toThrow("class");
	});
});
