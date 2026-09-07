import { Menu, Search, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export const MOBILE_DRAWER_EXIT_MS = 180;

/** A thumb-reachable dock and native modal sheet; desktop keeps its sidebar. */
export function MobileToolNavigation({
	open,
	onOpenChange,
	onFind,
	searchRequest,
	menuButtonRef,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onFind: () => void;
	searchRequest: number;
	menuButtonRef: React.RefObject<HTMLButtonElement | null>;
	children: React.ReactNode;
}) {
	const id = useId();
	const root = useRef<HTMLDivElement>(null);
	const dialog = useRef<HTMLDialogElement>(null);
	const title = useRef<HTMLHeadingElement>(null);
	const previousSearchRequest = useRef(searchRequest);
	const callbacks = useRef({ onOpenChange, onFind });
	callbacks.current = { onOpenChange, onFind };
	const drag = useRef<{ start: number; distance: number } | null>(null);
	const suppressClick = useRef(false);
	const search = () => {
		dialog.current
			?.querySelector(".mobile-drawer-content")
			?.scrollTo({ top: 0 });
		const input = dialog.current?.querySelector<HTMLInputElement>(
			'input[type="search"]',
		);
		input?.focus({ preventScroll: true });
		input?.select();
	};
	const show = (find: boolean) => {
		if (find) callbacks.current.onFind();
		callbacks.current.onOpenChange(true);
		// Stay inside the tap event so iOS can open the keyboard for Find.
		if (!dialog.current?.open) dialog.current?.showModal();
		if (find) search();
		else title.current?.focus({ preventScroll: true });
	};
	useEffect(() => {
		const element = dialog.current;
		if (!element) return;
		if (open) {
			if (!element.open) {
				element.showModal();
				title.current?.focus({ preventScroll: true });
			}
			if (searchRequest !== previousSearchRequest.current) {
				previousSearchRequest.current = searchRequest;
				element
					.querySelector<HTMLInputElement>('input[type="search"]')
					?.focus({ preventScroll: true });
			}
			return;
		}
		if (!element.open) return;
		const timeout = window.setTimeout(
			() => {
				element.close();
				element.style.removeProperty("--drawer-drag");
				if (window.innerWidth < 1280)
					menuButtonRef.current?.focus({ preventScroll: true });
			},
			window.innerWidth >= 1280 ||
				window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? 0
				: MOBILE_DRAWER_EXIT_MS,
		);
		return () => window.clearTimeout(timeout);
	}, [open, searchRequest, menuButtonRef]);
	useEffect(() => {
		const viewport = window.visualViewport;
		let frame = 0;
		const update = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const height = viewport?.height ?? window.innerHeight;
				root.current?.style.setProperty(
					"--mobile-viewport-height",
					`${height}px`,
				);
				root.current?.style.setProperty(
					"--mobile-viewport-top",
					`${viewport?.offsetTop ?? 0}px`,
				);
				const editing = document.activeElement?.matches(
					'input, textarea, [contenteditable="true"]',
				);
				if (root.current)
					root.current.dataset.keyboard = String(
						Boolean(editing && window.innerHeight - height > 120),
					);
			});
		};
		update();
		viewport?.addEventListener("resize", update);
		viewport?.addEventListener("scroll", update);
		window.addEventListener("resize", update);
		document.addEventListener("focusin", update);
		document.addEventListener("focusout", update);
		return () => {
			cancelAnimationFrame(frame);
			viewport?.removeEventListener("resize", update);
			viewport?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
			document.removeEventListener("focusin", update);
			document.removeEventListener("focusout", update);
		};
	}, []);
	return (
		<div ref={root} className="mobile-tool-navigation xl:hidden">
			<nav
				className="mobile-dock mobile-dock-resting"
				aria-label="Mobile tool navigation"
			>
				<button
					type="button"
					onClick={() => show(true)}
					aria-label="Find a tool"
					aria-haspopup="dialog"
					aria-controls={id}
				>
					<Search className="size-[18px]" aria-hidden="true" />
					<span>Find</span>
				</button>
				<span className="mobile-dock-divider" aria-hidden="true" />
				<button
					type="button"
					ref={menuButtonRef}
					onClick={() => show(false)}
					aria-label="Open tools menu"
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={id}
				>
					<Menu className="size-5" aria-hidden="true" />
				</button>
			</nav>
			<dialog
				ref={dialog}
				id={id}
				className="mobile-tools-dialog"
				data-expanded={open}
				aria-labelledby={`${id}-title`}
				onCancel={(event) => {
					event.preventDefault();
					callbacks.current.onOpenChange(false);
				}}
				onClose={() => {
					// Native close events are queued; ignore one if a new tap or
					// keyboard shortcut has already reopened the dialog.
					if (!dialog.current?.open) callbacks.current.onOpenChange(false);
				}}
			>
				<button
					className="mobile-drawer-backdrop"
					type="button"
					aria-label="Dismiss tools drawer"
					onClick={() => callbacks.current.onOpenChange(false)}
				/>
				<section className="mobile-tool-sheet">
					<h2
						id={`${id}-title`}
						ref={title}
						tabIndex={-1}
						className="sr-only outline-none"
					>
						Tool library
					</h2>
					<button
						type="button"
						className="mobile-drawer-handle"
						aria-label="Close tools drawer"
						onClick={() => {
							if (suppressClick.current) {
								suppressClick.current = false;
								return;
							}
							callbacks.current.onOpenChange(false);
						}}
						onPointerDown={(event) => {
							if (dialog.current) dialog.current.dataset.dragging = "true";
							suppressClick.current = false;
							drag.current = { start: event.clientY, distance: 0 };
							event.currentTarget.setPointerCapture(event.pointerId);
						}}
						onPointerMove={(event) => {
							if (!drag.current) return;
							drag.current.distance = Math.max(
								0,
								event.clientY - drag.current.start,
							);
							dialog.current?.style.setProperty(
								"--drawer-drag",
								`${Math.min(drag.current.distance, 200)}px`,
							);
						}}
						onPointerUp={() => {
							const distance = drag.current?.distance ?? 0;
							drag.current = null;
							suppressClick.current = distance > 8;
							if (dialog.current) delete dialog.current.dataset.dragging;
							if (distance > 64) callbacks.current.onOpenChange(false);
							else dialog.current?.style.removeProperty("--drawer-drag");
						}}
						onPointerCancel={() => {
							drag.current = null;
							suppressClick.current = true;
							if (dialog.current) delete dialog.current.dataset.dragging;
							dialog.current?.style.removeProperty("--drawer-drag");
						}}
					>
						<span />
					</button>
					<div className="mobile-drawer-content">{children}</div>
				</section>
				<nav
					className="mobile-dock mobile-dock-expanded"
					aria-label="Open drawer navigation"
				>
					<button
						type="button"
						onClick={() => show(true)}
						aria-label="Find a tool"
					>
						<Search className="size-[18px]" aria-hidden="true" />
						<span>Find</span>
					</button>
					<span className="mobile-dock-divider" aria-hidden="true" />
					<button
						type="button"
						onClick={() => callbacks.current.onOpenChange(false)}
						aria-label="Close tools menu"
						aria-expanded="true"
						aria-controls={id}
					>
						<X className="size-5" aria-hidden="true" />
					</button>
				</nav>
			</dialog>
		</div>
	);
}
