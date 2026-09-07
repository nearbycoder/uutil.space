import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "base", label: "Base spacing (pixels)", type: "text", value: "4" },
		{
			key: "scale",
			label: "Scale type",
			type: "select",
			value: "Linear",
			options: ["Linear", "Modular"],
		},
		{
			key: "ratio",
			label: "Modular ratio",
			type: "text",
			value: "1.5",
			help: "Used only for modular scales.",
		},
		{ key: "steps", label: "Non-zero steps", type: "text", value: "8" },
		{
			key: "unit",
			label: "Output units",
			type: "select",
			value: "rem",
			options: ["rem", "px"],
		},
		{
			key: "root",
			label: "Root font size (pixels)",
			type: "text",
			value: "16",
		},
		{
			key: "prefix",
			label: "CSS variable prefix",
			type: "text",
			value: "space",
		},
		{
			key: "format",
			label: "Output format",
			type: "select",
			value: "CSS",
			options: ["CSS", "JSON tokens"],
		},
	],
	filename: "spacing-scale.css",
	smoke: "--space-1: 0.25rem",
	help: "Generate a zero token plus a linear or modular spacing scale. Linear steps multiply the base; modular steps multiply by successive powers of the ratio. Values round to four decimals. rem conversion assumes the root font size you supply; no stylesheet is installed or changed.",
	run: (v) => {
		const base = Number(v.base),
			root = Number(v.root),
			ratio = Number(v.ratio),
			steps = integer(v.steps, 1, 32);
		if (!Number.isFinite(base) || base < 0.25 || base > 64)
			throw new Error("Base spacing must be between 0.25 and 64 pixels.");
		if (!Number.isFinite(root) || root < 8 || root > 64)
			throw new Error("Root font size must be between 8 and 64 pixels.");
		if (
			v.scale === "Modular" &&
			(!Number.isFinite(ratio) || ratio < 1.05 || ratio > 3)
		)
			throw new Error("Modular ratio must be between 1.05 and 3.");
		if (!/^[a-z][a-z0-9-]{0,39}$/i.test(v.prefix))
			throw new Error(
				"Use a prefix starting with a letter, followed by letters, digits or hyphens (up to 40 characters).",
			);
		const tokens = Array.from({ length: steps + 1 }, (_, i) => {
			const pixels =
				i === 0 ? 0 : v.scale === "Linear" ? base * i : base * ratio ** (i - 1);
			if (pixels > 10000)
				throw new Error("Scale exceeds 10,000 pixels. Reduce steps or ratio.");
			return {
				name: `--${v.prefix}-${i}`,
				value: `${+(pixels / (v.unit === "rem" ? root : 1)).toFixed(4)}${v.unit}`,
				pixels: +pixels.toFixed(4),
			};
		});
		return v.format === "JSON tokens"
			? print(tokens)
			: `:root {\n${tokens.map((token) => `  ${token.name}: ${token.value};`).join("\n")}\n}`;
	},
};
