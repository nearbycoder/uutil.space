import { array } from "../toolkit-utils";
import { type LocalTool, object } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Shadow layers (JSON)",
			value:
				'[{"x":0,"y":2,"blur":4,"spread":0,"color":"#000000","opacity":0.12,"inset":false},{"x":0,"y":12,"blur":32,"spread":-8,"color":"#000000","opacity":0.24,"inset":false}]',
		},
		{ key: "selector", label: "CSS class name", type: "text", value: "card" },
	],
	help: "Generate a multi-layer box-shadow rule. Each layer requires x, y, blur, spread (pixels), a 3- or 6-digit hex color and opacity from 0 to 1; inset is an optional boolean. Blur is nonnegative; signed offsets/spread are supported. Values are limited to ±1,000 px and 10 layers. Earlier layers paint above later ones. The class name accepts ASCII letters, digits, hyphens and underscores, starting with a letter or underscore.",
	filename: "shadows.css",
	smoke: "box-shadow:",
	preserveColumns: true,
	run: (v) => {
		if (!/^[A-Za-z_][\w-]{0,79}$/.test(v.selector))
			throw new Error("Enter a valid simple CSS class name (without the dot).");
		const layers = array(v.input, 10);
		if (!layers.length) throw new Error("Add at least one shadow layer.");
		const shadows = layers.map((layer, i) => {
			if (
				!object(layer) ||
				["x", "y", "blur", "spread"].some(
					(key) =>
						typeof layer[key] !== "number" ||
						!Number.isFinite(layer[key]) ||
						Math.abs(layer[key] as number) > 1000,
				) ||
				(layer.blur as number) < 0 ||
				typeof layer.opacity !== "number" ||
				layer.opacity < 0 ||
				layer.opacity > 1 ||
				typeof layer.color !== "string" ||
				!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(layer.color) ||
				(layer.inset !== undefined && typeof layer.inset !== "boolean")
			)
				throw new Error(
					`Layer ${i + 1} has invalid offsets, blur, color, opacity or inset.`,
				);
			const hex =
				layer.color.length === 4
					? [...layer.color.slice(1)].map((c) => c + c).join("")
					: layer.color.slice(1);
			const rgb = [0, 2, 4].map((offset) =>
				Number.parseInt(hex.slice(offset, offset + 2), 16),
			);
			return `${layer.inset ? "inset " : ""}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px rgba(${rgb.join(", ")}, ${layer.opacity})`;
		});
		return `.${v.selector} {\n  box-shadow:\n    ${shadows.join(",\n    ")};\n}`;
	},
};
