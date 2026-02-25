import "reflect-metadata";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { TRPCRouter } from "#/integrations/trpc/router";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import appCss from "../styles.css?url";

const THEME_VARS_COOKIE_KEY = "uutil.shiki.theme-vars";
const THEME_VARS_STORAGE_KEY = "uutil.shiki.theme-vars";
const THEME_BOOTSTRAP_SCRIPT = `(() => {
	function getCookieValue(name) {
		const encodedName = name + "=";
		const parts = document.cookie ? document.cookie.split("; ") : [];
		for (const part of parts) {
			if (part.startsWith(encodedName)) {
				return part.slice(encodedName.length);
			}
		}
		return null;
	}

	try {
		let raw = getCookieValue("${THEME_VARS_COOKIE_KEY}");
		if (raw) {
			raw = decodeURIComponent(raw);
		}

		if (!raw) {
			const legacyRaw = window.localStorage.getItem("${THEME_VARS_STORAGE_KEY}");
			if (legacyRaw) {
				raw = legacyRaw;
				document.cookie = "${THEME_VARS_COOKIE_KEY}=" + encodeURIComponent(legacyRaw) + "; Path=/; Max-Age=31536000; SameSite=Lax";
			}
		}

		if (!raw) return;
		const vars = JSON.parse(raw);
		if (!vars || typeof vars !== "object") return;
		const style = document.documentElement.style;
		for (const [key, value] of Object.entries(vars)) {
			if (!key.startsWith("--") || value == null) continue;
			style.setProperty(key, String(value));
		}
		if (typeof vars.colorScheme === "string") {
			style.colorScheme = vars.colorScheme;
		}
		if (typeof vars.backgroundColor === "string") {
			style.backgroundColor = vars.backgroundColor;
		}
		if (typeof vars.color === "string") {
			style.color = vars.color;
		}
	} catch {
		// Ignore parse errors and continue with defaults.
	}
})();`;

interface MyRouterContext {
	queryClient: QueryClient;

	trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "uutil.space | Developer Tooling Hub",
			},
			{
				name: "description",
				content:
					"uutil.space is a developer tooling hub for API, data, security, frontend, and database workflows.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<script>{THEME_BOOTSTRAP_SCRIPT}</script>
				<HeadContent />
			</head>
			<body>
				<TanStackQueryProvider>
					{children}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</TanStackQueryProvider>
				<Scripts />
			</body>
		</html>
	);
}
