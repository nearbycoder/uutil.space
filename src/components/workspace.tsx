import {
	ArrowRight,
	Bookmark,
	BookOpen,
	ChevronDown,
	Clipboard,
	ClipboardPaste,
	Clock3,
	Download,
	FileStack,
	FolderOpen,
	type LucideIcon,
	Share2,
	Star,
	StickyNote,
	Wifi,
	X,
} from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useOffline } from "#/lib/offline";
import { TOOL_EXAMPLES, TOOL_HELP } from "#/lib/tool-examples";
import { filterAndRankTools } from "#/lib/tool-search";
import {
	decodeRecipe,
	detectTools,
	downloadText,
	emptyWorkspace,
	encodeRecipe,
	FILE_OPERATIONS,
	parseWorkspace,
	pruneHistory,
	readFields,
	type SavedField,
	type SavedRun,
	transformFile,
	WORKSPACE_KEY,
	type WorkspaceState,
} from "#/lib/workspace";

type Tool = { id: string; name: string; summary: string; category: string };
type Field = {
	get: () => SavedField;
	set: (value: string | boolean) => void;
	initial: SavedField;
};
type Panel =
	| "library"
	| "paste"
	| "presets"
	| "scratchpads"
	| "history"
	| "files"
	| "share"
	| "help"
	| "send"
	| "offline";

function useWorkspaceModel() {
	const offline = useOffline();
	const [state, setState] = useState(emptyWorkspace);
	const [ready, setReady] = useState(false);
	const [panel, setPanel] = useState<Panel | null>(null);
	const [sendText, setSendText] = useState("");
	const fields = useRef(new Map<string, Field>());
	const config = useRef<{
		toolId: string;
		tools: Tool[];
		navigate: (id: string) => void;
	}>({ toolId: "", tools: [], navigate: () => {} });
	const pending = useRef<{
		toolId: string;
		fields?: SavedField[];
		text?: string;
	} | null>(null);
	const storageWarning = useRef(false);
	useEffect(() => {
		try {
			setState(parseWorkspace(localStorage.getItem(WORKSPACE_KEY)));
		} catch {
			toast.error(
				"Browser storage is unavailable. Changes last for this session only.",
			);
		}
		setReady(true);
	}, []);
	useEffect(() => {
		if (!ready) return;
		try {
			const raw = JSON.stringify(pruneHistory(state));
			if (raw.length > 2_000_000) throw new Error("Full");
			localStorage.setItem(WORKSPACE_KEY, raw);
			storageWarning.current = false;
		} catch {
			if (!storageWarning.current)
				toast.error(
					"Workspace storage is full or blocked. Export or delete saved items; new changes are session-only.",
				);
			storageWarning.current = true;
		}
	}, [state, ready]);
	useEffect(() => {
		const sync = (e: StorageEvent) => {
			if (e.key === WORKSPACE_KEY) setState(parseWorkspace(e.newValue));
		};
		window.addEventListener("storage", sync);
		const timer = setInterval(
			() => setState((current) => pruneHistory(current)),
			60_000,
		);
		return () => {
			window.removeEventListener("storage", sync);
			clearInterval(timer);
		};
	}, []);
	const update = useCallback(
		(fn: (state: WorkspaceState) => WorkspaceState) =>
			setState((current) => pruneHistory(fn(current))),
		[],
	);
	const register = useCallback((id: string, field: Field) => {
		fields.current.set(id, field);
		return () => {
			fields.current.delete(id);
		};
	}, []);
	const snapshot = useCallback(
		(includeInput = true) =>
			readFields(
				[...fields.current.values()]
					.map((field) => field.get())
					.filter((field) => includeInput || field.kind === "setting"),
			),
		[],
	);
	const apply = useCallback((values: SavedField[]) => {
		const remaining = [...values];
		for (const field of fields.current.values()) {
			const current = field.get();
			const index = remaining.findIndex(
				(v) => v.label === current.label && v.kind === current.kind,
			);
			if (index >= 0) {
				const value = remaining.splice(index, 1)[0].value;
				if (current.value !== value) field.set(value);
			}
		}
	}, []);
	const settle = useCallback(
		(toolId: string) => {
			let frame = 0,
				cancelled = false;
			const run = (iteration: number) => {
				if (cancelled) return;
				const value = pending.current;
				if (!value || value.toolId !== toolId) return;
				if (value.fields) apply(value.fields);
				if (value.text !== undefined) {
					const first = [...fields.current.values()].find(
						(field) => field.get().kind === "input",
					);
					if (first) {
						first.set(value.text);
						value.text = undefined;
					}
				}
				if (iteration < 3)
					frame = requestAnimationFrame(() => run(iteration + 1));
				else {
					pending.current = null;
					if (value.text !== undefined) {
						toast.error(
							"This tool has no compatible text input. Your source output is unchanged.",
						);
						return;
					}
					toast.success(
						"Loaded into the tool. Review the input before running.",
					);
				}
			};
			frame = requestAnimationFrame(() => run(0));
			return () => {
				cancelled = true;
				cancelAnimationFrame(frame);
			};
		},
		[apply],
	);
	const load = useCallback(
		(toolId: string, value: { fields?: SavedField[]; text?: string }) => {
			if (!config.current.tools.some((tool) => tool.id === toolId)) {
				toast.error("This tool is no longer available.");
				return;
			}
			pending.current = { toolId, ...value };
			setPanel(null);
			if (config.current.toolId === toolId) settle(toolId);
			else config.current.navigate(toolId);
		},
		[settle],
	);
	const visit = useCallback(
		(toolId: string) =>
			update((current) => ({
				...current,
				recent: [toolId, ...current.recent.filter((id) => id !== toolId)].slice(
					0,
					12,
				),
			})),
		[update],
	);
	const favorite = useCallback(
		(toolId: string) =>
			update((current) => ({
				...current,
				favorites: current.favorites.includes(toolId)
					? current.favorites.filter((id) => id !== toolId)
					: [...current.favorites, toolId],
			})),
		[update],
	);
	const record = useCallback(
		(name: string) => {
			if (!state.historyEnabled) return;
			try {
				const run = {
					id: crypto.randomUUID(),
					name,
					toolId: config.current.toolId,
					created: Date.now(),
					fields: snapshot(),
				};
				update((current) => ({
					...current,
					history: [run, ...current.history].slice(0, 50),
				}));
			} catch {
				toast.error("This input is too large to retain in history.");
			}
		},
		[state.historyEnabled, snapshot, update],
	);
	return {
		offline,
		state,
		ready,
		panel,
		setPanel,
		sendText,
		setSendText,
		config,
		fields,
		register,
		snapshot,
		apply,
		settle,
		load,
		visit,
		favorite,
		record,
		update,
	};
}

