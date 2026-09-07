import { json, type LocalTool, object } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "template",
			label: "Text template",
			value:
				"Hello {{user.name}},\nYour order {{order.id}} contains {{order.items}} items.",
		},
		{
			key: "data",
			label: "Template data (JSON)",
			value: '{"user":{"name":"Alex"},"order":{"id":"DEMO-42","items":3}}',
		},
		{
			key: "escape",
			label: "Value escaping",
			type: "select",
			value: "Plain text",
			options: ["Plain text", "HTML text", "JSON string content"],
		},
		{
			key: "missing",
			label: "Missing variables",
			type: "select",
			value: "Error",
			options: ["Error", "Keep placeholder", "Empty string"],
		},
	],
	filename: "rendered-template.txt",
	smoke: "DEMO-42",
	help: "Interpolate {{dotted.paths}} and numeric array indexes without evaluating code, loops or functions. Prototype-related paths are blocked. Escaping applies only to inserted values, not the template itself; HTML text escaping is not sufficient for JavaScript, CSS or URL contexts. Output is capped at 2 MB during rendering.",
	run: (v) => {
		const data = json(v.data);
		if (!object(data) && !Array.isArray(data))
			throw new Error("Template data must be a JSON object or array.");
		let length = v.template.length;
		return v.template.replace(
			/\{\{([^{}]+)\}\}/g,
			(placeholder: string, raw: string) => {
				const path = raw.trim();
				if (!/^[\w$-]+(?:\.[\w$-]+)*$/.test(path))
					throw new Error(
						"Only dotted property paths are supported; expressions are never evaluated.",
					);
				let value: unknown = data,
					missing = false;
				for (const key of path.split(".")) {
					if (["__proto__", "constructor", "prototype"].includes(key))
						throw new Error("Prototype-related paths are not allowed.");
					if (
						(!object(value) && !Array.isArray(value)) ||
						!Object.hasOwn(value, key)
					) {
						missing = true;
						break;
					}
					value = (value as Record<string, unknown>)[key];
				}
				let text: string;
				if (missing) {
					if (v.missing === "Error")
						throw new Error(`Missing variable: ${path}`);
					text = v.missing === "Keep placeholder" ? placeholder : "";
				} else {
					text = typeof value === "string" ? value : JSON.stringify(value);
					if (v.escape === "HTML text")
						text = text.replace(
							/[&<>"']/g,
							(c) =>
								({
									"&": "&amp;",
									"<": "&lt;",
									">": "&gt;",
									'"': "&quot;",
									"'": "&#39;",
								})[c] ?? c,
						);
					else if (v.escape === "JSON string content")
						text = JSON.stringify(text).slice(1, -1);
				}
				length += text.length - placeholder.length;
				if (length > 2_000_000)
					throw new Error("Rendered output exceeds 2 MB.");
				return text;
			},
		);
	},
};
