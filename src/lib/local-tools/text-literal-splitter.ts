import { array } from "../toolkit-utils";
import { type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Delimited text or JSON string array",
			value: "alpha | beta | | gamma",
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Split to JSON",
			options: ["Split to JSON", "Join JSON array"],
		},
		{
			key: "separatorType",
			label: "Separator type",
			type: "select",
			value: "Custom literal",
			options: ["Custom literal", "Newline", "Tab"],
		},
		{ key: "separator", label: "Literal separator", type: "text", value: "|" },
		{
			key: "trim",
			label: "Item whitespace",
			type: "select",
			value: "Trim",
			options: ["Trim", "Preserve"],
		},
		{
			key: "empty",
			label: "Empty items",
			type: "select",
			value: "Keep",
			options: ["Keep", "Remove"],
		},
		{
			key: "duplicates",
			label: "Duplicate items",
			type: "select",
			value: "Keep",
			options: ["Keep", "Remove"],
		},
	],
	help: "Split on an exact literal (not a regular expression), newline or tab; or join a JSON array containing strings only. Processing order is trim, empty-item filtering, then stable deduplication. Newline split normalizes CRLF. This is not a CSV parser: quoting and escaping have no special meaning. Joining is not reversible when an item contains the separator. Limited to 10,000 items and 1 MB output.",
	filename: "split-join.txt",
	smoke: '"gamma"',
	run: (v) => {
		const separator =
			v.separatorType === "Newline"
				? "\n"
				: v.separatorType === "Tab"
					? "\t"
					: v.separator;
		const values =
			v.operation === "Split to JSON"
				? (v.separatorType === "Newline"
						? v.input.replace(/\r\n/g, "\n")
						: v.input
					).split(separator)
				: array(v.input, 10000);
		if (
			values.length > 10000 ||
			values.some((item) => typeof item !== "string")
		)
			throw new Error("Use at most 10,000 string items.");
		let items = (values as string[]).map((item) =>
			v.trim === "Trim" ? item.trim() : item,
		);
		if (v.empty === "Remove") items = items.filter(Boolean);
		if (v.duplicates === "Remove") items = [...new Set(items)];
		if (
			items.reduce((n, item) => n + item.length + separator.length, 0) > 1000000
		)
			throw new Error("Output exceeds 1 MB; shorten the separator or data.");
		return v.operation === "Split to JSON"
			? print(items)
			: items.join(separator);
	},
};