const WorkspaceContext = createContext<ReturnType<
	typeof useWorkspaceModel
> | null>(null);
const ToolFieldsContext = createContext(false);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
	const workspace = useWorkspaceModel();
	return (
		<WorkspaceContext.Provider value={workspace}>
			{children}
		</WorkspaceContext.Provider>
	);
}

export function useWorkspace() {
	const value = useContext(WorkspaceContext);
	if (!value) throw new Error("Workspace provider missing.");
	return value;
}

export function ToolSession({
	toolId,
	children,
}: {
	toolId: string;
	children: React.ReactNode;
}) {
	const { settle } = useWorkspace();
	useEffect(() => settle(toolId), [toolId, settle]);
	return (
		<ToolFieldsContext.Provider value>{children}</ToolFieldsContext.Provider>
	);
}

export function useWorkspaceField(
	value: string | boolean,
	onChange: (value: string | boolean) => void,
	kind: SavedField["kind"],
	label: string,
) {
	const enabled = useContext(ToolFieldsContext);
	const { register } = useWorkspace();
	const id = useId();
	const ref = useRef({ value, onChange, kind, label });
	ref.current = { value, onChange, kind, label };
	useEffect(() => {
		if (!enabled) return;
		const { value, kind, label } = ref.current;
		return register(id, {
			initial: { value, kind, label },
			get: () => ({
				value: ref.current.value,
				kind: ref.current.kind,
				label: ref.current.label,
			}),
			set: (value) => ref.current.onChange(value),
		});
	}, [enabled, register, id]);
}

function Button({
	children,
	onClick,
	disabled,
	variant = "default",
	className,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "default" | "primary" | "danger";
}) {
	const variantClass =
		variant === "primary"
			? "ws-button action-primary"
			: variant === "danger"
				? "ws-button ws-button-danger"
				: "ws-button";
	return (
		<button
			type="button"
			className={className ? `${variantClass} ${className}` : variantClass}
			disabled={disabled}
			{...props}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-sm leading-6 text-[color:var(--app-fg-muted)]">
			{children}
		</p>
	);
}

function CheckField({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
			<input
				className="size-4 accent-[var(--app-accent)]"
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			{label}
		</label>
	);
}

const panels: {
	id: Panel;
	label: string;
	icon: LucideIcon;
}[] = [
	{ id: "library", label: "My tools", icon: Star },
	{ id: "paste", label: "Smart paste", icon: ClipboardPaste },
	{ id: "presets", label: "Presets", icon: Bookmark },
	{ id: "scratchpads", label: "Scratchpads", icon: StickyNote },
	{ id: "history", label: "History", icon: Clock3 },
	{ id: "files", label: "Batch files", icon: FileStack },
	{ id: "share", label: "Share recipe", icon: Share2 },
	{ id: "help", label: "Examples & help", icon: BookOpen },
	{ id: "offline", label: "Offline & install", icon: Wifi },
];

