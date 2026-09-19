import { integer, type LocalTool } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Text or JSON string literal",
			value: 'Hello "developer"\nA second line',
		},
		{
			key: "operation",
			label: "Operation",
			type: "select",
			value: "Encode",
			options: ["Encode", "Decode"],
		},
		{
			key: "layers",
			label: "Encoding / decoding layers",
			type: "text",
			value: "1",
		},
		{
			key: "ascii",
			label: "Encoded characters",
			type: "select",
			value: "Keep Unicode",
			options: ["Keep Unicode", "ASCII escapes"],
		},
	],
	help: "Create a quoted JSON string literal or unwrap one, including multiply-encoded API payloads. Decode accepts strings only, never objects, numbers or JavaScript expressions. ASCII mode escapes non-ASCII UTF-16 code units, preserving emoji as surrogate pairs. Supports 1–8 layers with a 1 MB intermediate limit. Empty decoded strings are valid.",
	filename: "json-string.txt",
	smoke: '\\"developer\\"',
	run: (v) => {
		let result = v.input;
		for (let i = 0; i < integer(v.layers, 1, 8); i++) {
			if (v.operation === "Encode") {
				result = JSON.stringify(result);
				if (v.ascii === "ASCII escapes")
					result = result.replace(
						/[\u007f-\uffff]/g,
						(c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
					);
			} else {
				let parsed: unknown;
				try {
					parsed = JSON.parse(result);
				} catch {
					throw new Error(`Layer ${i + 1} is not a valid quoted JSON string.`);
				}
				if (typeof parsed !== "string")
					throw new Error(`Layer ${i + 1} must decode to a string.`);
				result = parsed;
			}
			if (result.length > 1000000)
				throw new Error("Intermediate output exceeds 1 MB. Use fewer layers.");
		}
		return result;
	},
};
