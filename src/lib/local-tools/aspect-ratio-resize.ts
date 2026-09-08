import { integer, type LocalTool, print } from "./types";

const gcd = (a: number, b: number): number => {
	while (b) {
		const remainder = a % b;
		a = b;
		b = remainder;
	}
	return a;
};
export const tool: LocalTool = {
	fields: [
		{
			key: "sourceWidth",
			label: "Source width (px)",
			type: "text",
			value: "1920",
		},
		{
			key: "sourceHeight",
			label: "Source height (px)",
			type: "text",
			value: "1080",
		},
		{
			key: "targetWidth",
			label: "Target box width (px)",
			type: "text",
			value: "1200",
		},
		{
			key: "targetHeight",
			label: "Target box height (px)",
			type: "text",
			value: "800",
		},
		{
			key: "mode",
			label: "Resize mode",
			type: "select",
			value: "Fit",
			options: ["Fit", "Fill", "Stretch"],
		},
		{
			key: "upscale",
			label: "Allow upscaling",
			type: "select",
			value: "Yes",
			options: ["Yes", "No"],
		},
	],
	filename: "resize-plan.json",
	smoke: '"aspectRatio": "16:9"',
	help: "Calculates dimensions only; no image is uploaded or modified. Fit preserves the whole source; Fill covers the box with centered cropping; Stretch can distort the ratio. No-upscale caps each scale at 1, which can leave gaps even in Fill mode. Fractional rendered sizes drive crop/padding geometry. Raster suggestions round down for Fit and up for Fill, with a 1px minimum; independent rounding can slightly alter the ratio. Dimensions: 1–100,000 whole pixels.",
	run: (v) => {
		const sw = integer(v.sourceWidth, 1, 100000),
			sh = integer(v.sourceHeight, 1, 100000),
			tw = integer(v.targetWidth, 1, 100000),
			th = integer(v.targetHeight, 1, 100000);
		let sx = tw / sw,
			sy = th / sh;
		if (v.mode !== "Stretch")
			sx = sy = v.mode === "Fit" ? Math.min(sx, sy) : Math.max(sx, sy);
		if (v.upscale === "No") {
			sx = Math.min(1, sx);
			sy = Math.min(1, sy);
		}
		const width = sw * sx,
			height = sh * sy,
			cropX = Math.max(0, (width - tw) / 2),
			cropY = Math.max(0, (height - th) / 2),
			padX = Math.max(0, (tw - width) / 2),
			padY = Math.max(0, (th - height) / 2),
			round = (n: number) => Number(n.toFixed(6)),
			rasterRound =
				v.mode === "Fill"
					? Math.ceil
					: v.mode === "Fit"
						? Math.floor
						: Math.round;
		const divisor = gcd(sw, sh),
			warnings: string[] = [];
		if (v.mode === "Stretch" && Math.abs(sx - sy) > 1e-12)
			warnings.push("Stretch changes the source aspect ratio.");
		if (v.mode === "Fill" && (width < tw - 1e-8 || height < th - 1e-8))
			warnings.push("No-upscale prevents full target coverage.");
		const rasterWidth = Math.max(
				1,
				rasterRound(
					width + (v.mode === "Fit" ? 1e-9 : v.mode === "Fill" ? -1e-9 : 0),
				),
			),
			rasterHeight = Math.max(
				1,
				rasterRound(
					height + (v.mode === "Fit" ? 1e-9 : v.mode === "Fill" ? -1e-9 : 0),
				),
			);
		return print({
			source: {
				width: sw,
				height: sh,
				aspectRatio: `${sw / divisor}:${sh / divisor}`,
				pixels: sw * sh,
			},
			target: { width: tw, height: th },
			mode: v.mode,
			scale: { x: round(sx), y: round(sy) },
			rendered: { width: round(width), height: round(height) },
			suggestedRaster: {
				width: rasterWidth,
				height: rasterHeight,
				pixels: rasterWidth * rasterHeight,
			},
			centeredCropInRenderedPixels: {
				left: round(cropX),
				right: round(cropX),
				top: round(cropY),
				bottom: round(cropY),
			},
			centeredPadding: {
				left: round(padX),
				right: round(padX),
				top: round(padY),
				bottom: round(padY),
			},
			visibleSourceRect: {
				x: round(cropX / sx),
				y: round(cropY / sy),
				width: round(Math.min(sw, tw / sx)),
				height: round(Math.min(sh, th / sy)),
			},
			warnings,
		});
	},
};