export function WorkspaceToolbar({
	toolId,
	tools,
	navigate,
}: {
	toolId: string;
	tools: Tool[];
	navigate: (id: string) => void;
}) {
	const ws = useWorkspace();
	ws.config.current = { toolId, tools, navigate };
	const { ready, visit, load } = ws;
	const recipeSeen = useRef("");
	useEffect(() => {
		if (ready) visit(toolId);
	}, [ready, toolId, visit]);
	useEffect(() => {
		const read = () => {
			const hash = window.location.hash;
			if (!hash.startsWith("#recipe=") || recipeSeen.current === hash) return;
			recipeSeen.current = hash;
			try {
				const recipe = decodeRecipe(
					hash,
					tools.map((t) => t.id),
				);
				if (recipe) load(recipe.toolId, { fields: recipe.fields });
			} catch (e) {
				toast.error((e as Error).message);
			}
		};
		read();
		window.addEventListener("hashchange", read);
		return () => window.removeEventListener("hashchange", read);
	}, [tools, load]);
	const isFavorite = ws.state.favorites.includes(toolId);
	return (
		<>
			<fieldset
				className="workspace-actions flex flex-wrap items-center gap-2"
				aria-label="Workspace actions"
			>
				<Button
					aria-label={isFavorite ? "Remove favorite" : "Favorite this tool"}
					aria-pressed={isFavorite}
					onClick={() => ws.favorite(toolId)}
				>
					<Star
						className="size-4"
						aria-hidden="true"
						fill={isFavorite ? "currentColor" : "none"}
					/>
					<span className="hidden sm:inline">Favorite</span>
				</Button>
				<Button
					aria-label="My workspace"
					onClick={() => ws.setPanel("library")}
				>
					<FolderOpen className="size-4" aria-hidden="true" />
					<span>My workspace</span>
				</Button>
				<Button
					aria-label="Smart paste"
					title="Smart paste"
					onClick={() => ws.setPanel("paste")}
				>
					<ClipboardPaste className="size-4" aria-hidden="true" />
					<span className="hidden sm:inline">Smart paste</span>
				</Button>
				<Button
					aria-label="Examples & help"
					title="Examples & help"
					onClick={() => ws.setPanel("help")}
				>
					<BookOpen className="size-4" aria-hidden="true" />
					<span className="hidden sm:inline">Examples & help</span>
				</Button>
			</fieldset>
			<WorkspaceDialog />
		</>
	);
}

export function OutputActions({ value }: { value: string }) {
	const ws = useWorkspace();
	return (
		<div className="output-secondary-actions flex gap-1">
			<Button
				aria-label="Download output"
				disabled={!value}
				onClick={() => downloadText(value)}
			>
				<Download className="size-3.5" aria-hidden="true" />
				<span className="hidden sm:inline">Download</span>
			</Button>
			<Button
				aria-label="Send output to another tool"
				disabled={!value}
				onClick={() => {
					ws.setSendText(value);
					ws.setPanel("send");
				}}
			>
				<ArrowRight className="size-3.5" aria-hidden="true" />
				<span className="hidden sm:inline">Send</span>
			</Button>
		</div>
	);
}

