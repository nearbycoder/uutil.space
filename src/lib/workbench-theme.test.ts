import { describe, expect, it } from "vitest";
import { WORKBENCH_DARK, WORKBENCH_LIGHT } from "./workbench-theme";

function luminance(hex: string) {
	const rgb = [1, 3, 5]
		.map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
		.map((value) =>
			value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
		);
	return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
	const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (values[0] + 0.05) / (values[1] + 0.05);
}

describe.each([WORKBENCH_DARK, WORKBENCH_LIGHT])(
	"$colorScheme workbench theme",
	(theme) => {
		it.each([
			"--app-bg",
			"--app-panel-bg",
			"--app-surface-alt",
			"--app-surface-bg",
		] as const)("keeps all text levels readable on %s", (surface) => {
			for (const text of [
				"--app-fg",
				"--app-fg-muted",
				"--app-fg-soft",
			] as const)
				expect(contrast(theme[text], theme[surface])).toBeGreaterThanOrEqual(
					4.5,
				);
		});
		it("keeps primary action text readable at rest and hover", () => {
			expect(
				contrast(theme["--app-accent"], theme["--app-accent-contrast"]),
			).toBeGreaterThanOrEqual(4.5);
			expect(
				contrast(theme["--app-accent-strong"], theme["--app-accent-contrast"]),
			).toBeGreaterThanOrEqual(4.5);
		});
		it("keeps status colors readable on panels", () => {
			for (const color of ["--app-danger", "--app-success"] as const)
				expect(
					contrast(theme[color], theme["--app-panel-bg"]),
				).toBeGreaterThanOrEqual(4.5);
		});
	},
);
it("provides matching tokens in both themes", () =>
	expect(Object.keys(WORKBENCH_LIGHT).sort()).toEqual(
		Object.keys(WORKBENCH_DARK).sort(),
	));
