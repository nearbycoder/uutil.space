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
	notFoundComponent: () => (
		<div className="flex min-h-screen items-center justify-center bg-[color:var(--app-bg)] px-6 text-center text-[color:var(--app-fg)]">
			<div className="max-w-md rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] p-8">
				<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--app-fg-soft)]">
					Not Found
				</p>
				<h1 className="mt-3 text-2xl font-semibold tracking-tight">
					This page does not exist.
				</h1>
				<p className="mt-3 text-sm text-[color:var(--app-fg-muted)]">
					Check the URL or return to the tooling workspace.
				</p>
				<a
					href="/"
					className="mt-5 inline-flex rounded-md border [border-color:var(--app-border-strong)] bg-[color:var(--app-surface-alt)] px-3 py-2 text-sm text-[color:var(--app-fg)] transition hover:[border-color:var(--app-accent)]"
				>
					Go to uutil.space
				</a>
			</div>
		</div>
	),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
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
