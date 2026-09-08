import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "minFont",
			label: "Minimum font size (px)",
			type: "text",
			value: "16",
		},
		{
			key: "maxFont",
			label: "Maximum font size (px)",
			type: "text",
			value: "24",
		},
		{
			key: "minViewport",
			label: "Minimum viewport width (px)",
			type: "text",
			value: "360",
		},
		{
			key: "maxViewport",
			label: "Maximum viewport width (px)",
			type: "text",
			value: "1280",
		},
		{
			key: "root",
			label: "Assumed root font size (px)",
			type: "text",
			value: "16",
		},
		{
			key: "unit",
			label: "Fixed terms unit",
			type: "select",
			value: "rem",
			options: ["rem", "px"],
		},
	],
	filename: "fluid-type.json",
	smoke: "font-size: clamp(",
	help: "Linearly interpolates between two font sizes and clamps outside the viewport range. rem output keeps fixed terms relative to the user's root font size; it does not set or override that root. Samples assume your supplied root size. Viewport units respond to viewport width, not a component's container. Test zoom, enlarged text and real content; a clamp formula alone does not guarantee accessible typography. CSS coefficients are rounded to eight decimals.",
	run: (v) => {
		const number = (s: string, min: number, max: number) => {
			const n = Number(s);
			if (!s.trim() || !Number.isFinite(n) || n < min || n > max)
				throw new Error("Font sizes must be 1–1,000px and root size 1–100px.");
			return n;
		};
		const minFont = number(v.minFont, 1, 1000),
			maxFont = number(v.maxFont, 1, 1000),
			root = number(v.root, 1, 100),
			minViewport = integer(v.minViewport, 1, 100000),
			maxViewport = integer(v.maxViewport, 1, 100000);
		if (maxFont < minFont)
			throw new Error("Maximum font size must be at least the minimum.");
		if (maxViewport <= minViewport)
			throw new Error("Maximum viewport must exceed the minimum.");
		const slope = (maxFont - minFont) / (maxViewport - minViewport),
			intercept = minFont - slope * minViewport,
			divisor = v.unit === "rem" ? root : 1,
			round = (n: number) => Number(n.toFixed(8));
		const preferred = `${String(round(intercept / divisor)) + v.unit} + ${round(slope * 100)}vw`;
		const css = `font-size: clamp(${round(minFont / divisor)}${v.unit}, calc(${preferred}), ${round(maxFont / divisor)}${v.unit});`;
		const widths = [
			...new Set([
				Math.max(1, Math.floor(minViewport / 2)),
				minViewport,
				390,
				768,
				Math.round((minViewport + maxViewport) / 2),
				maxViewport,
				Math.round(maxViewport * 1.25),
			]),
		].sort((a, b) => a - b);
		return print({
			css,
			assumedRootPx: root,
			formula: {
				slopePxPerViewportPx: round(slope),
				interceptPx: round(intercept),
			},
			samples: widths.map((viewportPx) => {
				const fontPx = Math.max(
					minFont,
					Math.min(maxFont, intercept + slope * viewportPx),
				);
				return {
					viewportPx,
					fontPx: round(fontPx),
					fontRem: round(fontPx / root),
				};
			}),
		});
	},
};