function WorkspaceDialog() {
	const ws = useWorkspace();
	const dialog = useRef<HTMLDialogElement>(null);
	const navRef = useRef<HTMLElement>(null);
	const panel = ws.panel;

	const syncOverflowIndicators = useCallback(() => {
		const nav = navRef.current;
		if (!nav) return;
		const left = nav.scrollLeft > 4;
		const right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4;
		nav.dataset.overflowLeft = String(left);
		nav.dataset.overflowRight = String(right);
	}, []);

	useEffect(() => {
		if (panel) {
			if (!dialog.current?.open) dialog.current?.showModal();
			requestAnimationFrame(() => {
				const active = navRef.current?.querySelector<HTMLButtonElement>(
					'button[aria-pressed="true"]',
				);
				active?.scrollIntoView({ inline: "nearest", block: "nearest" });
				syncOverflowIndicators();
			});
		} else {
			dialog.current?.close();
		}
	}, [panel, syncOverflowIndicators]);

	useEffect(() => {
		const nav = navRef.current;
		if (!nav || !panel) return;
		const observer = new ResizeObserver(syncOverflowIndicators);
		observer.observe(nav);
		syncOverflowIndicators();
		return () => observer.disconnect();
	}, [panel, syncOverflowIndicators]);

	const title =
		panel === "send"
			? "Send output"
			: (panels.find((p) => p.id === panel)?.label ?? "Workspace");

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Backdrop click dismissal pairs with native dialog Escape handling.
		<dialog
			ref={dialog}
			className="workspace-dialog uutil-scrollbar"
			aria-labelledby="workspace-dialog-title"
			onCancel={() => ws.setPanel(null)}
			onClose={() => ws.setPanel(null)}
			onClick={(event) => {
				if (event.target === dialog.current) ws.setPanel(null);
			}}
		>
			<div className="ws-dialog-header flex items-center justify-between gap-4 border-b p-5 [border-color:var(--app-border)]">
				<div>
					<p className="mb-1 text-xs font-medium text-[color:var(--app-fg-soft)]">
						Local workspace
					</p>
					<h2
						id="workspace-dialog-title"
						className="text-xl font-semibold tracking-tight"
					>
						{title}
					</h2>
				</div>
				<Button aria-label="Close workspace" onClick={() => ws.setPanel(null)}>
					<X className="size-4" aria-hidden="true" />
				</Button>
			</div>
			<div className="ws-dialog-body">
				<nav
					ref={navRef}
					onScroll={syncOverflowIndicators}
					className="workspace-sections flex gap-1.5"
					aria-label="Workspace sections"
				>
					{panels.map((p) => {
						const Icon = p.icon;
						return (
							<Button
								key={p.id}
								aria-pressed={p.id === panel}
								onClick={() => ws.setPanel(p.id)}
							>
								<Icon className="size-3.5 shrink-0" aria-hidden="true" />
								{p.label}
							</Button>
						);
					})}
				</nav>
				<div className="mt-6" key={panel}>
					{panel === "library" && <LibraryPanel />}
					{panel === "paste" && <PastePanel />}
					{panel === "send" && <SendPanel />}
					{panel === "presets" && <PresetsPanel />}
					{panel === "scratchpads" && <ScratchpadsPanel />}
					{panel === "history" && <HistoryPanel />}
					{panel === "files" && <FilesPanel />}
					{panel === "share" && <SharePanel />}
					{panel === "help" && <HelpPanel />}
					{panel === "offline" && <OfflinePanel />}
				</div>
			</div>
		</dialog>
	);
}

function ToolChooser({ onChoose }: { onChoose: (toolId: string) => void }) {
	const ws = useWorkspace();
	const [query, setQuery] = useState("");
	const matches = useMemo(
		() => filterAndRankTools(ws.config.current.tools, query),
		[ws.config.current.tools, query],
	);
	return (
		<div className="space-y-3">
			<input
				className="ws-input"
				aria-label="Find destination tool"
				placeholder="Find a tool…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && matches[0]) {
						e.preventDefault();
						onChoose(matches[0].id);
					}
				}}
			/>
			<div className="uutil-scrollbar max-h-64 space-y-2 overflow-auto pr-0.5">
				{matches.map((t) => (
					<button
						type="button"
						key={t.id}
						className="ws-list-item"
						onClick={() => onChoose(t.id)}
					>
						<span className="min-w-0">
							<span className="block truncate font-medium">{t.name}</span>
							<span
								aria-hidden="true"
								className="block truncate text-xs text-[color:var(--app-fg-soft)]"
							>
								{t.category} · {t.summary}
							</span>
						</span>
						<ArrowRight className="size-4 shrink-0 text-[color:var(--app-fg-soft)]" />
					</button>
				))}
				{matches.length === 0 ? (
					<Note>No destination tools match "{query}".</Note>
				) : null}
			</div>
		</div>
	);
}

function LibraryPanel() {
	const ws = useWorkspace();
	const { tools } = ws.config.current;
	return (
		<div className="space-y-6">
			{(["favorites", "recent"] as const).map((group) => (
				<section key={group}>
					<div className="mb-3 flex items-center justify-between gap-2">
						<h3 className="font-semibold">
							{group === "favorites" ? "Favorites" : "Recently opened"}
						</h3>
						{ws.state[group].length > 0 ? (
							<span className="font-mono text-xs tabular-nums text-[color:var(--app-fg-soft)]">
								{ws.state[group].length}
							</span>
						) : null}
					</div>
					{!ws.state[group].length && (
						<Note>
							{group === "favorites"
								? "Star a tool to keep it here."
								: "Your recently opened tools will appear here. No inputs are stored."}
						</Note>
					)}
					<div className="space-y-2">
						{ws.state[group].map((id) => {
							const tool = tools.find((t) => t.id === id);
							return tool ? (
								<div className="ws-list-row" key={id}>
									<button
										type="button"
										className="ws-list-item"
										onClick={() => {
											ws.setPanel(null);
											ws.config.current.navigate(id);
										}}
									>
										<span className="min-w-0">
											<span className="block truncate font-medium">
												{tool.name}
											</span>
											<span
												aria-hidden="true"
												className="block truncate text-xs text-[color:var(--app-fg-soft)]"
											>
												{tool.category} · {tool.summary}
											</span>
										</span>
										<ArrowRight
											className="size-4 shrink-0 text-[color:var(--app-fg-soft)]"
											aria-hidden="true"
										/>
									</button>
									{group === "favorites" && (
										<Button
											aria-label={`Unfavorite ${tool.name}`}
											onClick={() => ws.favorite(id)}
										>
											<X className="size-4" aria-hidden="true" />
										</Button>
									)}
								</div>
							) : null;
						})}
					</div>
				</section>
			))}
			<Button
				variant="danger"
				disabled={ws.state.recent.length === 0}
				onClick={() => ws.update((s) => ({ ...s, recent: [] }))}
			>
				Clear recent tools
			</Button>
		</div>
	);
}

