import { array, finite } from "../toolkit-utils";
import { type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON [x, y] pairs",
			value: "[[1, 3], [2, 5], [3, 7], [4, 9], [5, 11]]",
		},
		{
			key: "predict",
			label: "Predict at x (optional)",
			type: "text",
			value: "6",
			optional: true,
		},
	],
	help: "Fit an ordinary least-squares line y = slope × x + intercept with centered sums. Returns fitted values, residuals, RMSE, R², Pearson correlation and an optional prediction. Requires 2–5,000 finite pairs (absolute value ≤ 1e12) and varying x values. Constant y has R² = 1 and undefined correlation (null). Floating-point results describe this sample only, not causation or a forecast guarantee.",
	filename: "regression.json",
	smoke: '"slope": 2',
	run: (v) => {
		const pairs = array(v.input);
		if (
			pairs.length < 2 ||
			pairs.some(
				(p) =>
					!Array.isArray(p) ||
					p.length !== 2 ||
					p.some(
						(n) =>
							typeof n !== "number" ||
							!Number.isFinite(n) ||
							Math.abs(n) > 1e12,
					),
			)
		)
			throw new Error(
				"Enter 2–5,000 numeric [x, y] pairs with magnitude at most 1e12.",
			);
		const data = pairs as [number, number][],
			count = data.length;
		const meanX =
				data[0][0] +
				data.reduce((sum, p) => sum + (p[0] - data[0][0]) / count, 0),
			meanY =
				data[0][1] +
				data.reduce((sum, p) => sum + (p[1] - data[0][1]) / count, 0);
		const scaleX = Math.max(...data.map(([x]) => Math.abs(x - meanX))),
			scaleY = Math.max(...data.map(([, y]) => Math.abs(y - meanY)));
		if (scaleX === 0) throw new Error("X values must vary to fit a line.");
		let xx = 0,
			yy = 0,
			xy = 0;
		for (const [x, y] of data) {
			const dx = (x - meanX) / scaleX,
				dy = scaleY === 0 ? 0 : (y - meanY) / scaleY;
			xx += dx ** 2;
			yy += dy ** 2;
			xy += dx * dy;
		}
		const slope = (xy / xx) * (scaleY / scaleX),
			intercept = meanY - slope * meanX;
		const points = data.map(([x, y]) => {
			const fitted = meanY + slope * (x - meanX);
			return { x, y, fitted, residual: y - fitted };
		});
		const errorScale = Math.max(...points.map((p) => Math.abs(p.residual)));
		const squaredError =
			errorScale === 0
				? 0
				: points.reduce((sum, p) => sum + (p.residual / errorScale) ** 2, 0);
		const predictionX = v.predict.trim()
			? finite(v.predict, -1e12, 1e12)
			: null;
		const prediction =
			predictionX === null
				? null
				: { x: predictionX, y: meanY + slope * (predictionX - meanX) };
		if (
			![
				slope,
				intercept,
				squaredError,
				...points.map((p) => p.fitted),
				...(prediction ? [prediction.y] : []),
			].every(Number.isFinite)
		)
			throw new Error(
				"The fit exceeds floating-point range. Rescale the x and y values.",
			);
		return print({
			count,
			slope,
			intercept,
			rSquared:
				yy === 0
					? 1
					: Math.max(
							0,
							Math.min(1, 1 - (squaredError / yy) * (errorScale / scaleY) ** 2),
						),
			correlation:
				yy === 0 ? null : Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))),
			rmse: errorScale * Math.sqrt(squaredError / count),
			prediction,
			points,
		});
	},
};
