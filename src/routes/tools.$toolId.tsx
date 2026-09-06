import { createFileRoute } from "@tanstack/react-router";
import { loadUiPreferences } from "#/lib/ui-preferences";
import { ToolingApp } from "./index";

export const Route = createFileRoute("/tools/$toolId")({
	loader: () => loadUiPreferences(),
	component: ToolRouteComponent,
});

function ToolRouteComponent() {
	const { toolId } = Route.useParams();
	return (
		<ToolingApp
			routedToolId={toolId}
			initialUiPreferences={Route.useLoaderData()}
		/>
	);
}