function PastePanel() {
	const ws = useWorkspace();
	const [text, setText] = useState("");
	const firstSuggestionRef = useRef<HTMLButtonElement>(null);
	const suggestions = useMemo(() => detectTools(text), [text]);

	const pasteFromClipboard = async () => {
		try {
			const clip = await navigator.clipboard.readText();
			if (!clip) {
				toast.info("Clipboard is empty.");
				return;
			}
			setText(clip.slice(0, 100_000));
		} catch {
			toast.error("Clipboard read unavailable. Paste directly into the box.");
		}
	};

	return (
		<div className="space-y-4">
			<Note>
				Paste anything to find a matching tool. Detection runs locally as you
				paste and never executes the input.
			</Note>
			<textarea
				className="ws-input font-mono"
				rows={7}
				maxLength={100_000}
				aria-label="Smart paste input"
				placeholder="Paste JSON, JWT, URL, Unix timestamp, Base64, or PEM certificate…"
				value={text}
				onChange={(e) => setText(e.target.value)}
			/>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="primary"
					disabled={!text.trim()}
					onClick={() => firstSuggestionRef.current?.focus()}
				>
					Suggest tools
				</Button>
				<Button onClick={() => void pasteFromClipboard()}>
					<Clipboard className="size-4" aria-hidden="true" />
					Paste from clipboard
				</Button>
				{text ? <Button onClick={() => setText("")}>Clear</Button> : null}
			</div>
			{suggestions.length > 0 ? (
				<div className="space-y-2">
					{suggestions.map((s, index) => (
						<button
							ref={index === 0 ? firstSuggestionRef : undefined}
							className="ws-list-item"
							type="button"
							key={s.id}
							onClick={() => ws.load(s.id, { text })}
						>
							<span className="min-w-0">
								{ws.config.current.tools.find((t) => t.id === s.id)?.name}
								<small className="block text-[color:var(--app-fg-muted)]">
									{s.reason}
								</small>
							</span>
							<ArrowRight
								className="size-4 shrink-0 text-[color:var(--app-fg-soft)]"
								aria-hidden="true"
							/>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

function SendPanel() {
	const ws = useWorkspace();
	return (
		<div className="space-y-4">
			<Note>
				Send {ws.sendText.length.toLocaleString()} characters to the first text
				input of a tool. Nothing runs automatically. Tools without a text input
				cannot accept this content.
			</Note>
			<ToolChooser
				onChoose={(toolId) => ws.load(toolId, { text: ws.sendText })}
			/>
		</div>
	);
}

function PresetsPanel() {
	const ws = useWorkspace();
	const [name, setName] = useState("");
	const [include, setInclude] = useState(false);
	const { toolId } = ws.config.current;
	const save = () => {
		try {
			const fields = ws.snapshot(include);
			if (!fields.length) {
				toast.error("No settings to save. Opt in to input storage if needed.");
				return;
			}
			const run = {
				id: crypto.randomUUID(),
				name: name.trim() || "Untitled preset",
				toolId,
				fields,
				created: Date.now(),
			};
			ws.update((s) => ({ ...s, presets: [run, ...s.presets].slice(0, 50) }));
			setName("");
			toast.success("Preset saved on this device.");
		} catch (e) {
			toast.error((e as Error).message);
		}
	};
	return (
		<div className="space-y-4">
			<Note>
				Save this tool's settings. Inputs are excluded unless you opt in. Up to
				50 presets are kept on this browser.
			</Note>
			<input
				className="ws-input"
				maxLength={100}
				aria-label="Preset name"
				placeholder="Preset name"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
			<CheckField
				label="Also save input (may contain sensitive data)"
				checked={include}
				onChange={setInclude}
			/>
			<Button variant="primary" onClick={save}>
				Save preset
			</Button>
			<RunList
				runs={ws.state.presets.filter((p) => p.toolId === toolId)}
				onDelete={(id) =>
					ws.update((s) => ({
						...s,
						presets: s.presets.filter((p) => p.id !== id),
					}))
				}
			/>
		</div>
	);
}

function RunList({
	runs,
	onDelete,
}: {
	runs: SavedRun[];
	onDelete: (id: string) => void;
}) {
	const ws = useWorkspace();
	return (
		<div className="space-y-3">
			{!runs.length && <Note>No saved items yet.</Note>}
			{runs.map((run) => (
				<div
					className="rounded-xl border bg-[color:var(--app-surface-alt)] p-3.5 [border-color:var(--app-border)]"
					key={run.id}
				>
					<p className="font-medium break-words">{run.name}</p>
					<p className="mb-3 mt-1 text-xs text-[color:var(--app-fg-muted)]">
						{ws.config.current.tools.find((t) => t.id === run.toolId)?.name} ·{" "}
						{new Date(run.created).toLocaleString()}
					</p>
					<div className="flex flex-wrap gap-2">
						<Button onClick={() => ws.load(run.toolId, { fields: run.fields })}>
							Load
						</Button>
						<Button
							onClick={() =>
								downloadText(JSON.stringify(run, null, 2), "uutil-preset.json")
							}
						>
							Export
						</Button>
						<Button variant="danger" onClick={() => onDelete(run.id)}>
							Delete
						</Button>
					</div>
				</div>
			))}
		</div>
	);
}

function ScratchpadsPanel() {
	const ws = useWorkspace();
	const [id, setId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [text, setText] = useState("");
	return (
		<div className="space-y-4">
			<Note>
				Named snippets stored only in this browser. Save deliberately; avoid
				storing passwords or keys.
			</Note>
			<input
				className="ws-input"
				aria-label="Scratchpad name"
				placeholder="Snippet name"
				maxLength={100}
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
			<textarea
				className="ws-input font-mono"
				aria-label="Scratchpad text"
				rows={7}
				maxLength={100_000}
				value={text}
				onChange={(e) => setText(e.target.value)}
			/>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="primary"
					disabled={!name.trim() || !text}
					onClick={() => {
						const key = id ?? crypto.randomUUID();
						ws.update((s) => ({
							...s,
							scratchpads: [
								{ id: key, name: name.trim(), text },
								...s.scratchpads.filter((p) => p.id !== key),
							].slice(0, 50),
						}));
						setId(key);
						toast.success("Scratchpad saved.");
					}}
				>
					Save scratchpad
				</Button>
				<Button
					onClick={() => {
						setId(null);
						setName("");
						setText("");
					}}
				>
					New
				</Button>
				<Button
					disabled={!text}
					onClick={() => downloadText(text, "scratchpad.txt")}
				>
					Download
				</Button>
				<Button
					disabled={!text}
					onClick={() => ws.load(ws.config.current.toolId, { text })}
				>
					Use in current tool
				</Button>
			</div>
			{ws.state.scratchpads.map((p) => (
				<div
					key={p.id}
					className="flex flex-wrap items-center gap-2 rounded-xl border bg-[color:var(--app-surface-alt)] p-3.5 [border-color:var(--app-border)]"
				>
					<span className="mr-auto font-medium break-words">{p.name}</span>
					<Button
						onClick={() => {
							setId(p.id);
							setName(p.name);
							setText(p.text);
						}}
					>
						Edit
					</Button>
					<Button
						variant="danger"
						aria-label={`Delete scratchpad ${p.name}`}
						onClick={() => {
							ws.update((s) => ({
								...s,
								scratchpads: s.scratchpads.filter((x) => x.id !== p.id),
							}));
							if (id === p.id) {
								setId(null);
								setName("");
								setText("");
							}
						}}
					>
						Delete
					</Button>
				</div>
			))}
		</div>
	);
}

function HistoryPanel() {
	const ws = useWorkspace();
	return (
		<div className="space-y-4">
			<Note>
				Off by default. When enabled, tool action inputs and settings are saved
				locally (including secrets). Restore a run to review and rerun it. Up to
				50 actions; no output is retained. Turning history off deletes all
				entries.
			</Note>
			<CheckField
				label="Save tool action history on this device"
				checked={ws.state.historyEnabled}
				onChange={(value) =>
					ws.update((s) => ({ ...s, historyEnabled: value }))
				}
			/>
			<label className="block text-sm font-medium text-[color:var(--app-fg-muted)]">
				Retention
				<div className="ws-select-wrap relative mt-2">
					<select
						className="ws-input"
						value={ws.state.retention}
						onChange={(e) =>
							ws.update((s) => ({ ...s, retention: Number(e.target.value) }))
						}
					>
						{[1, 7, 30].map((n) => (
							<option key={n} value={n}>
								{n} {n === 1 ? "day" : "days"}
							</option>
						))}
					</select>
					<ChevronDown
						aria-hidden="true"
						className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--app-fg-soft)]"
					/>
				</div>
			</label>
			<Button
				variant="danger"
				onClick={() => ws.update((s) => ({ ...s, history: [] }))}
			>
				Clear all history
			</Button>
			<RunList
				runs={pruneHistory(ws.state).history}
				onDelete={(id) =>
					ws.update((s) => ({
						...s,
						history: s.history.filter((p) => p.id !== id),
					}))
				}
			/>
		</div>
	);
}

function FilesPanel() {
	const [operation, setOperation] = useState<string>(FILE_OPERATIONS[0]);
	const [busy, setBusy] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const [results, setResults] = useState<
		{ id: string; name: string; text?: string; error?: string }[]
	>([]);
	const input = useRef<HTMLInputElement>(null);
	const process = async (files: FileList | File[]) => {
		if (busy) return;
		if (files.length > 10) {
			toast.error("Choose at most 10 files.");
			return;
		}
		setBusy(true);
		const next = [];
		for (const file of Array.from(files)) {
			try {
				if (file.size > 1_000_000) throw new Error("File exceeds 1 MB.");
				const text = new TextDecoder("utf-8", { fatal: true }).decode(
					await file.arrayBuffer(),
				);
				next.push({
					id: crypto.randomUUID(),
					name: file.name,
					text: await transformFile(text, operation),
				});
			} catch (e) {
				next.push({
					id: crypto.randomUUID(),
					name: file.name,
					error: (e as Error).message,
				});
			}
		}
		setResults(next);
		setBusy(false);
	};
	return (
		<div className="space-y-4">
			<Note>
				Process up to 10 UTF-8 text files, 1 MB each. Files never leave your
				browser. Each file gets its own result or error.
			</Note>
			<div className="ws-select-wrap relative">
				<select
					className="ws-input"
					aria-label="Batch operation"
					value={operation}
					onChange={(e) => {
						setOperation(e.target.value);
						setResults([]);
					}}
					disabled={busy}
				>
					{FILE_OPERATIONS.map((value) => (
						<option key={value}>{value}</option>
					))}
				</select>
				<ChevronDown
					aria-hidden="true"
					className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--app-fg-soft)]"
				/>
			</div>
			<fieldset
				data-drag-over={dragOver || undefined}
				className="ws-dropzone rounded-xl border-2 border-dashed p-6 text-center transition-colors [border-color:var(--app-border)]"
				aria-label="File drop area"
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragOver(false);
					void process(e.dataTransfer.files);
				}}
			>
				<p className="mb-3 text-sm text-[color:var(--app-fg-muted)]">
					Drop files here
				</p>
				<input
					ref={input}
					className="hidden"
					type="file"
					multiple
					accept="text/*,.json,.jsonl,.yaml,.yml,.csv,.xml,.md,.env,.log"
					onChange={(e) => {
						if (e.target.files) void process(e.target.files);
						e.target.value = "";
					}}
				/>
				<Button
					variant="primary"
					disabled={busy}
					onClick={() => input.current?.click()}
				>
					{busy ? "Processing…" : "Choose files"}
				</Button>
			</fieldset>
			{results.length > 0 && (
				<Button
					variant="primary"
					onClick={() =>
						downloadText(
							JSON.stringify(results, null, 2),
							"uutil-batch-results.json",
						)
					}
				>
					Download all results
				</Button>
			)}
			{results.map((r) => (
				<div
					className="rounded-xl border bg-[color:var(--app-surface-alt)] p-3.5 [border-color:var(--app-border)]"
					key={r.id}
				>
					<p className="mb-2 break-words font-medium">{r.name}</p>
					{r.error ? (
						<p role="alert" className="text-sm text-[color:var(--app-danger)]">
							{r.error}
						</p>
					) : (
						<>
							<pre className="uutil-scrollbar mb-3 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[color:var(--app-panel-bg)] p-2.5 text-xs">
								{r.text?.slice(0, 1000)}
								{(r.text?.length ?? 0) > 1000 ? "\n… preview truncated" : ""}
							</pre>
							<Button
								onClick={() =>
									downloadText(r.text ?? "", `${r.name}.result.txt`)
								}
							>
								Download result
							</Button>
						</>
					)}
				</div>
			))}
		</div>
	);
}

function SharePanel() {
	const ws = useWorkspace();
	const [include, setInclude] = useState(false);
	const [url, setUrl] = useState("");
	return (
		<div className="space-y-4">
			<Note>
				Share a tool and its settings. Input is excluded by default. Recipes
				live in the URL fragment, not the query string, and never run
				automatically. Anyone with the link can read included input.
			</Note>
			<CheckField
				label="Include input in the link (review for secrets first)"
				checked={include}
				onChange={(v) => {
					setInclude(v);
					setUrl("");
				}}
			/>
			<Button
				variant="primary"
				onClick={() => {
					try {
						setUrl(
							`${window.location.origin}/tools/${ws.config.current.toolId}${encodeRecipe(ws.config.current.toolId, ws.snapshot(include), include)}`,
						);
					} catch (e) {
						toast.error((e as Error).message);
					}
				}}
			>
				Create recipe link
			</Button>
			{url && (
				<>
					<textarea
						className="ws-input font-mono"
						aria-label="Recipe link"
						rows={4}
						readOnly
						value={url}
					/>
					<Button
						variant="primary"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(url);
								toast.success("Recipe link copied.");
							} catch {
								toast.error(
									"Copy unavailable. Select and copy the link above.",
								);
							}
						}}
					>
						Copy recipe link
					</Button>
				</>
			)}
		</div>
	);
}

