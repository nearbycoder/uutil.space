import { createFileRoute } from "@tanstack/react-router";
import { ToolingApp } from "./index";

export const Route = createFileRoute("/tools/$toolId")({
	component: ToolRouteComponent,
});

function ToolRouteComponent() {
	const { toolId } = Route.useParams();
	return <ToolingApp routedToolId={toolId} />;
}
