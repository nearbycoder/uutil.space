import { numbers } from "../toolkit-utils";
import { integer, type LocalTool, print } from "./types";

const units: Record<
	string,
	{ family: string; factor: number; offset?: number }
> = {
	"Millimeters (mm)": { family: "Length", factor: 0.001 },
	"Centimeters (cm)": { family: "Length", factor: 0.01 },
	"Meters (m)": { family: "Length", factor: 1 },
	"Kilometers (km)": { family: "Length", factor: 1000 },
	"Inches (in)": { family: "Length", factor: 0.0254 },
	"Feet (ft)": { family: "Length", factor: 0.3048 },
	"Yards (yd)": { family: "Length", factor: 0.9144 },
	"Miles (mi)": { family: "Length", factor: 1609.344 },
	"Milligrams (mg)": { family: "Mass", factor: 0.000001 },
	"Grams (g)": { family: "Mass", factor: 0.001 },
	"Kilograms (kg)": { family: "Mass", factor: 1 },
	"Ounces (oz)": { family: "Mass", factor: 0.028349523125 },
	"Pounds (lb)": { family: "Mass", factor: 0.45359237 },
	"Milliseconds (ms)": { family: "Time", factor: 0.001 },
	"Seconds (s)": { family: "Time", factor: 1 },
	"Minutes (min)": { family: "Time", factor: 60 },
	"Hours (h)": { family: "Time", factor: 3600 },
	"Days (24 h)": { family: "Time", factor: 86400 },
	"Meters per second (m/s)": { family: "Speed", factor: 1 },
	"Kilometers per hour (km/h)": { family: "Speed", factor: 1 / 3.6 },
	"Miles per hour (mph)": { family: "Speed", factor: 0.44704 },
	"Knots (kn)": { family: "Speed", factor: 1852 / 3600 },
	"Celsius (°C)": { family: "Temperature", factor: 1, offset: 273.15 },
	"Fahrenheit (°F)": { family: "Temperature", factor: 5 / 9, offset: 459.67 },
	"Kelvin (K)": { family: "Temperature", factor: 1, offset: 0 },
};
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Values (comma, space or newline separated)",
			value: "1, 5, 10",
		},
		{
			key: "from",
			label: "From unit",
			type: "select",
			value: "Meters (m)",
			options: Object.keys(units),
		},
		{
			key: "to",
			label: "To unit",
			type: "select",
			value: "Feet (ft)",
			options: Object.keys(units),
		},
		{
			key: "places",
			label: "Display decimal places",
			type: "text",
			value: "6",
		},
	],
	help: "Batch-convert 25 units across length, mass, elapsed time, speed and absolute temperature. Select two units in the same family. Inches/feet/miles use international definitions; ounces/pounds use avoirdupois mass; days are exactly 24 hours. Temperature offsets apply to absolute readings, not differences; below-absolute-zero values are rejected. Up to 5,000 values; full floating-point results plus 0–12-place display strings. Display switches to scientific notation for magnitudes ≥ 1e21.",
	filename: "unit-conversions.json",
	smoke: '"family": "Length"',
	run: (v) => {
		const from = units[v.from],
			to = units[v.to],
			places = integer(v.places, 0, 12);
		if (from.family !== to.family)
			throw new Error("Choose units from the same measurement family.");
		const results = numbers(v.input).map((input) => {
			let base = (input + (from.offset ?? 0)) * from.factor;
			if (from.family === "Temperature") {
				if (base < -1e-10)
					throw new Error("Temperature cannot be below absolute zero.");
				base = Math.max(0, base);
			}
			const output = base / to.factor - (to.offset ?? 0);
			return { input, output, formatted: output.toFixed(places) };
		});
		return print({ family: from.family, from: v.from, to: v.to, results });
	},
};
