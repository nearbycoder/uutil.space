import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export const NAV_EXPANDED_STORAGE_KEY = "uutil.nav.expanded";

export const getUiPreferences = createServerFn({ method: "GET" }).handler(
	() => {
		const navExpandedValue = getCookie(NAV_EXPANDED_STORAGE_KEY);

		return {
			hasNavExpandedPreference:
				navExpandedValue === "0" || navExpandedValue === "1",
			navExpanded: navExpandedValue === "1",
		};
	},
);
