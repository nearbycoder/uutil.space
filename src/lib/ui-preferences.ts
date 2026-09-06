import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export const NAV_EXPANDED_STORAGE_KEY = "uutil.nav.expanded";

export const getUiPreferences = createServerFn({ method: "GET" }).handler(
	() => {
		const navExpandedValue = getCookie(NAV_EXPANDED_STORAGE_KEY);

		return {
			themeId:
				getCookie("uutil.theme.mode") === "github-light"
					? "github-light"
					: "github-dark",
			hasNavExpandedPreference:
				navExpandedValue === "0" || navExpandedValue === "1",
			navExpanded: navExpandedValue === "1",
		};
	},
);

/** Route transitions remain usable when the server cannot be reached offline. */
export async function loadUiPreferences() {
	const local = () => {
		const cookies = typeof document === "undefined" ? "" : document.cookie;
		const read = (key: string) =>
			cookies
				.split(";")
				.map((value) => value.trim())
				.find((value) => value.startsWith(`${key}=`))
				?.slice(key.length + 1);
		const nav = read(NAV_EXPANDED_STORAGE_KEY);
		return {
			themeId:
				read("uutil.theme.mode") === "github-light"
					? "github-light"
					: "github-dark",
			hasNavExpandedPreference: nav === "0" || nav === "1",
			navExpanded: nav === "1",
		};
	};
	if (typeof navigator !== "undefined" && !navigator.onLine) return local();
	try {
		return await getUiPreferences();
	} catch (error) {
		if (typeof document !== "undefined") return local();
		throw error;
	}
}
