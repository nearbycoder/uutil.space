import { describe, expect, it } from "vitest";
import { tool } from "./aspect-ratio-resize";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("aspect resize", () => {
	it("fits with centered padding and reduced ratios", () => {
		const x = run();
		expect(x.source.aspectRatio).toBe("16:9");
		expect(x.rendered).toEqual({ width: 1200, height: 675 });
		expect(x.centeredPadding.top).toBe(62.5);
		expect(x.visibleSourceRect).toEqual({
			x: 0,
			y: 0,
			width: 1920,
			height: 1080,
		});
	});
	it("fills with correctly mapped source crop coordinates", () => {
		const x = run({ mode: "Fill" });
		expect(x.rendered.height).toBe(800);
		expect(x.visibleSourceRect.x).toBe(150);
		expect(x.visibleSourceRect.width).toBe(1620);
		expect(x.suggestedRaster.width).toBe(1423);
	});
	it("caps scaling and reports coverage limitations", () => {
		const x = run({
			sourceWidth: "100",
			sourceHeight: "50",
			mode: "Fill",
			upscale: "No",
		});
		expect(x.rendered).toEqual({ width: 100, height: 50 });
		expect(x.warnings.join()).toContain("coverage");
	});
	it("reports stretch distortion and square ratios", () => {
		expect(run({ mode: "Stretch" }).rendered).toEqual({
			width: 1200,
			height: 800,
		});
		expect(run({ mode: "Stretch" }).warnings).toHaveLength(1);
		expect(
			run({ sourceWidth: "20", sourceHeight: "20" }).source.aspectRatio,
		).toBe("1:1");
	});
	it("handles extreme ratios and rejects zero or fractional dimensions", () => {
		expect(
			run({
				sourceWidth: "100000",
				sourceHeight: "1",
				targetWidth: "1",
				targetHeight: "1",
			}).suggestedRaster,
		).toEqual({ width: 1, height: 1, pixels: 1 });
		expect(() => run({ sourceWidth: "0" })).toThrow();
		expect(() => run({ targetHeight: "1.5" })).toThrow();
	});
});