function HelpPanel() {
	const ws = useWorkspace();
	const tool = ws.config.current.tools.find(
		(t) => t.id === ws.config.current.toolId,
	);
	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold">{tool?.name}</h3>
			<Note>{tool?.summary}</Note>
			{tool && TOOL_HELP[tool.id] && <Note>{TOOL_HELP[tool.id]}</Note>}
			<ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
				<li>
					Start with the built-in sample, or paste your own input. File tools
					use your chosen local file.
				</li>
				<li>
					Choose options, then select an action or press{" "}
					<kbd className="uutil-kbd">⌘/Ctrl ↵</kbd>. Tools with live results
					update as you type.
				</li>
				<li>Copy, download, or send text results to another tool.</li>
			</ol>
			<Button
				variant="primary"
				onClick={() => {
					const defaults = [...ws.fields.current.values()].map((f) => ({
						...f.initial,
					}));
					const example = TOOL_EXAMPLES[ws.config.current.toolId];
					const firstInput = defaults.find((f) => f.kind === "input");
					if (example && firstInput) firstInput.value = example;
					if (!defaults.length) {
						toast.info(
							"This tool uses a local file. Choose a sample file from your device.",
						);
						return;
					}
					ws.load(ws.config.current.toolId, { fields: defaults });
				}}
			>
				Restore built-in example
			</Button>
			<Note>
				Restoring replaces current inputs and settings. Saved presets are not
				changed. Invalid inputs show a message; they are never executed as code.
				Secret-bearing inputs should not be saved or shared.
			</Note>
			<p className="text-xs text-[color:var(--app-fg-soft)]">
				Keyboard: ⌘/Ctrl K opens tool search. ⌘/Ctrl Enter runs the active tool.
				Escape closes dialogs. Tab moves between controls.
			</p>
		</div>
	);
}

