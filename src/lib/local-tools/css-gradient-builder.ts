import { array, finite } from "../toolkit-utils";
import { type LocalTool, object } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Color stops (JSON)",
			value:
				'[{"color":"#f5c5a4","position":0},{"color":"#acbca0","position":50},{"color":"#293c38","position":100}]',
		},
		{
			key: "kind",
			label: "Gradient type",
			type: "select",
			value: "Linear",
			options: ["Linear", "Radial circle", "Conic"],
		},
		{
			key: "angle",
			label: "Angle in degrees (linear / conic)",
			type: "text",
			value: "135",
		},
		{
			key: "repeat",
			label: "Repetition",
			type: "select",
			value: "No",
			options: ["No", "Yes"],
		},
		{
			key: "selector",
			label: "CSS class name",
			type: "text",
			value: "gradient",
		},
	],
	help: "Generate linear, centered circular radial or centered conic gradients, with optional repetition and a solid-color fallback. Provide 2–20 hex color stops (3, 4, 6 or 8 digits) at ascending 0–100% positions; equal positions create sharp transitions. A repeating gradient needs a nonzero interval. Conic positions use percentages of a full turn. The angle is normalized modulo 360 and ignored for radial gradients. Output is CSS only; it does not assume text contrast is accessible.",
	filename: "gradient.css",
	smoke: "linear-gradient(135deg",
	preserveColumns: true,
	run: (v) => {
		if (!/^[A-Za-z_][\w-]{0,79}$/.test(v.selector))
			throw new Error("Enter a valid simple CSS class name (without the dot).");
		const stops = array(v.input, 20);
		if (stops.length < 2) throw new Error("Provide at least two color stops.");
		let previous = -1;
		const colors = stops.map((stop, i) => {
			if (
				!object(stop) ||
				typeof stop.color !== "string" ||
				!/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(stop.color) ||
				typeof stop.position !== "number" ||
				stop.position < 0 ||
				stop.position > 100 ||
				stop.position < previous
			)
				throw new Error(
					`Stop ${i + 1} needs a hex color and an ascending position from 0 to 100.`,
				);
			previous = stop.position;
			return { color: stop.color, position: stop.position };
		});
		if (
			v.repeat === "Yes" &&
			colors[0].position === colors[colors.length - 1].position
		)
			throw new Error("Repeating gradients need a nonzero stop interval.");
		const angle = ((finite(v.angle, -360000, 360000) % 360) + 360) % 360;
		const name =
			v.kind === "Linear"
				? "linear-gradient"
				: v.kind === "Conic"
					? "conic-gradient"
					: "radial-gradient";
		const direction =
			v.kind === "Linear"
				? `${angle}deg`
				: v.kind === "Conic"
					? `from ${angle}deg at center`
					: "circle at center";
		return `.${v.selector} {\n  background-color: ${colors[0].color};\n  background-image: ${v.repeat === "Yes" ? "repeating-" : ""}${name}(${direction}, ${colors.map((s) => `${s.color} ${s.position}%`).join(", ")});\n}`;
	},
};
