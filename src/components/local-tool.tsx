import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
	defaults,
	execute,
	type Field,
	type LocalTool,
} from "#/lib/local-tools/types";
import { downloadText } from "#/lib/workspace";
import { useWorkspace, useWorkspaceField } from "./workspace";

const control =
	"control-surface w-full min-w-0 rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] p-3 text-base text-[color:var(--app-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)]";
function ToolField({
	field,
	value,
	change,
}: {
	field: Field;
	value: string;
	change: (value: string) => void;
}) {
	const id = useId();
	useWorkspaceField(
		value,
		(next) => change(String(next)),
		field.type ? "setting" : "input",
		field.label,
	);
	return (
		<div className="min-w-0 space-y-2">
			<label htmlFor={id} className="block text-sm font-medium">
				{field.label}
			</label>
			{field.type === "select" ? (
				<select
					id={id}
					className={control}
					value={value}
					onChange={(event) => change(event.target.value)}
				>
					{field.options?.map((option) => (
						<option key={option}>{option}</option>
					))}
				</select>
			) : field.type === "text" ? (
				<input
					id={id}
					className={control}
					value={value}
					onChange={(event) => change(event.target.value)}
					spellCheck={false}
				/>
			) : (
				<textarea
					id={id}
					className={`${control} min-h-44 font-mono text-sm leading-6`}
					rows={7}
					value={value}
					onChange={(event) => change(event.target.value)}
					spellCheck={false}
				/>
			)}
			{field.help && (
				<p className="text-xs leading-5 text-[color:var(--app-fg-muted)]">
					{field.help}
				</p>
			)}
		</div>
	);
}
export function createLocalTool(tool: LocalTool) {
	return function LocalToolPanel() {
		const [values, setValues] = useState(() => defaults(tool));
		const [result, setResult] = useState<string | null>(null);
		const [error, setError] = useState("");
		const outputRef = useRef<HTMLPreElement>(null);
		const { record } = useWorkspace();
		const change = (key: string, value: string) => {
			setValues((current) => ({ ...current, [key]: value }));
			setResult(null);
			setError("");
		};
		const run = () => {
			try {
				setError("");
				setResult(execute(tool, values));
				requestAnimationFrame(() => {
					outputRef.current?.focus({ preventScroll: true });
					outputRef.current?.scrollIntoView({ block: "center" });
				});
				record("Run tool");
			} catch (error) {
				setResult(null);
				setError(
					error instanceof Error
						? error.message
						: "Unable to process this input.",
				);
			}
		};
		return (
			<div className="local-tool grid min-w-0 items-start gap-5 lg:grid-cols-2">
				<section className="tool-card min-w-0 rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] p-4 sm:p-5">
					<h3 className="mb-5 text-sm font-semibold">Input & options</h3>
					<div className="space-y-5">
						{tool.fields.map((field) => (
							<ToolField
								key={field.key}
								field={field}
								value={values[field.key]}
								change={(value) => change(field.key, value)}
							/>
						))}
					</div>
					<div className="mt-5 flex flex-wrap gap-3">
						<button
							type="button"
							className="ws-button action-primary min-h-11"
							data-tool-action="run-tool"
							onClick={run}
						>
							Run tool
						</button>
						<button
							type="button"
							className="ws-button min-h-11"
							onClick={() => {
								setValues(defaults(tool));
								setResult(null);
								setError("");
							}}
						>
							Reset example
						</button>
					</div>
					{error && (
						<p
							role="alert"
							className="mt-4 text-sm text-[color:var(--app-danger)]"
						>
							{error}
						</p>
					)}
					<p className="mt-5 text-xs leading-6 text-[color:var(--app-fg-muted)]">
						{tool.help} Combined input limit: 200,000 characters. Processing
						stays in your browser.
					</p>
				</section>
				<section className="tool-card output-panel min-w-0 rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] p-4 sm:p-5 lg:sticky lg:top-4">
					<div className="mb-4 flex flex-wrap items-center gap-3">
						<h3 className="mr-auto text-sm font-semibold">Result</h3>
						<button
							type="button"
							className="ws-button min-h-11"
							disabled={result === null}
							onClick={async () => {
								try {
									await navigator.clipboard.writeText(result ?? "");
									toast.success("Result copied");
								} catch {
									toast.error(
										"Clipboard unavailable. Select and copy the result manually.",
									);
								}
							}}
						>
							Copy result
						</button>
						<button
							type="button"
							className="ws-button min-h-11"
							disabled={result === null}
							onClick={() => downloadText(result ?? "", tool.filename)}
						>
							Download result
						</button>
					</div>
					<p
						role="status"
						className="mb-3 text-xs text-[color:var(--app-fg-muted)]"
					>
						{result === null
							? "Run the tool to see results."
							: `${result.length.toLocaleString()} characters · ready to copy or download`}
					</p>
					<pre
						ref={outputRef}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: Enable keyboard scrolling of long results.
						tabIndex={0}
						className="max-h-[65vh] min-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[color:var(--app-surface-alt)] p-4 font-mono text-[13px] leading-6"
					>
						{result ?? "Your result will appear here."}
					</pre>
				</section>
			</div>
		);
	};
}