function OfflinePanel() {
	const { offline } = useWorkspace();
	return (
		<div className="space-y-4">
			<Note>
				Prepare the toolkit for use without a connection. This downloads the
				app's code, fonts, and anonymous tool pages—not your inputs. Browser
				storage can be cleared or evicted by your device.
			</Note>
			<p
				className="rounded-xl border bg-[color:var(--app-surface-alt)] p-4 text-sm [border-color:var(--app-border)]"
				role="status"
			>
				{offline.online ? "Online" : "Offline"} · {offline.status}
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="primary"
					disabled={offline.busy || !offline.online}
					onClick={() => void offline.enable()}
				>
					{offline.busy
						? "Preparing…"
						: offline.enabled
							? "Check for updates"
							: "Enable offline mode"}
				</Button>
				{offline.canInstall && (
					<Button
						onClick={() =>
							void offline
								.install()
								.catch(() =>
									toast.error(
										"Installation was unavailable. Use your browser menu.",
									),
								)
						}
					>
						Install app
					</Button>
				)}
				{offline.updateReady && (
					<Button variant="primary" onClick={offline.update}>
						Update app and reload
					</Button>
				)}
				{offline.enabled && (
					<Button
						variant="danger"
						disabled={offline.busy}
						onClick={() => void offline.remove()}
					>
						Remove offline files
					</Button>
				)}
			</div>
			<Note>
				Install from your browser's menu → Install app / Add to Home Screen. On
				iPhone or iPad, use Safari's Share menu → Add to Home Screen.
				Installation availability depends on your browser. Enable offline mode
				before disconnecting.
			</Note>
			<Note>
				Saved presets and scratchpads remain on this device; installing does not
				create an account or sync data.
			</Note>
		</div>
	);
}
