import { GripVertical } from "lucide-react";
import type * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "#/lib/utils";

function ResizablePanelGroup({
	className,
	direction = "horizontal",
	...props
}: Omit<
	React.ComponentProps<typeof ResizablePrimitive.Group>,
	"orientation"
> & {
	direction?: "horizontal" | "vertical";
}) {
	return (
		<ResizablePrimitive.Group
			className={cn(
				"flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
				className,
			)}
			orientation={direction}
			{...props}
		/>
	);
}

const ResizablePanel = ResizablePrimitive.Panel;

function ResizableHandle({
	withHandle,
	className,
	...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
	withHandle?: boolean;
}) {
	return (
		<ResizablePrimitive.Separator
			className={cn(
				"relative flex w-px items-center justify-center bg-[color:var(--app-border)] after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--app-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--app-bg)] data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
				className,
			)}
			{...props}
		>
			{withHandle ? (
				<div className="z-10 flex h-7 w-4 items-center justify-center rounded-sm border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] text-[color:var(--app-fg-soft)]">
					<GripVertical className="h-3.5 w-3.5" />
				</div>
			) : null}
		</ResizablePrimitive.Separator>
	);
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
