export const UNIX_IO_LAYOUT_COOKIE_KEY = "uutil.layout.unix-io";
export const UNIX_IO_PANEL_IDS = ["unix-input", "unix-output"] as const;
export type PanelLayout = Record<string, number>;
export const DEFAULT_UNIX_PANEL_LAYOUT: PanelLayout = {
	"unix-input": 54,
	"unix-output": 46,
};

/** Match the panels' percentage constraints before either SSR or hydration. */
export function normalizeUnixPanelLayout(value: unknown): PanelLayout {
	if (!value || typeof value !== "object") return DEFAULT_UNIX_PANEL_LAYOUT;
	const input = (value as PanelLayout)[UNIX_IO_PANEL_IDS[0]];
	const output = (value as PanelLayout)[UNIX_IO_PANEL_IDS[1]];
	if (
		!Number.isFinite(input) ||
		!Number.isFinite(output) ||
		input <= 0 ||
		output <= 0 ||
		!Number.isFinite(input + output)
	)
		return DEFAULT_UNIX_PANEL_LAYOUT;
	const share = Math.min(72, Math.max(30, (input / (input + output)) * 100));
	return { "unix-input": share, "unix-output": 100 - share };
}

export function parseUnixPanelLayout(cookie: string | undefined): PanelLayout {
	if (!cookie) return DEFAULT_UNIX_PANEL_LAYOUT;
	try {
		return normalizeUnixPanelLayout(JSON.parse(decodeURIComponent(cookie)));
	} catch {
		return DEFAULT_UNIX_PANEL_LAYOUT;
	}
}
