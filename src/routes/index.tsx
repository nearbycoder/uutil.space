import { parseDiffFromFile } from "@pierre/diffs";
import { FileDiff as PierreFileDiff } from "@pierre/diffs/react";
import {
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import Color from "color";
import { CronExpressionParser } from "cron-parser";
import CryptoJS from "crypto-js";
import he from "he";
import yaml from "js-yaml";
import JsonToTS from "json-to-ts";
import jsQR from "jsqr";
import {
	ArrowLeftRight,
	Binary,
	Braces,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock3,
	Command,
	Diff,
	FileSearch,
	Fingerprint,
	Globe,
	Hash,
	Image as ImageIcon,
	Link2,
	ListFilter,
	Lock,
	type LucideIcon,
	Menu,
	Monitor,
	Moon,
	Palette,
	QrCode,
	Regex,
	Search,
	Shield,
	Sparkles,
	Sun,
	Type,
	Wand2,
	X,
} from "lucide-react";
import { marked } from "marked";
import Papa from "papaparse";
import PhpParser from "php-parser";
import { isSerialized, serialize, unserialize } from "php-serialize";
import * as prettierBabelPlugin from "prettier/plugins/babel";
import * as prettierEstreePlugin from "prettier/plugins/estree";
import * as prettierHtmlPlugin from "prettier/plugins/html";
import * as prettierPostcssPlugin from "prettier/plugins/postcss";
import { format as formatPrettier } from "prettier/standalone";
import QRCode from "qrcode";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { bundledThemes } from "shiki/themes";
import { Toaster, toast } from "sonner";
import type { SqlLanguage } from "sql-formatter";
import { format as formatSql } from "sql-formatter";
import { minify as minifyJs } from "terser";
import { decodeTime, ulid } from "ulid";
import {
	parse as parseUuid,
	v4,
	v7,
	validate as validateUuid,
	version,
} from "uuid";
import vkbeautify from "vkbeautify";
import xmlFormat from "xml-formatter";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "#/components/ui/resizable";

export const Route = createFileRoute("/")({ component: HomeRouteComponent });

function HomeRouteComponent() {
	return <ToolingApp />;
}

type ToolCategory =
	| "Core"
	| "Encoding"
	| "Formatting"
	| "Conversion"
	| "Security"
	| "Generators"
	| "Parsing";

type ToolDefinition = {
	id: string;
	name: string;
	category: ToolCategory;
	summary: string;
	component: () => React.ReactElement;
};

type ToolTooltipState = {
	name: string;
	summary: string;
	x: number;
	y: number;
};

type AppCssVariables = React.CSSProperties &
	Record<`--${string}`, string | number | undefined>;

const phpEngine = new PhpParser.Engine({
	parser: {
		extractDoc: false,
		php7: true,
		suppressErrors: true,
	},
	ast: {
		withPositions: false,
	},
});

const TOOL_REGISTRY: ToolDefinition[] = [
	{
		id: "unix-time-converter",
		name: "Unix Time Converter",
		category: "Core",
		summary:
			"Convert between unix seconds/milliseconds and readable date-time.",
		component: UnixTimeConverterTool,
	},
	{
		id: "json-format-validate",
		name: "JSON Format/Validate",
		category: "Core",
		summary: "Pretty print, minify, and validate JSON payloads.",
		component: JsonFormatValidateTool,
	},
	{
		id: "base64-string",
		name: "Base64 String Encode/Decode",
		category: "Encoding",
		summary: "Encode plain text to base64 and decode base64 back to text.",
		component: Base64StringTool,
	},
	{
		id: "base64-image",
		name: "Base64 Image Encode/Decode",
		category: "Encoding",
		summary: "Convert images to base64 strings and preview decoded image data.",
		component: Base64ImageTool,
	},
	{
		id: "jwt-debugger",
		name: "JWT Debugger",
		category: "Security",
		summary: "Decode JWT header/payload and inspect expiration metadata.",
		component: JwtDebuggerTool,
	},
	{
		id: "regexp-tester",
		name: "RegExp Tester",
		category: "Parsing",
		summary: "Test regex patterns against text with match offsets.",
		component: RegexTesterTool,
	},
	{
		id: "url-encode-decode",
		name: "URL Encode/Decode",
		category: "Encoding",
		summary: "Escape URL-safe strings and decode encoded values.",
		component: UrlEncodeDecodeTool,
	},
	{
		id: "url-parser",
		name: "URL Parser",
		category: "Parsing",
		summary: "Break URL into protocol, host, query params, and hash.",
		component: UrlParserTool,
	},
	{
		id: "html-entity",
		name: "HTML Entity Encode/Decode",
		category: "Encoding",
		summary: "Convert between symbols and HTML entities.",
		component: HtmlEntityTool,
	},
	{
		id: "backslash-escape",
		name: "Backslash Escape/Unescape",
		category: "Encoding",
		summary: "Escape special characters and unescape escaped strings.",
		component: BackslashTool,
	},
	{
		id: "uuid-ulid",
		name: "UUID/ULID Generate/Decode",
		category: "Generators",
		summary: "Generate UUID/ULID values and decode timestamps.",
		component: UuidUlidTool,
	},
	{
		id: "html-preview",
		name: "HTML Preview",
		category: "Core",
		summary: "Render raw HTML in a sandboxed preview pane.",
		component: HtmlPreviewTool,
	},
	{
		id: "text-diff",
		name: "Text Diff Checker",
		category: "Core",
		summary: "Compare two text blocks with added/removed highlights.",
		component: TextDiffTool,
	},
	{
		id: "yaml-to-json",
		name: "YAML to JSON",
		category: "Conversion",
		summary: "Convert YAML documents into JSON output.",
		component: YamlToJsonTool,
	},
	{
		id: "json-to-yaml",
		name: "JSON to YAML",
		category: "Conversion",
		summary: "Convert JSON payloads into YAML.",
		component: JsonToYamlTool,
	},
	{
		id: "number-base",
		name: "Number Base Converter",
		category: "Conversion",
		summary: "Convert numbers between binary, octal, decimal, and hex.",
		component: NumberBaseTool,
	},
	{
		id: "html-beautify-minify",
		name: "HTML Beautify/Minify",
		category: "Formatting",
		summary: "Format or minify HTML markup.",
		component: HtmlBeautifyMinifyTool,
	},
	{
		id: "css-beautify-minify",
		name: "CSS Beautify/Minify",
		category: "Formatting",
		summary: "Format or compress CSS.",
		component: CssBeautifyMinifyTool,
	},
	{
		id: "js-beautify-minify",
		name: "JS Beautify/Minify",
		category: "Formatting",
		summary: "Format JavaScript or minify with terser.",
		component: JsBeautifyMinifyTool,
	},
	{
		id: "erb-beautify-minify",
		name: "ERB Beautify/Minify",
		category: "Formatting",
		summary: "Beautify/minify ERB templates with indentation heuristics.",
		component: ErbBeautifyMinifyTool,
	},
	{
		id: "less-beautify-minify",
		name: "LESS Beautify/Minify",
		category: "Formatting",
		summary: "Format and compact LESS source.",
		component: LessBeautifyMinifyTool,
	},
	{
		id: "scss-beautify-minify",
		name: "SCSS Beautify/Minify",
		category: "Formatting",
		summary: "Format and compact SCSS source.",
		component: ScssBeautifyMinifyTool,
	},
	{
		id: "xml-beautify-minify",
		name: "XML Beautify/Minify",
		category: "Formatting",
		summary: "Pretty print XML or minify to a single line.",
		component: XmlBeautifyMinifyTool,
	},
	{
		id: "lorem-ipsum",
		name: "Lorem Ipsum Generator",
		category: "Generators",
		summary: "Generate filler paragraphs, words, and sentences.",
		component: LoremIpsumTool,
	},
	{
		id: "qr-reader-generator",
		name: "QR Code Reader/Generator",
		category: "Generators",
		summary: "Generate QR from text and decode QR from uploaded images.",
		component: QrCodeTool,
	},
	{
		id: "string-inspector",
		name: "String Inspector",
		category: "Core",
		summary: "Inspect counts for characters, words, bytes, and classes.",
		component: StringInspectorTool,
	},
	{
		id: "json-to-csv",
		name: "JSON to CSV",
		category: "Conversion",
		summary: "Convert JSON arrays/objects to CSV.",
		component: JsonToCsvTool,
	},
	{
		id: "csv-to-json",
		name: "CSV to JSON",
		category: "Conversion",
		summary: "Convert CSV rows to JSON objects.",
		component: CsvToJsonTool,
	},
	{
		id: "hash-generator",
		name: "Hash Generator",
		category: "Security",
		summary: "Generate MD5/SHA hashes from text.",
		component: HashGeneratorTool,
	},
	{
		id: "html-to-jsx",
		name: "HTML to JSX",
		category: "Conversion",
		summary: "Transform HTML into JSX.",
		component: HtmlToJsxTool,
	},
	{
		id: "markdown-preview",
		name: "Markdown Preview",
		category: "Core",
		summary: "Render markdown and inspect resulting HTML.",
		component: MarkdownPreviewTool,
	},
	{
		id: "sql-formatter",
		name: "SQL Formatter",
		category: "Formatting",
		summary: "Format SQL queries with dialect support.",
		component: SqlFormatterTool,
	},
	{
		id: "string-case-converter",
		name: "String Case Converter",
		category: "Conversion",
		summary: "Convert strings to camel, snake, kebab, title, and more.",
		component: StringCaseConverterTool,
	},
	{
		id: "cron-job-parser",
		name: "Cron Job Parser",
		category: "Parsing",
		summary: "Inspect cron syntax and preview upcoming run times.",
		component: CronJobParserTool,
	},
	{
		id: "color-converter",
		name: "Color Converter",
		category: "Conversion",
		summary: "Convert a color across HEX, RGB, HSL, and HSV.",
		component: ColorConverterTool,
	},
	{
		id: "php-to-json",
		name: "PHP to JSON",
		category: "Conversion",
		summary: "Convert PHP arrays/literals or serialized PHP into JSON.",
		component: PhpToJsonTool,
	},
	{
		id: "json-to-php",
		name: "JSON to PHP",
		category: "Conversion",
		summary: "Convert JSON to PHP array syntax.",
		component: JsonToPhpTool,
	},
	{
		id: "php-serializer",
		name: "PHP Serializer",
		category: "Conversion",
		summary: "Serialize JSON values into PHP serialized strings.",
		component: PhpSerializerTool,
	},
	{
		id: "php-unserializer",
		name: "PHP Unserializer",
		category: "Conversion",
		summary: "Unserialize PHP-serialized strings into JSON.",
		component: PhpUnserializerTool,
	},
	{
		id: "random-string",
		name: "Random String Generator",
		category: "Generators",
		summary: "Create random tokens with configurable character sets.",
		component: RandomStringTool,
	},
	{
		id: "svg-to-css",
		name: "SVG to CSS",
		category: "Conversion",
		summary: "Convert SVG markup into CSS data-URI declarations.",
		component: SvgToCssTool,
	},
	{
		id: "curl-to-code",
		name: "cURL to Code",
		category: "Conversion",
		summary: "Convert cURL commands into source code snippets.",
		component: CurlToCodeTool,
	},
	{
		id: "json-to-code",
		name: "JSON to Code",
		category: "Conversion",
		summary: "Generate TypeScript interfaces from JSON.",
		component: JsonToCodeTool,
	},
	{
		id: "certificate-decoder",
		name: "Certificate Decoder (X.509)",
		category: "Security",
		summary: "Inspect metadata from PEM X.509 certificates.",
		component: CertificateDecoderTool,
	},
	{
		id: "hex-to-ascii",
		name: "Hex to ASCII",
		category: "Encoding",
		summary: "Convert hex bytes into readable text.",
		component: HexToAsciiTool,
	},
	{
		id: "ascii-to-hex",
		name: "ASCII to Hex",
		category: "Encoding",
		summary: "Convert text into hex bytes.",
		component: AsciiToHexTool,
	},
	{
		id: "line-sort-dedupe",
		name: "Line Sort/Dedupe",
		category: "Core",
		summary: "Sort lines, remove duplicates, and clean whitespace.",
		component: LineSortDedupeTool,
	},
];

const TOOL_IDS = new Set(TOOL_REGISTRY.map((tool) => tool.id));
const DEFAULT_TOOL_ID = TOOL_REGISTRY[0]?.id ?? "unix-time-converter";

type ShikiThemeModel = {
	type?: "light" | "dark";
	colors?: Record<string, string | undefined>;
	name?: string;
	displayName?: string;
};

const DARK_THEME_ID = "github-dark";
const LIGHT_THEME_ID = "github-light";
const DEFAULT_THEME_ID = DARK_THEME_ID;
const AVAILABLE_THEME_IDS = new Set([DARK_THEME_ID, LIGHT_THEME_ID]);
const THEME_STORAGE_KEY = "uutil.shiki.theme";
const THEME_VARS_STORAGE_KEY = "uutil.shiki.theme-vars";
const NAV_EXPANDED_STORAGE_KEY = "uutil.nav.expanded";
const UNIX_IO_LAYOUT_COOKIE_KEY = "uutil.layout.unix-io";
const UNIX_IO_PANEL_IDS = ["unix-input", "unix-output"] as const;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const themeCache = new Map<string, ShikiThemeModel>();
type PanelLayout = Record<string, number>;

const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
	Core: Monitor,
	Encoding: Binary,
	Formatting: Wand2,
	Conversion: ArrowLeftRight,
	Security: Shield,
	Generators: Sparkles,
	Parsing: FileSearch,
};
const PALETTE_CATEGORY_ORDER: ToolCategory[] = [
	"Core",
	"Encoding",
	"Security",
	"Parsing",
	"Formatting",
	"Conversion",
	"Generators",
];

function getToolIcon(tool: ToolDefinition): LucideIcon {
	const id = tool.id;

	if (id.includes("json") || id.includes("yaml") || id.includes("php")) {
		return Braces;
	}
	if (id.includes("url")) {
		return Link2;
	}
	if (id.includes("base64-image") || id.includes("svg")) {
		return ImageIcon;
	}
	if (
		id.includes("base64") ||
		id.includes("hex") ||
		id.includes("ascii") ||
		id.includes("entity") ||
		id.includes("escape")
	) {
		return Binary;
	}
	if (id.includes("jwt") || id.includes("certificate")) {
		return Lock;
	}
	if (id.includes("hash")) {
		return Fingerprint;
	}
	if (id.includes("uuid") || id.includes("random") || id.includes("lorem")) {
		return Sparkles;
	}
	if (id.includes("qr")) {
		return QrCode;
	}
	if (id.includes("cron") || id.includes("unix-time")) {
		return Clock3;
	}
	if (id.includes("regex")) {
		return Regex;
	}
	if (id.includes("diff")) {
		return Diff;
	}
	if (id.includes("preview")) {
		return Monitor;
	}
	if (id.includes("beautify") || id.includes("formatter")) {
		return Wand2;
	}
	if (id.includes("case") || id.includes("string")) {
		return Type;
	}
	if (id.includes("parser")) {
		return FileSearch;
	}
	if (id.includes("color")) {
		return Palette;
	}
	if (id.includes("code")) {
		return Command;
	}
	if (id.includes("line-sort")) {
		return ListFilter;
	}
	if (id.includes("html")) {
		return Globe;
	}
	if (id.includes("number")) {
		return Hash;
	}

	return CATEGORY_ICONS[tool.category];
}

function readCookieValue(name: string) {
	if (typeof document === "undefined") {
		return null;
	}

	const encodedName = `${name}=`;
	const parts = document.cookie ? document.cookie.split("; ") : [];
	for (const part of parts) {
		if (!part.startsWith(encodedName)) {
			continue;
		}

		const rawValue = part.slice(encodedName.length);
		try {
			return decodeURIComponent(rawValue);
		} catch {
			return rawValue;
		}
	}

	return null;
}

function writeCookieValue(name: string, value: string) {
	if (typeof document === "undefined") {
		return;
	}

	document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function readJsonCookie<T>(name: string) {
	const cookieValue = readCookieValue(name);
	if (!cookieValue) {
		return null;
	}

	try {
		return JSON.parse(cookieValue) as T;
	} catch {
		return null;
	}
}

function normalizePanelLayout(
	layout: unknown,
	panelIds: readonly string[],
): PanelLayout | undefined {
	if (!layout || typeof layout !== "object") {
		return undefined;
	}

	const normalized: PanelLayout = {};
	for (const panelId of panelIds) {
		const value = (layout as Record<string, unknown>)[panelId];
		if (typeof value !== "number" || !Number.isFinite(value)) {
			return undefined;
		}
		normalized[panelId] = value;
	}

	const total = panelIds.reduce((sum, panelId) => sum + normalized[panelId], 0);
	if (total <= 0) {
		return undefined;
	}

	return normalized;
}

function usePersistedPanelLayout(
	cookieKey: string,
	panelIds: readonly string[],
) {
	const defaultLayout = useMemo(
		() => normalizePanelLayout(readJsonCookie<unknown>(cookieKey), panelIds),
		[cookieKey, panelIds],
	);

	const onLayoutChanged = useCallback(
		(layout: PanelLayout) => {
			const normalizedLayout = normalizePanelLayout(layout, panelIds);
			if (!normalizedLayout) {
				return;
			}
			writeCookieValue(cookieKey, JSON.stringify(normalizedLayout));
		},
		[cookieKey, panelIds],
	);

	return { defaultLayout, onLayoutChanged };
}

const DEFAULT_THEME_VARS = {
	colorScheme: "dark",
	backgroundColor: "#060a12",
	color: "#e7edf6",
	"--app-bg": "#060a12",
	"--app-sidebar-bg": "rgba(11, 16, 25, 0.94)",
	"--app-sidebar-fg": "#e7edf6",
	"--app-sidebar-fg-muted": "#c5d2e4",
	"--app-sidebar-fg-soft": "#9eb0c7",
	"--app-panel-bg": "rgba(16, 23, 34, 0.9)",
	"--app-surface-bg": "rgba(20, 30, 44, 0.94)",
	"--app-surface-alt": "rgba(11, 18, 30, 0.97)",
	"--app-border": "rgba(123, 143, 170, 0.56)",
	"--app-border-strong": "rgba(140, 161, 188, 0.74)",
	"--app-fg": "#e7edf6",
	"--app-fg-muted": "#c5d2e4",
	"--app-fg-soft": "#9eb0c7",
	"--app-accent": "#62afff",
	"--app-accent-soft": "rgba(98, 175, 255, 0.22)",
	"--app-accent-strong": "#9acbff",
	"--app-danger": "#ff8b9f",
	"--app-success": "#71e4b6",
	"--app-overlay": "rgba(2, 8, 18, 0.62)",
	"--app-shadow": "rgba(2, 8, 18, 0.78)",
	"--app-glow-1": "rgba(98, 175, 255, 0.25)",
	"--app-glow-2": "rgba(111, 220, 179, 0.15)",
	"--app-ring": "rgba(98, 175, 255, 0.65)",
} satisfies AppCssVariables;

const LIGHT_THEME_VARS = {
	colorScheme: "light",
	backgroundColor: "#eff4fb",
	color: "#0f172a",
	"--app-bg": "#eff4fb",
	"--app-sidebar-bg": "rgba(229, 238, 248, 0.95)",
	"--app-sidebar-fg": "#0f172a",
	"--app-sidebar-fg-muted": "#334155",
	"--app-sidebar-fg-soft": "#475569",
	"--app-panel-bg": "rgba(255, 255, 255, 0.97)",
	"--app-surface-bg": "rgba(255, 255, 255, 0.99)",
	"--app-surface-alt": "rgba(247, 251, 255, 1)",
	"--app-border": "rgba(71, 85, 105, 0.52)",
	"--app-border-strong": "rgba(71, 85, 105, 0.68)",
	"--app-fg": "#0f172a",
	"--app-fg-muted": "#334155",
	"--app-fg-soft": "#475569",
	"--app-accent": "#2563eb",
	"--app-accent-soft": "rgba(37, 99, 235, 0.18)",
	"--app-accent-strong": "#1d4ed8",
	"--app-danger": "#dc2626",
	"--app-success": "#047857",
	"--app-overlay": "rgba(226, 232, 240, 0.6)",
	"--app-shadow": "rgba(15, 23, 42, 0.24)",
	"--app-glow-1": "rgba(37, 99, 235, 0.14)",
	"--app-glow-2": "rgba(4, 120, 87, 0.14)",
	"--app-ring": "rgba(37, 99, 235, 0.68)",
} satisfies AppCssVariables;

function getThemeFallbackVars(themeId: string): AppCssVariables {
	return themeId === LIGHT_THEME_ID ? LIGHT_THEME_VARS : DEFAULT_THEME_VARS;
}

type AppThemeState = {
	themeId: string;
	themeType: "light" | "dark";
};

type ToolQueryState = {
	key: string;
	inputs: string[];
	action: string | null;
	autoRun: boolean;
};

type ToolQueryRuntime = {
	queryKey: string;
	inputs: string[];
	action: string | null;
	autoRun: boolean;
	registerInput: () => number;
	registerAction: () => number;
	consumeAutoRun: () => boolean;
};

const AppThemeContext = createContext<AppThemeState>({
	themeId: DEFAULT_THEME_ID,
	themeType: "dark",
});

const ToolQueryContext = createContext<ToolQueryRuntime | null>(null);

function useAppTheme() {
	return useContext(AppThemeContext);
}

function parseToolQueryState(searchStr: string): ToolQueryState {
	const params = new URLSearchParams(
		searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
	);

	const inputs: string[] = [];
	if (params.has("input")) {
		inputs.push(params.get("input") ?? "");
	}

	for (let index = 2; index <= 6; index += 1) {
		const key = `input${index}`;
		if (params.has(key)) {
			inputs.push(params.get(key) ?? "");
		}
	}

	if (inputs.length === 0) {
		const rawInputs = params.get("inputs");
		if (rawInputs) {
			try {
				const parsed = JSON.parse(rawInputs) as unknown;
				if (Array.isArray(parsed)) {
					for (const item of parsed) {
						if (typeof item === "string") {
							inputs.push(item);
						}
					}
				}
			} catch {
				// Ignore invalid JSON.
			}
		}
	}

	const action = params.get("action")?.trim() || null;
	const runRaw = params.get("autorun") ?? params.get("run");
	const runNormalized = runRaw?.trim().toLowerCase() ?? null;
	const autoRun =
		runNormalized == null
			? inputs.length > 0
			: !["0", "false", "no", "off"].includes(runNormalized);

	return {
		key: searchStr,
		inputs,
		action,
		autoRun,
	};
}

function normalizeActionLabel(label: string) {
	return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function applyThemeVarsToDocument(vars: AppCssVariables) {
	if (typeof document === "undefined") {
		return;
	}

	const style = document.documentElement.style;
	if (typeof vars.colorScheme === "string") {
		style.colorScheme = vars.colorScheme;
	}
	if (typeof vars.backgroundColor === "string") {
		style.backgroundColor = vars.backgroundColor;
	}
	if (typeof vars.color === "string") {
		style.color = vars.color;
	}

	for (const [key, value] of Object.entries(vars)) {
		if (!key.startsWith("--") || value == null) {
			continue;
		}
		style.setProperty(key, String(value));
	}
}

function withAlpha(colorValue: string, alpha: number, fallback: string) {
	try {
		return Color(colorValue).alpha(alpha).rgb().string();
	} catch {
		return fallback;
	}
}

function flattenColorOn(
	colorValue: string,
	backgroundValue: string,
	fallback: string,
) {
	try {
		const foregroundColor = Color(colorValue).rgb();
		const backgroundColor = Color(backgroundValue).rgb();
		const alpha = Math.max(0, Math.min(1, foregroundColor.alpha()));
		if (alpha >= 0.999) {
			return foregroundColor.string();
		}

		const [fr = 0, fg = 0, fb = 0] = foregroundColor.array();
		const [br = 0, bg = 0, bb = 0] = backgroundColor.array();

		return Color.rgb(
			Math.round(fr * alpha + br * (1 - alpha)),
			Math.round(fg * alpha + bg * (1 - alpha)),
			Math.round(fb * alpha + bb * (1 - alpha)),
		).string();
	} catch {
		return fallback;
	}
}

function colorLuminosity(colorValue: string, fallback: number) {
	try {
		return Color(colorValue).luminosity();
	} catch {
		return fallback;
	}
}

function contrastRatio(
	foreground: string,
	background: string,
	fallback: number,
) {
	try {
		const fgLum = Color(foreground).luminosity();
		const bgLum = Color(background).luminosity();
		const lighter = Math.max(fgLum, bgLum);
		const darker = Math.min(fgLum, bgLum);
		return (lighter + 0.05) / (darker + 0.05);
	} catch {
		return fallback;
	}
}

function enforceContrast(
	foreground: string,
	background: string,
	minimumContrast: number,
	fallback: string,
) {
	return contrastRatio(foreground, background, minimumContrast) >=
		minimumContrast
		? foreground
		: fallback;
}

function pickThemeColor(
	colors: Record<string, string | undefined> | undefined,
	candidates: string[],
	fallback: string,
) {
	for (const candidate of candidates) {
		const color = colors?.[candidate];
		if (typeof color === "string" && color.trim().length > 0) {
			return color;
		}
	}
	return fallback;
}

function resolveThemeVariables(theme: ShikiThemeModel): AppCssVariables {
	const mode = theme.type === "light" ? "light" : "dark";
	const colors = theme.colors ?? {};
	const lightMutedFallback = "#334155";
	const lightSoftFallback = "#475569";

	const backgroundCandidate = pickThemeColor(
		colors,
		["editor.background", "activityBar.background", "sideBar.background"],
		mode === "light" ? "#f8fafc" : "#080b10",
	);
	const backgroundBase = flattenColorOn(
		backgroundCandidate,
		mode === "light" ? "#ffffff" : "#080b10",
		mode === "light" ? "#f8fafc" : "#080b10",
	);
	const backgroundLuminosity = colorLuminosity(
		backgroundBase,
		mode === "light" ? 0.96 : 0.04,
	);
	const background =
		mode === "light" && backgroundLuminosity < 0.52
			? "#f8fafc"
			: mode === "dark" && backgroundLuminosity > 0.5
				? "#080b10"
				: backgroundBase;
	const foregroundCandidate = pickThemeColor(
		colors,
		["editor.foreground", "foreground"],
		mode === "light" ? "#111827" : "#e4e8ee",
	);
	const foregroundSource = flattenColorOn(
		foregroundCandidate,
		background,
		mode === "light" ? "#111827" : "#e4e8ee",
	);
	const foreground = enforceContrast(
		foregroundSource,
		background,
		mode === "light" ? 6.4 : 5.8,
		mode === "light" ? "#0f172a" : "#e7edf6",
	);
	const panelCandidate = pickThemeColor(
		colors,
		["panel.background", "editorWidget.background", "sideBar.background"],
		withAlpha(
			background,
			mode === "light" ? 0.94 : 0.88,
			mode === "light" ? "rgba(255,255,255,0.94)" : "rgba(16,23,34,0.88)",
		),
	);
	const panelCandidateFlat = flattenColorOn(
		panelCandidate,
		background,
		mode === "light" ? "rgb(248,250,252)" : "rgb(17,23,31)",
	);
	const panel =
		mode === "light" && colorLuminosity(panelCandidateFlat, 0.9) < 0.52
			? flattenColorOn(
					withAlpha(background, 0.9, "rgba(248,250,252,0.9)"),
					background,
					"rgb(248,250,252)",
				)
			: mode === "dark" && colorLuminosity(panelCandidateFlat, 0.08) > 0.56
				? flattenColorOn(
						withAlpha(background, 0.88, "rgba(16,23,34,0.88)"),
						background,
						"rgb(16,23,34)",
					)
				: panelCandidateFlat;
	const surfaceCandidate = pickThemeColor(
		colors,
		[
			"editorGroupHeader.tabsBackground",
			"editorGroupHeader.noTabsBackground",
			"tab.activeBackground",
		],
		withAlpha(
			background,
			mode === "light" ? 0.99 : 0.95,
			mode === "light" ? "rgba(255,255,255,0.99)" : "rgba(20,30,44,0.95)",
		),
	);
	const surfaceCandidateFlat = flattenColorOn(
		surfaceCandidate,
		background,
		mode === "light" ? "#ffffff" : "rgb(21,28,38)",
	);
	const surface =
		mode === "light" && colorLuminosity(surfaceCandidateFlat, 0.95) < 0.55
			? flattenColorOn(
					withAlpha(background, 0.96, "rgba(255,255,255,0.96)"),
					background,
					"#ffffff",
				)
			: mode === "dark" && colorLuminosity(surfaceCandidateFlat, 0.1) > 0.58
				? flattenColorOn(
						withAlpha(background, 0.95, "rgba(20,30,44,0.95)"),
						background,
						"rgb(20,30,44)",
					)
				: surfaceCandidateFlat;
	const surfaceAltCandidate = pickThemeColor(
		colors,
		["editorWidget.background", "input.background", "dropdown.background"],
		withAlpha(
			background,
			mode === "light" ? 1 : 0.98,
			mode === "light" ? "rgba(247,251,255,1)" : "rgba(11,18,30,0.98)",
		),
	);
	const surfaceAltCandidateFlat = flattenColorOn(
		surfaceAltCandidate,
		background,
		mode === "light" ? "#ffffff" : "rgb(10,15,24)",
	);
	const surfaceAlt =
		mode === "light" && colorLuminosity(surfaceAltCandidateFlat, 0.98) < 0.58
			? flattenColorOn(
					withAlpha(background, 1, "rgba(255,255,255,1)"),
					background,
					"#ffffff",
				)
			: mode === "dark" && colorLuminosity(surfaceAltCandidateFlat, 0.08) > 0.6
				? flattenColorOn(
						withAlpha(background, 0.98, "rgba(11,18,30,0.98)"),
						background,
						"rgb(11,18,30)",
					)
				: surfaceAltCandidateFlat;
	const border = pickThemeColor(
		colors,
		["panel.border", "sideBar.border", "editorGroup.border"],
		mode === "light" ? "rgba(71,85,105,0.52)" : "rgba(123,143,170,0.5)",
	);
	const borderStrong = pickThemeColor(
		colors,
		["contrastBorder", "focusBorder", "input.border", "commandCenter.border"],
		mode === "light" ? "rgba(71,85,105,0.68)" : "rgba(140,161,188,0.68)",
	);
	const accent = pickThemeColor(
		colors,
		["focusBorder", "textLink.foreground", "button.background"],
		mode === "light" ? "#2563eb" : "#5aa8ff",
	);
	const accentStrong = pickThemeColor(
		colors,
		[
			"button.foreground",
			"textLink.activeForeground",
			"editorCursor.foreground",
		],
		mode === "light" ? "#1d4ed8" : "#8ec3ff",
	);
	const darkMutedFallback = flattenColorOn(
		withAlpha(foreground, 0.8, "rgba(197,210,228,0.8)"),
		background,
		"#c5d2e4",
	);
	const muted = pickThemeColor(
		colors,
		["descriptionForeground", "disabledForeground", "sideBar.foreground"],
		mode === "light" ? lightMutedFallback : darkMutedFallback,
	);
	const darkSoftFallback = flattenColorOn(
		withAlpha(foreground, 0.68, "rgba(158,176,199,0.68)"),
		background,
		"#9eb0c7",
	);
	const soft = pickThemeColor(
		colors,
		[
			"widget.shadow",
			"panelTitle.inactiveForeground",
			"tab.inactiveForeground",
		],
		mode === "light" ? lightSoftFallback : darkSoftFallback,
	);
	const success = pickThemeColor(
		colors,
		["terminal.ansiGreen", "gitDecoration.addedResourceForeground"],
		mode === "light" ? "#047857" : "#71e4b6",
	);
	const danger = pickThemeColor(
		colors,
		["terminal.ansiRed", "gitDecoration.deletedResourceForeground"],
		mode === "light" ? "#dc2626" : "#ff8b9f",
	);
	const sidebarBase = pickThemeColor(
		colors,
		["sideBar.background"],
		background,
	);
	const sidebarSource =
		mode === "light" && colorLuminosity(sidebarBase, 0.96) < 0.52
			? background
			: sidebarBase;
	const sidebarBackground = flattenColorOn(
		withAlpha(
			sidebarSource,
			mode === "light" ? 0.92 : 0.9,
			mode === "light" ? "rgba(248,250,252,0.92)" : "rgba(11,15,21,0.9)",
		),
		background,
		mode === "light" ? "rgb(248,250,252)" : "rgb(11,15,21)",
	);
	const sidebarForeground = enforceContrast(
		flattenColorOn(
			pickThemeColor(colors, ["sideBar.foreground", "foreground"], foreground),
			sidebarBackground,
			mode === "light" ? "#111827" : "#e4e8ee",
		),
		sidebarBackground,
		4.5,
		mode === "light" ? "#111827" : "#e4e8ee",
	);
	const sidebarMutedFallback =
		mode === "light"
			? lightMutedFallback
				: flattenColorOn(
					withAlpha(sidebarForeground, 0.82, "rgba(197,210,228,0.82)"),
					sidebarBackground,
					"#c5d2e4",
				);
	const sidebarMuted = enforceContrast(
		flattenColorOn(
			mode === "light"
				? pickThemeColor(colors, ["descriptionForeground"], lightMutedFallback)
				: withAlpha(
						pickThemeColor(colors, ["descriptionForeground"], sidebarForeground),
						0.82,
						"rgba(197,210,228,0.82)",
					),
			sidebarBackground,
			sidebarMutedFallback,
		),
		sidebarBackground,
		mode === "light" ? 6.6 : 4.2,
		sidebarMutedFallback,
	);
	const sidebarSoftFallback =
		mode === "light"
			? lightSoftFallback
				: flattenColorOn(
					withAlpha(sidebarForeground, 0.68, "rgba(158,176,199,0.68)"),
					sidebarBackground,
					"#9eb0c7",
				);
	const sidebarSoft = enforceContrast(
		flattenColorOn(
			mode === "light"
				? pickThemeColor(
						colors,
						["panelTitle.inactiveForeground"],
						lightSoftFallback,
					)
				: withAlpha(
						pickThemeColor(
							colors,
							["panelTitle.inactiveForeground"],
							sidebarForeground,
						),
						0.68,
						"rgba(158,176,199,0.68)",
					),
			sidebarBackground,
			sidebarSoftFallback,
		),
		sidebarBackground,
		mode === "light" ? 5.8 : 3.8,
		sidebarSoftFallback,
	);
	const mutedReadable = enforceContrast(
		flattenColorOn(muted, background, mode === "light" ? lightMutedFallback : darkMutedFallback),
		background,
		mode === "light" ? 6.6 : 4.2,
		mode === "light" ? lightMutedFallback : darkMutedFallback,
	);
	const softReadable = enforceContrast(
		flattenColorOn(soft, background, mode === "light" ? lightSoftFallback : darkSoftFallback),
		background,
		mode === "light" ? 5.8 : 3.8,
		mode === "light" ? lightSoftFallback : darkSoftFallback,
	);
	const borderColor = flattenColorOn(
		withAlpha(
			border,
			mode === "light" ? 0.74 : 0.58,
			mode === "light" ? "rgba(71,85,105,0.74)" : "rgba(123,143,170,0.58)",
		),
		background,
		mode === "light" ? "rgb(71,85,105)" : "rgb(123,143,170)",
	);
	const borderStrongColor = flattenColorOn(
		withAlpha(
			borderStrong,
			mode === "light" ? 0.92 : 0.78,
			mode === "light" ? "rgba(71,85,105,0.92)" : "rgba(140,161,188,0.78)",
		),
		background,
		mode === "light" ? "rgb(71,85,105)" : "rgb(140,161,188)",
	);

	return {
		colorScheme: mode,
		backgroundColor: background,
		color: foreground,
		"--app-bg": background,
		"--app-sidebar-bg": sidebarBackground,
		"--app-sidebar-fg": sidebarForeground,
		"--app-sidebar-fg-muted": sidebarMuted,
		"--app-sidebar-fg-soft": sidebarSoft,
		"--app-panel-bg": panel,
		"--app-surface-bg": surface,
		"--app-surface-alt": surfaceAlt,
		"--app-border": borderColor,
		"--app-border-strong": borderStrongColor,
		"--app-fg": foreground,
		"--app-fg-muted": mutedReadable,
		"--app-fg-soft": softReadable,
		"--app-accent": accent,
		"--app-accent-soft": withAlpha(
			accent,
			0.2,
			mode === "light" ? "rgba(37,99,235,0.2)" : "rgba(90,168,255,0.2)",
		),
		"--app-accent-strong": accentStrong,
		"--app-danger": danger,
		"--app-success": success,
		"--app-overlay": withAlpha(
			background,
			mode === "light" ? 0.6 : 0.64,
			mode === "light" ? "rgba(226,232,240,0.6)" : "rgba(2,8,18,0.64)",
		),
		"--app-shadow": withAlpha(
			background,
			mode === "light" ? 0.35 : 0.76,
			mode === "light" ? "rgba(15,23,42,0.35)" : "rgba(2,8,18,0.76)",
		),
		"--app-glow-1": withAlpha(
			accent,
			mode === "light" ? 0.17 : 0.23,
			mode === "light" ? "rgba(37,99,235,0.17)" : "rgba(90,168,255,0.23)",
		),
		"--app-glow-2": withAlpha(
			success,
			mode === "light" ? 0.14 : 0.15,
			mode === "light" ? "rgba(4,120,87,0.14)" : "rgba(111,220,179,0.15)",
		),
		"--app-ring": withAlpha(
			accent,
			0.6,
			mode === "light" ? "rgba(37,99,235,0.6)" : "rgba(90,168,255,0.6)",
		),
	} satisfies AppCssVariables;
}

export function ToolingApp({
	routedToolId,
}: {
	routedToolId?: string;
}) {
	const TOOL_TOOLTIP_DELAY_MS = 2000;
	const TOOL_TOOLTIP_INSTANT_WINDOW_MS = 2500;
	const location = useLocation();
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [activeCategory, setActiveCategory] = useState<"All" | ToolCategory>(
		"All",
	);
	const [selectedToolId, setSelectedToolId] = useState(() =>
		routedToolId && TOOL_IDS.has(routedToolId) ? routedToolId : DEFAULT_TOOL_ID,
	);
	const [navExpanded, setNavExpanded] = useState(false);
	const [isMobileViewport, setIsMobileViewport] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [paletteQuery, setPaletteQuery] = useState("");
	const [paletteIndex, setPaletteIndex] = useState(0);
	const [themeId, setThemeId] = useState(() => {
		const cookieTheme = readCookieValue(THEME_STORAGE_KEY);
		if (cookieTheme && AVAILABLE_THEME_IDS.has(cookieTheme)) {
			return cookieTheme;
		}

		if (typeof window !== "undefined") {
			const legacyTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
			if (legacyTheme && AVAILABLE_THEME_IDS.has(legacyTheme)) {
				return legacyTheme;
			}
		}

		return DEFAULT_THEME_ID;
	});
	const [themeVars, setThemeVars] = useState<AppCssVariables>(() => {
		const cookieVars = readJsonCookie<AppCssVariables>(THEME_VARS_STORAGE_KEY);
		if (cookieVars && typeof cookieVars === "object") {
			return cookieVars;
		}

		if (typeof window !== "undefined") {
			const legacyThemeVars = window.localStorage.getItem(
				THEME_VARS_STORAGE_KEY,
			);
			if (legacyThemeVars) {
				try {
					return JSON.parse(legacyThemeVars) as AppCssVariables;
				} catch {
					// Ignore malformed cache values.
				}
			}
		}

		return getThemeFallbackVars(themeId);
	});
	const [toolTooltip, setToolTooltip] = useState<ToolTooltipState | null>(null);
	const paletteInputRef = useRef<HTMLInputElement>(null);
	const toolTooltipTimerRef = useRef<number | null>(null);
	const toolTooltipLastVisibleAtRef = useRef<number>(0);
	const toolPaneRef = useRef<HTMLElement | null>(null);
	const lastDomPrefillKeyRef = useRef<string>("");

	const categories = useMemo(
		() =>
			["All", ...new Set(TOOL_REGISTRY.map((tool) => tool.category))] as const,
		[],
	);
	const categoryOptions = useMemo(
		() =>
			categories.map((category) => ({
				value: category,
				label: category,
			})),
		[categories],
	);

	const filteredTools = useMemo(() => {
		return TOOL_REGISTRY.filter((tool) => {
			const matchesCategory =
				activeCategory === "All" || tool.category === activeCategory;
			const query =
				`${tool.name} ${tool.summary} ${tool.category}`.toLowerCase();
			const matchesSearch = query.includes(search.trim().toLowerCase());
			return matchesCategory && matchesSearch;
		});
	}, [activeCategory, search]);

	const selectedTool =
		TOOL_REGISTRY.find((tool) => tool.id === selectedToolId) ??
		TOOL_REGISTRY[0];
	const SelectedToolComponent = selectedTool.component;
	const toolQuery = useMemo(
		() => parseToolQueryState(location.searchStr),
		[location.searchStr],
	);
	const toolQueryRuntime = useMemo<ToolQueryRuntime>(() => {
		let inputCursor = 0;
		let actionCursor = 0;
		let autoRunConsumed = false;

		return {
			queryKey: `${selectedTool.id}|${toolQuery.key}`,
			inputs: toolQuery.inputs,
			action: toolQuery.action,
			autoRun: toolQuery.autoRun,
			registerInput: () => inputCursor++,
			registerAction: () => actionCursor++,
			consumeAutoRun: () => {
				if (autoRunConsumed) {
					return false;
				}
				autoRunConsumed = true;
				return true;
			},
		};
	}, [
		selectedTool.id,
		toolQuery.action,
		toolQuery.autoRun,
		toolQuery.inputs,
		toolQuery.key,
	]);

	useEffect(() => {
		if (toolQueryRuntime.inputs.length === 0) {
			return;
		}

		if (lastDomPrefillKeyRef.current === toolQueryRuntime.queryKey) {
			return;
		}

		const pane = toolPaneRef.current;
		if (!pane) {
			return;
		}

		const textFields = [
			...pane.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
				"textarea, input[type='text'], input[type='search'], input[type='url'], input[type='number'], input:not([type])",
			),
		];
		if (textFields.length === 0) {
			return;
		}

		toolQueryRuntime.inputs.forEach((inputValue, index) => {
			const field = textFields[index];
			if (!field) {
				return;
			}

			field.value = inputValue;
			field.dispatchEvent(new Event("input", { bubbles: true }));
			field.dispatchEvent(new Event("change", { bubbles: true }));
		});

		lastDomPrefillKeyRef.current = toolQueryRuntime.queryKey;
	}, [toolQueryRuntime.inputs, toolQueryRuntime.queryKey]);

	const paletteResults = useMemo(() => {
		const query = paletteQuery.trim().toLowerCase();
		if (!query) {
			return TOOL_REGISTRY;
		}

		return TOOL_REGISTRY.filter((tool) =>
			`${tool.name} ${tool.summary} ${tool.category}`
				.toLowerCase()
				.includes(query),
		);
	}, [paletteQuery]);

	useEffect(() => {
		if (routedToolId == null) {
			return;
		}

		if (TOOL_IDS.has(routedToolId)) {
			setSelectedToolId(routedToolId);
			return;
		}

		setSelectedToolId(DEFAULT_TOOL_ID);
		void navigate({
			to: "/tools/$toolId",
			params: { toolId: DEFAULT_TOOL_ID },
			replace: true,
		});
	}, [navigate, routedToolId]);

	const isLightTheme = themeId === LIGHT_THEME_ID;
	const appTheme = useMemo<AppThemeState>(
		() => ({
			themeId,
			themeType: isLightTheme ? "light" : "dark",
		}),
		[isLightTheme, themeId],
	);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const savedNavState = window.localStorage.getItem(NAV_EXPANDED_STORAGE_KEY);
		if (!savedNavState) {
			setNavExpanded(window.innerWidth < 1024);
			return;
		}

		setNavExpanded(savedNavState === "1");
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const onResize = () => {
			const nextIsMobile = window.innerWidth < 1024;
			setIsMobileViewport(nextIsMobile);
			if (!nextIsMobile) {
				setMobileNavOpen(false);
			}
		};

		onResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		writeCookieValue(THEME_STORAGE_KEY, themeId);
		window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
	}, [themeId]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const serializedThemeVars = JSON.stringify(themeVars);
		writeCookieValue(THEME_VARS_STORAGE_KEY, serializedThemeVars);
		window.localStorage.setItem(THEME_VARS_STORAGE_KEY, serializedThemeVars);
	}, [themeVars]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(
			NAV_EXPANDED_STORAGE_KEY,
			navExpanded ? "1" : "0",
		);
	}, [navExpanded]);

	useEffect(() => {
		return () => {
			if (toolTooltipTimerRef.current !== null) {
				window.clearTimeout(toolTooltipTimerRef.current);
				toolTooltipTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		let cancelled = false;

		const applyTheme = async () => {
			try {
				let theme = themeCache.get(themeId);
				if (!theme) {
					const loader = bundledThemes[themeId as keyof typeof bundledThemes];
					if (!loader) {
						throw new Error(`Shiki theme '${themeId}' is not available.`);
					}

					const loaded = await loader();
					const moduleTheme = loaded as { default?: ShikiThemeModel };
					theme = moduleTheme.default ?? (loaded as ShikiThemeModel);
					themeCache.set(themeId, theme);
				}

				if (!cancelled) {
					setThemeVars(resolveThemeVariables(theme));
				}
			} catch {
				if (!cancelled) {
					setThemeVars(getThemeFallbackVars(themeId));
				}
			}
		};

		void applyTheme();

		return () => {
			cancelled = true;
		};
	}, [themeId]);

	useEffect(() => {
		applyThemeVarsToDocument(themeVars);
	}, [themeVars]);

	useEffect(() => {
		if (!paletteOpen) {
			return;
		}

		setPaletteIndex(0);
		const handle = window.requestAnimationFrame(() => {
			paletteInputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(handle);
	}, [paletteOpen]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (isMobileViewport && mobileNavOpen && event.key === "Escape") {
				event.preventDefault();
				setMobileNavOpen(false);
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setPaletteOpen((open) => !open);
				if (toolTooltipTimerRef.current !== null) {
					window.clearTimeout(toolTooltipTimerRef.current);
					toolTooltipTimerRef.current = null;
				}
				setToolTooltip(null);
				if (!paletteOpen) {
					setPaletteQuery("");
				}
				return;
			}

			if (!paletteOpen) {
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				setPaletteOpen(false);
				return;
			}

			if (event.key === "ArrowDown") {
				event.preventDefault();
				setPaletteIndex((index) =>
					Math.min(index + 1, Math.max(0, paletteResults.length - 1)),
				);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				setPaletteIndex((index) => Math.max(0, index - 1));
				return;
			}

			if (event.key === "Enter") {
				const nextTool = paletteResults[paletteIndex];
				if (!nextTool) {
					return;
				}

				event.preventDefault();
				void navigate({
					to: "/tools/$toolId",
					params: { toolId: nextTool.id },
				});
				setSelectedToolId(nextTool.id);
				setActiveCategory("All");
				setSearch("");
				setPaletteOpen(false);
				setMobileNavOpen(false);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		isMobileViewport,
		mobileNavOpen,
		navigate,
		paletteIndex,
		paletteOpen,
		paletteResults,
	]);

	const selectToolFromPalette = (toolId: string) => {
		void navigate({
			to: "/tools/$toolId",
			params: { toolId },
		});
		setSelectedToolId(toolId);
		setActiveCategory("All");
		setSearch("");
		setPaletteOpen(false);
		setMobileNavOpen(false);
		setToolTooltip(null);
	};

	const toggleThemeMode = useCallback(() => {
		setThemeId((currentThemeId) => {
			const nextThemeId =
				currentThemeId === LIGHT_THEME_ID ? DARK_THEME_ID : LIGHT_THEME_ID;
			toast.success(
				nextThemeId === LIGHT_THEME_ID
					? "Light mode enabled"
					: "Dark mode enabled",
			);
			return nextThemeId;
		});
	}, []);

	const clearToolTooltip = () => {
		if (toolTooltipTimerRef.current !== null) {
			window.clearTimeout(toolTooltipTimerRef.current);
			toolTooltipTimerRef.current = null;
		}
		setToolTooltip((currentTooltip) => {
			if (currentTooltip) {
				toolTooltipLastVisibleAtRef.current = Date.now();
			}
			return null;
		});
	};

	const scheduleToolTooltip = (
		event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
		tool: ToolDefinition,
	) => {
		if (toolTooltipTimerRef.current !== null) {
			window.clearTimeout(toolTooltipTimerRef.current);
		}

		const anchorRect = (
			event.currentTarget as HTMLElement
		).getBoundingClientRect();
		const anchorX =
			"clientX" in event
				? event.clientX
				: anchorRect.left + anchorRect.width / 2;
		const anchorY =
			"clientY" in event
				? event.clientY
				: anchorRect.top + anchorRect.height / 2;

		const maxTooltipWidth = 300;
		const x = Math.max(
			10,
			Math.min(anchorX + 16, window.innerWidth - maxTooltipWidth - 10),
		);
		const y = Math.max(10, Math.min(anchorY + 14, window.innerHeight - 70));
		const shouldShowImmediately =
			toolTooltip !== null ||
			Date.now() - toolTooltipLastVisibleAtRef.current <
				TOOL_TOOLTIP_INSTANT_WINDOW_MS;

		if (shouldShowImmediately) {
			setToolTooltip({
				name: tool.name,
				summary: tool.summary,
				x,
				y,
			});
			toolTooltipLastVisibleAtRef.current = Date.now();
			toolTooltipTimerRef.current = null;
			return;
		}

		toolTooltipTimerRef.current = window.setTimeout(() => {
			setToolTooltip({
				name: tool.name,
				summary: tool.summary,
				x,
				y,
			});
			toolTooltipLastVisibleAtRef.current = Date.now();
			toolTooltipTimerRef.current = null;
		}, TOOL_TOOLTIP_DELAY_MS);
	};

	const effectiveNavExpanded = isMobileViewport ? true : navExpanded;
	const desktopSidebarWidth = effectiveNavExpanded ? 324 : 72;

	const selectTool = (toolId: string) => {
		void navigate({
			to: "/tools/$toolId",
			params: { toolId },
		});
		setSelectedToolId(toolId);
		setMobileNavOpen(false);
		clearToolTooltip();
	};

	const sidebarContent = (
		<div
			className={`flex h-full flex-col ${effectiveNavExpanded ? "p-1" : "p-0.5"}`}
		>
			<div
				className={`flex items-center ${
					effectiveNavExpanded
						? "mb-1 gap-1 rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] px-1 py-1"
						: "mb-0.5 justify-center"
				}`}
			>
				<button
					type="button"
					onClick={() => setNavExpanded((current) => !current)}
					className={`hidden items-center rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-fg-muted)] transition hover:[border-color:var(--app-border-strong)] hover:text-[color:var(--app-fg)] lg:flex ${
						effectiveNavExpanded
							? "w-full justify-between px-1.5 py-1 text-[10px] uppercase tracking-[0.12em]"
							: "size-8 justify-center"
					}`}
					title={
						effectiveNavExpanded
							? "Collapse to icon view"
							: "Expand to list view"
					}
				>
					{effectiveNavExpanded ? <span>List View</span> : null}
					{effectiveNavExpanded ? (
						<ChevronLeft className="size-3.5" />
					) : (
						<ChevronRight className="size-3.5" />
					)}
				</button>

				<button
					type="button"
					onClick={() => setMobileNavOpen(false)}
					className="ml-auto flex size-7 items-center justify-center rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-fg-muted)] transition hover:[border-color:var(--app-border-strong)] hover:text-[color:var(--app-fg)] lg:hidden"
					aria-label="Close tools menu"
				>
					<X className="size-3.5" />
				</button>
			</div>

			{effectiveNavExpanded ? (
				<div className="mb-1.5 space-y-1.5">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--app-fg-soft)]" />
						<input
							type="text"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Find tool..."
							className="w-full rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-7 py-1.5 text-xs text-[color:var(--app-fg)] placeholder:text-[color:var(--app-fg-soft)] focus:border-[color:var(--app-ring)] focus:outline-none"
						/>
					</div>
					<CustomSelect
						value={activeCategory}
						onChange={(nextValue) =>
							setActiveCategory(nextValue as "All" | ToolCategory)
						}
						options={categoryOptions}
						size="sm"
					/>
				</div>
			) : null}

			<nav
				className={`uutil-scrollbar uutil-scrollbar-edge flex-1 overflow-x-hidden overflow-y-auto overscroll-contain ${
					effectiveNavExpanded ? "-mr-1 pr-1" : "-mr-0.5 pr-0"
				}`}
			>
				<div
					className={`${effectiveNavExpanded ? "space-y-1" : "mx-auto w-10 space-y-1"}`}
				>
					{filteredTools.map((tool) => {
						const ToolIcon = getToolIcon(tool);
						const isSelected = selectedTool.id === tool.id;
						return (
							<button
								type="button"
								key={tool.id}
								onClick={() => selectTool(tool.id)}
								onMouseEnter={(event) => {
									scheduleToolTooltip(event, tool);
								}}
								onMouseLeave={clearToolTooltip}
								onFocus={(event) => {
									scheduleToolTooltip(event, tool);
								}}
								onBlur={clearToolTooltip}
								className={`border transition ${
									effectiveNavExpanded
										? "w-full rounded-lg px-1.5 py-1.5 text-left"
										: "mx-auto grid size-10 place-items-center rounded-[10px] p-0"
								} ${
									isSelected
										? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)]"
										: "[border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] hover:[border-color:var(--app-border-strong)] hover:bg-[color:var(--app-panel-bg)]"
								}`}
							>
								<div
									className={`flex items-center ${
										effectiveNavExpanded ? "gap-2.5" : "justify-center"
									}`}
								>
									{effectiveNavExpanded ? (
										<div
											className={`flex shrink-0 items-center justify-center ${
												isSelected
													? "size-8 rounded-md border border-[color:var(--app-accent)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-accent)]"
													: "size-8 rounded-md border [border-color:var(--app-border)] text-[color:var(--app-fg-muted)]"
											}`}
										>
											<ToolIcon className="size-3.5" />
										</div>
									) : (
										<ToolIcon
											className={`size-4 ${
												isSelected
													? "text-[color:var(--app-accent)]"
													: "text-[color:var(--app-fg-muted)]"
											}`}
										/>
									)}
									{effectiveNavExpanded ? (
										<div className="min-w-0">
											<p className="truncate text-[13px] font-medium text-[color:var(--app-fg)]">
												{tool.name}
											</p>
											<p className="truncate text-[11px] text-[color:var(--app-fg-muted)]">
												{tool.summary}
											</p>
										</div>
									) : null}
								</div>
							</button>
						);
					})}

					{filteredTools.length === 0 ? (
						<div className="rounded-md border border-dashed [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] px-2 py-3 text-[11px] text-[color:var(--app-fg-muted)]">
							No matching tools.
						</div>
					) : null}
				</div>
			</nav>
		</div>
	);

	return (
		<AppThemeContext.Provider value={appTheme}>
			<div className="h-screen overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--app-fg)]">
				<div
					className="pointer-events-none fixed inset-0"
					style={{
						background:
							"radial-gradient(circle_at_8%_5%, var(--app-glow-1), transparent 28%), radial-gradient(circle_at_90%_0%, var(--app-glow-2), transparent 24%)",
					}}
				/>

				<div className="relative">
					<header className="sticky top-0 z-20 border-b [border-color:var(--app-border)] bg-[color:var(--app-bg)]/92 backdrop-blur">
						<div className="mx-auto relative flex h-14 max-w-[1680px] items-center gap-1.5 px-2 sm:gap-2 sm:px-3.5 lg:px-5">
							<button
								type="button"
								onClick={() => setMobileNavOpen(true)}
								className="flex size-8 shrink-0 items-center justify-center rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-fg-muted)] transition hover:[border-color:var(--app-border-strong)] hover:text-[color:var(--app-fg)] lg:hidden"
								aria-label="Open tools menu"
							>
								<Menu className="size-3.5" />
							</button>

							<div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] px-2 py-1 md:flex-none md:justify-start">
								<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)]">
									<Sparkles className="size-3.5" />
								</div>
								<div className="min-w-0">
									<p className="hidden truncate text-[9px] uppercase tracking-[0.14em] text-[color:var(--app-fg-muted)] sm:block">
										Developer Tools
									</p>
									<h1 className="truncate text-sm font-semibold text-[color:var(--app-fg)]">
										uutil.space
									</h1>
								</div>
							</div>

							<div className="hidden h-6 w-px bg-[color:var(--app-border)] md:block" />

							<div className="hidden min-w-0 flex-1 md:block">
								<p className="hidden truncate text-[9px] uppercase tracking-[0.14em] text-[color:var(--app-fg-muted)] sm:block">
									{selectedTool.category}
								</p>
								<h2 className="truncate text-sm font-semibold tracking-tight text-[color:var(--app-fg)] sm:text-base">
									{selectedTool.name}
								</h2>
							</div>

							<div className="flex shrink-0 items-center gap-1.5">
								<button
									type="button"
									onClick={() => setPaletteOpen(true)}
									className="flex size-8 items-center justify-center rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[11px] uppercase tracking-[0.1em] text-[color:var(--app-fg-muted)] transition hover:[border-color:var(--app-border-strong)] hover:text-[color:var(--app-fg)] sm:h-auto sm:w-auto sm:gap-1 sm:px-2 sm:py-1.5"
								>
									<Search className="size-3" />
									<span className="hidden sm:inline">Quick Search</span>
									<span className="hidden md:inline">⌘K</span>
								</button>

								<ThemeModeToggle
									isLightTheme={isLightTheme}
									onToggle={toggleThemeMode}
								/>
							</div>
						</div>
					</header>

					<div className="mx-auto max-w-[1680px]">
						{isMobileViewport ? (
							<>
								{mobileNavOpen ? (
									<button
										type="button"
										aria-label="Close tools menu"
										onClick={() => setMobileNavOpen(false)}
										className="fixed inset-x-0 bottom-0 top-14 z-30"
										style={{ backgroundColor: "var(--app-overlay)" }}
									/>
								) : null}

								<aside
									className={`fixed bottom-0 left-0 top-14 z-40 border-r [border-color:var(--app-border)] bg-[color:var(--app-sidebar-bg)] transition-transform duration-200 ${
										mobileNavOpen
											? "translate-x-0"
											: "pointer-events-none -translate-x-[105%]"
									}`}
									style={
										{
											width: "min(86vw, 332px)",
											"--app-fg": "var(--app-sidebar-fg)",
											"--app-fg-muted": "var(--app-sidebar-fg-muted)",
											"--app-fg-soft": "var(--app-sidebar-fg-soft)",
										} as AppCssVariables
									}
								>
									{sidebarContent}
								</aside>

								<ToolQueryContext.Provider value={toolQueryRuntime}>
									<main
										ref={toolPaneRef}
										className="uutil-scrollbar h-[calc(100vh-56px)] min-w-0 overflow-y-auto overscroll-contain px-2 py-2.5 sm:px-3.5 sm:py-3.5"
									>
										<SelectedToolComponent />
									</main>
								</ToolQueryContext.Provider>
							</>
						) : (
							<div className="h-[calc(100vh-56px)]">
								<div className="flex h-full">
									<aside
										className="shrink-0 border-r [border-color:var(--app-border)] bg-[color:var(--app-sidebar-bg)] transition-[width] duration-200"
										style={
											{
												width: `${desktopSidebarWidth}px`,
												"--app-fg": "var(--app-sidebar-fg)",
												"--app-fg-muted": "var(--app-sidebar-fg-muted)",
												"--app-fg-soft": "var(--app-sidebar-fg-soft)",
											} as AppCssVariables
										}
									>
										{sidebarContent}
									</aside>
									<div className="min-w-0 flex-1">
										<ToolQueryContext.Provider value={toolQueryRuntime}>
											<main
												ref={toolPaneRef}
												className="uutil-scrollbar h-full min-w-0 overflow-y-auto overscroll-contain px-4 py-3 lg:px-5 lg:py-4"
											>
												<SelectedToolComponent />
											</main>
										</ToolQueryContext.Provider>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<CommandPalette
					open={paletteOpen}
					query={paletteQuery}
					setQuery={setPaletteQuery}
					selectedIndex={paletteIndex}
					setSelectedIndex={setPaletteIndex}
					results={paletteResults}
					onClose={() => {
						setPaletteOpen(false);
						clearToolTooltip();
					}}
					onSelect={selectToolFromPalette}
					onToolHoverStart={scheduleToolTooltip}
					onToolHoverEnd={clearToolTooltip}
					inputRef={paletteInputRef}
				/>
				<Toaster
					theme={appTheme.themeType}
					position="bottom-right"
					richColors
					toastOptions={{
						style: {
							background: "var(--app-panel-bg)",
							color: "var(--app-fg)",
							border: "1px solid var(--app-border)",
						},
					}}
				/>
				{toolTooltip ? (
					<div
						className="pointer-events-none fixed z-[70] max-w-[280px] rounded-md border [border-color:var(--app-border-strong)] bg-[color:var(--app-panel-bg)] px-2.5 py-2 shadow-[0_16px_36px_var(--app-shadow)]"
						style={{ left: toolTooltip.x, top: toolTooltip.y }}
					>
						<p className="text-xs font-semibold text-[color:var(--app-fg)]">
							{toolTooltip.name}
						</p>
						<p className="mt-0.5 text-[11px] leading-snug text-[color:var(--app-fg-muted)]">
							{toolTooltip.summary}
						</p>
					</div>
				) : null}
			</div>
		</AppThemeContext.Provider>
	);
}

function ThemeModeToggle({
	isLightTheme,
	onToggle,
}: {
	isLightTheme: boolean;
	onToggle: () => void;
}) {
	const modeLabel = isLightTheme ? "Light" : "Dark";
	const nextModeLabel = isLightTheme ? "dark" : "light";

	return (
		<button
			type="button"
			onClick={onToggle}
			aria-label={`Switch to ${nextModeLabel} mode`}
			className="flex size-8 items-center justify-center rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[11px] text-[color:var(--app-fg-muted)] transition hover:[border-color:var(--app-border-strong)] hover:text-[color:var(--app-fg)] sm:h-auto sm:w-auto sm:min-w-[106px] sm:gap-1.5 sm:px-2 sm:py-1.5"
		>
			{isLightTheme ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
			<span className="hidden sm:inline">{modeLabel}</span>
		</button>
	);
}

function CommandPalette({
	open,
	query,
	setQuery,
	selectedIndex,
	setSelectedIndex,
	results,
	onClose,
	onSelect,
	onToolHoverStart,
	onToolHoverEnd,
	inputRef,
}: {
	open: boolean;
	query: string;
	setQuery: (query: string) => void;
	selectedIndex: number;
	setSelectedIndex: (index: number) => void;
	results: ToolDefinition[];
	onClose: () => void;
	onSelect: (toolId: string) => void;
	onToolHoverStart: (
		event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
		tool: ToolDefinition,
	) => void;
	onToolHoverEnd: () => void;
	inputRef: { current: HTMLInputElement | null };
}) {
	if (!open) {
		return null;
	}

	const groupedResults = useMemo(() => {
		const byCategory = new Map<
			ToolCategory,
			Array<{ tool: ToolDefinition; resultIndex: number }>
		>();

		results.forEach((tool, resultIndex) => {
			const categoryTools = byCategory.get(tool.category) ?? [];
			categoryTools.push({ tool, resultIndex });
			byCategory.set(tool.category, categoryTools);
		});

		const grouped = PALETTE_CATEGORY_ORDER.flatMap((category) => {
			const items = byCategory.get(category);
			if (!items || items.length === 0) {
				return [];
			}
			return [{ category, items }];
		});

		byCategory.forEach((items, category) => {
			if (PALETTE_CATEGORY_ORDER.includes(category)) {
				return;
			}
			grouped.push({ category, items });
		});

		return grouped;
	}, [results]);

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-12 sm:px-4 sm:pt-20">
			<button
				type="button"
				aria-label="Close command palette"
				onClick={onClose}
				className="absolute inset-0 backdrop-blur-[2px]"
				style={{ backgroundColor: "var(--app-overlay)" }}
			/>

			<div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] shadow-[0_30px_96px_var(--app-shadow)]">
				<div className="border-b [border-color:var(--app-border)] px-3 py-2.5">
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search all tools..."
						className="w-full rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-2.5 py-1.5 text-xs text-[color:var(--app-fg)] placeholder:text-[color:var(--app-fg-soft)] focus:border-[color:var(--app-ring)] focus:outline-none"
					/>
					<p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--app-fg-soft)]">
						Use ↑ ↓ to navigate, Enter to open, Esc to close
					</p>
				</div>

				<div className="max-h-[58vh] overflow-auto p-1.5">
					{results.length === 0 ? (
						<div className="rounded-md border border-dashed [border-color:var(--app-border)] px-2.5 py-3 text-xs text-[color:var(--app-fg-muted)]">
							No tools found.
						</div>
					) : (
						groupedResults.map((group, groupIndex) => (
							<section
								key={group.category}
								className={groupIndex > 0 ? "mt-2.5" : ""}
							>
								<div className="mb-1.5 flex items-center justify-between px-1">
									<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--app-fg-soft)]">
										{group.category}
									</p>
									<p className="text-[9px] uppercase tracking-[0.12em] text-[color:var(--app-fg-soft)]">
										{group.items.length} tool
										{group.items.length === 1 ? "" : "s"}
									</p>
								</div>
								{group.items.map(({ tool, resultIndex }) => {
									const ToolIcon = getToolIcon(tool);
									return (
										<button
											type="button"
											key={tool.id}
											onMouseEnter={(event) => {
												setSelectedIndex(resultIndex);
												onToolHoverStart(event, tool);
											}}
											onMouseLeave={onToolHoverEnd}
											onFocus={(event) => onToolHoverStart(event, tool)}
											onBlur={onToolHoverEnd}
											onClick={() => onSelect(tool.id)}
											className={`mb-0.5 w-full rounded-md border px-2.5 py-2 text-left transition ${
												resultIndex === selectedIndex
													? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)]"
													: "border-transparent hover:[border-color:var(--app-border)] hover:bg-[color:var(--app-surface-bg)]"
											}`}
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex min-w-0 items-start gap-2">
													<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-fg-muted)]">
														<ToolIcon className="size-3.5" />
													</div>
													<div className="min-w-0">
														<p className="truncate text-xs font-medium text-[color:var(--app-fg)]">
															{tool.name}
														</p>
														<p className="mt-0.5 text-[11px] text-[color:var(--app-fg-muted)]">
															{tool.summary}
														</p>
													</div>
												</div>
												<p className="rounded border [border-color:var(--app-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[color:var(--app-fg-muted)]">
													{tool.category}
												</p>
											</div>
										</button>
									);
								})}
							</section>
						))
					)}
				</div>
			</div>
		</div>
	);
}

function ToolGrid({ children }: { children: React.ReactNode }) {
	return <div className="grid gap-3 xl:grid-cols-2">{children}</div>;
}

function ToolCard({
	title,
	children,
	className,
}: {
	title: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={`rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] p-3 shadow-[inset_0_1px_0_var(--app-glow-1)] ${className ?? ""}`}
		>
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--app-fg-muted)]">
				{title}
			</h3>
			{children}
		</section>
	);
}

function ToolTextarea({
	value,
	onChange,
	placeholder,
	rows = 12,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	rows?: number;
	className?: string;
}) {
	const queryRuntime = useContext(ToolQueryContext);
	const queryInputIndexRef = useRef<number | null>(null);
	const lastAppliedQueryKeyRef = useRef<string>("");
	if (queryRuntime && queryInputIndexRef.current === null) {
		queryInputIndexRef.current = queryRuntime.registerInput();
	}

	useEffect(() => {
		if (!queryRuntime) {
			return;
		}

		if (lastAppliedQueryKeyRef.current === queryRuntime.queryKey) {
			return;
		}

		const queryInputIndex = queryInputIndexRef.current ?? 0;
		const nextValue = queryRuntime.inputs[queryInputIndex];
		if (nextValue == null) {
			return;
		}

		lastAppliedQueryKeyRef.current = queryRuntime.queryKey;
		if (value !== nextValue) {
			onChange(nextValue);
		}
	}, [onChange, queryRuntime, value]);

	return (
		<textarea
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			rows={rows}
			className={`w-full rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-2.5 py-1.5 font-mono text-[13px] text-[color:var(--app-fg)] placeholder:text-[color:var(--app-fg-soft)] focus:border-[color:var(--app-ring)] focus:outline-none ${className ?? ""}`}
		/>
	);
}

function OutputBox({
	value,
	fill = false,
}: {
	value: string;
	fill?: boolean;
}) {
	const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success("Copied to clipboard");
			setCopyState("done");
			setTimeout(() => setCopyState("idle"), 1000);
		} catch {
			toast.error("Could not copy output");
			setCopyState("error");
			setTimeout(() => setCopyState("idle"), 1200);
		}
	};

	return (
		<div className={`relative ${fill ? "h-full" : ""}`}>
			<button
				type="button"
				onClick={copy}
				className="absolute right-1.5 top-1.5 rounded border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] px-1.5 py-0.5 text-[11px] text-[color:var(--app-fg-muted)] hover:[border-color:var(--app-border-strong)]"
			>
				{copyState === "idle"
					? "Copy"
					: copyState === "done"
						? "Copied"
						: "Failed"}
			</button>
			<pre
				className={`overflow-auto rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-2.5 py-1.5 pr-16 font-mono text-[13px] text-[color:var(--app-fg)] ${
					fill ? "h-full min-h-0" : "min-h-28"
				}`}
			>
				{value || "Output will appear here..."}
			</pre>
		</div>
	);
}

function ActionRow({ children }: { children: React.ReactNode }) {
	return <div className="mb-2 flex flex-wrap gap-1.5">{children}</div>;
}

function ActionButton({
	label,
	onClick,
	variant = "default",
}: {
	label: string;
	onClick: () => void | Promise<void>;
	variant?: "default" | "ghost";
}) {
	const queryRuntime = useContext(ToolQueryContext);
	const actionIndexRef = useRef<number | null>(null);
	const lastAutoRunKeyRef = useRef<string>("");
	if (queryRuntime && actionIndexRef.current === null) {
		actionIndexRef.current = queryRuntime.registerAction();
	}

	const handleClick = useCallback(async () => {
		toast(label);
		try {
			await onClick();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Action failed";
			toast.error(message);
		}
	}, [label, onClick]);

	useEffect(() => {
		if (!queryRuntime || !queryRuntime.autoRun) {
			return;
		}

		const hasInputs = queryRuntime.inputs.length > 0;
		if (!hasInputs && !queryRuntime.action) {
			return;
		}

		if (lastAutoRunKeyRef.current === queryRuntime.queryKey) {
			return;
		}

		const currentActionIndex = actionIndexRef.current ?? 0;
		const isTargetAction = queryRuntime.action
			? normalizeActionLabel(queryRuntime.action) === normalizeActionLabel(label)
			: currentActionIndex === 0;
		if (!isTargetAction) {
			return;
		}

		if (!queryRuntime.consumeAutoRun()) {
			return;
		}

		lastAutoRunKeyRef.current = queryRuntime.queryKey;
		const timeout = window.setTimeout(() => {
			void handleClick();
		}, 0);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [handleClick, label, queryRuntime]);

	return (
		<button
			type="button"
			onClick={() => void handleClick()}
			className={`rounded border px-2.5 py-1 text-xs transition ${
				variant === "default"
					? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-strong)] hover:brightness-110"
					: "[border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-fg-muted)] hover:[border-color:var(--app-border-strong)] hover:text-[color:var(--app-fg)]"
			}`}
		>
			{label}
		</button>
	);
}

function ErrorText({ text }: { text: string }) {
	if (!text) {
		return null;
	}

	return (
		<p className="mt-1.5 text-xs text-[color:var(--app-danger)]">{text}</p>
	);
}

function decodeBase64UrlSegment(segment: string) {
	const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
	const padding = normalized.length % 4;
	const padded = padding
		? `${normalized}${"=".repeat(4 - padding)}`
		: normalized;
	return decodeBytesToText(base64ToBytes(padded));
}

function encodeTextToBase64(input: string) {
	const bytes = new TextEncoder().encode(input);
	return bytesToBase64(bytes);
}

function decodeBase64ToText(input: string) {
	const sanitized = input.trim().replace(/\s+/g, "");
	return decodeBytesToText(base64ToBytes(sanitized));
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function base64ToBytes(base64: string) {
	const binary = atob(base64);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeBytesToText(bytes: Uint8Array) {
	return new TextDecoder().decode(bytes);
}

function isLikelyUnixTimestamp(value: string) {
	return /^-?\d+$/.test(value.trim());
}

function collapseWhitespaceForStyles(value: string) {
	return value
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\s+/g, " ")
		.replace(/\s*([{}:;,>])\s*/g, "$1")
		.replace(/;}/g, "}")
		.trim();
}

function minifyHtmlMarkup(value: string) {
	return value
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/>\s+</g, "><")
		.replace(/\s{2,}/g, " ")
		.trim();
}

type ParsedCurl = {
	url: string;
	method: string;
	headers: Record<string, string>;
	data: string | null;
};

type CurlTarget = "node-fetch" | "javascript" | "python" | "go" | "php";

function tokenizeShellLike(input: string) {
	const tokens = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
	return tokens ?? [];
}

function stripQuotes(value: string) {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}

	return value;
}

function parseCurlCommand(input: string): ParsedCurl {
	const tokens = tokenizeShellLike(input.trim());
	if (!tokens.length || tokens[0] !== "curl") {
		throw new Error("Input must start with 'curl'.");
	}

	let method = "GET";
	let url = "";
	let data: string | null = null;
	const headers: Record<string, string> = {};

	for (let index = 1; index < tokens.length; index += 1) {
		const token = tokens[index];
		const next = tokens[index + 1];

		if ((token === "-X" || token === "--request") && next) {
			method = stripQuotes(next).toUpperCase();
			index += 1;
			continue;
		}

		if ((token === "-H" || token === "--header") && next) {
			const header = stripQuotes(next);
			const splitIndex = header.indexOf(":");
			if (splitIndex > -1) {
				const key = header.slice(0, splitIndex).trim();
				const value = header.slice(splitIndex + 1).trim();
				headers[key] = value;
			}
			index += 1;
			continue;
		}

		if (
			(token === "-d" || token === "--data" || token === "--data-raw") &&
			next
		) {
			data = stripQuotes(next);
			index += 1;
			continue;
		}

		if (!token.startsWith("-") && /^https?:\/\//i.test(token)) {
			url = stripQuotes(token);
		}
	}

	if (!url) {
		throw new Error("Could not detect a target URL in the cURL command.");
	}

	if (data && method === "GET") {
		method = "POST";
	}

	return { url, method, headers, data };
}

function renderCurlAsCode(parsed: ParsedCurl, target: CurlTarget) {
	const headersLiteral = Object.entries(parsed.headers).length
		? JSON.stringify(parsed.headers, null, 2)
		: "{}";
	const bodyLiteral = parsed.data ? JSON.stringify(parsed.data) : "undefined";

	if (target === "node-fetch") {
		return `import fetch from "node-fetch";\n\nconst response = await fetch("${parsed.url}", {\n  method: "${parsed.method}",\n  headers: ${headersLiteral},\n  body: ${bodyLiteral}\n});\n\nconst data = await response.text();\nconsole.log(data);`;
	}

	if (target === "javascript") {
		return `const response = await fetch("${parsed.url}", {\n  method: "${parsed.method}",\n  headers: ${headersLiteral},\n  body: ${bodyLiteral}\n});\n\nconst data = await response.text();\nconsole.log(data);`;
	}

	if (target === "python") {
		return `import requests\n\nheaders = ${headersLiteral.replace(/\n/g, "\n")}\nresponse = requests.request("${parsed.method}", "${parsed.url}", headers=headers, data=${bodyLiteral})\nprint(response.text)`;
	}

	if (target === "go") {
		return `package main\n\nimport (\n  "bytes"\n  "fmt"\n  "io"\n  "net/http"\n)\n\nfunc main() {\n  body := bytes.NewBufferString(${bodyLiteral})\n  req, _ := http.NewRequest("${parsed.method}", "${parsed.url}", body)\n\n  req.Header.Set("Content-Type", "application/json")\n\n  client := &http.Client{}\n  res, _ := client.Do(req)\n  defer res.Body.Close()\n  data, _ := io.ReadAll(res.Body)\n  fmt.Println(string(data))\n}`;
	}

	return `<?php\n\n$ch = curl_init();\ncurl_setopt_array($ch, [\n  CURLOPT_URL => "${parsed.url}",\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_CUSTOMREQUEST => "${parsed.method}",\n  CURLOPT_HTTPHEADER => ${JSON.stringify(Object.entries(parsed.headers).map(([key, value]) => `${key}: ${value}`))},\n  CURLOPT_POSTFIELDS => ${bodyLiteral},\n]);\n\n$response = curl_exec($ch);\ncurl_close($ch);\n\necho $response;`;
}

function minifyErb(value: string) {
	return value.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

function beautifyErb(value: string) {
	const lines = value.split(/\r?\n/);
	let indent = 0;
	const result: string[] = [];

	for (const raw of lines) {
		const line = raw.trim();
		if (!line) {
			result.push("");
			continue;
		}

		if (/^<%\s*(end|else|elsif|when|rescue|ensure)/.test(line)) {
			indent = Math.max(0, indent - 1);
		}

		result.push(`${"  ".repeat(indent)}${line}`);

		if (
			/^<%\s*(if|unless|case|for|while|begin)/.test(line) ||
			/\bdo\s*%>$/.test(line)
		) {
			indent += 1;
		}

		if (/^<%\s*(else|elsif|when|rescue|ensure)/.test(line)) {
			indent += 1;
		}
	}

	return result.join("\n");
}

function parseBaseToBigInt(input: string, base: number) {
	const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const normalized = input.trim().toUpperCase();
	if (!normalized) {
		throw new Error("Value is required.");
	}

	const sign = normalized.startsWith("-") ? -1n : 1n;
	const body = normalized.replace(/^[+-]/, "");
	let value = 0n;

	for (const char of body) {
		const index = digits.indexOf(char);
		if (index < 0 || index >= base) {
			throw new Error(`Invalid digit '${char}' for base ${base}.`);
		}
		value = value * BigInt(base) + BigInt(index);
	}

	return sign * value;
}

function formatBigIntToBase(value: bigint, base: number) {
	const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	if (value === 0n) {
		return "0";
	}

	const negative = value < 0n;
	let remainder = negative ? -value : value;
	let output = "";

	while (remainder > 0n) {
		const digit = Number(remainder % BigInt(base));
		output = `${digits[digit]}${output}`;
		remainder /= BigInt(base);
	}

	return negative ? `-${output}` : output;
}

function parseJsonSafely(value: string) {
	return JSON.parse(value);
}

type PhpNode = {
	kind?: string;
	value?: unknown;
	items?: PhpNode[];
	key?: PhpNode | null;
	expr?: PhpNode | null;
	expression?: PhpNode | null;
};

function phpNodeToJs(node: PhpNode | null | undefined): unknown {
	if (!node) {
		return null;
	}

	if (node.kind === "string") {
		return node.value;
	}

	if (node.kind === "number") {
		return Number(node.value);
	}

	if (node.kind === "boolean") {
		return Boolean(node.value);
	}

	if (node.kind === "nullkeyword") {
		return null;
	}

	if (node.kind === "array") {
		const asArray: unknown[] = [];
		let associative = false;
		const asObject: Record<string, unknown> = {};
		const items = Array.isArray(node.items) ? node.items : [];

		items.forEach((item, index) => {
			if (!item || item.kind !== "entry") {
				return;
			}

			const value = phpNodeToJs(
				(item.value as PhpNode | null | undefined) ?? null,
			);
			if (item.key === null && !associative) {
				asArray.push(value);
				return;
			}

			associative = true;
			const key =
				item.key === null ? String(index) : String(phpNodeToJs(item.key));
			asObject[key] = value;
		});

		if (!associative) {
			return asArray;
		}

		asArray.forEach((value, index) => {
			asObject[String(index)] = value;
		});

		return asObject;
	}

	throw new Error(`Unsupported PHP node kind: ${node.kind}`);
}

function parsePhpToObject(code: string) {
	const ast = phpEngine.parseCode(code, "inline.php") as {
		children?: PhpNode[];
	};
	const first = ast.children?.[0];

	if (!first) {
		throw new Error("No PHP expression found.");
	}

	if (first.kind === "expressionstatement") {
		return phpNodeToJs(first.expression);
	}

	if (first.kind === "return") {
		return phpNodeToJs(first.expr);
	}

	throw new Error(
		"Unsupported PHP structure. Provide a PHP array/literal expression.",
	);
}

function jsToPhp(value: unknown, depth = 0): string {
	const indent = "  ".repeat(depth);
	const nextIndent = "  ".repeat(depth + 1);

	if (value === null || value === undefined) {
		return "null";
	}

	if (typeof value === "string") {
		return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
	}

	if (typeof value === "number" || typeof value === "bigint") {
		return String(value);
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (Array.isArray(value)) {
		if (!value.length) {
			return "[]";
		}

		const items = value.map(
			(item) => `${nextIndent}${jsToPhp(item, depth + 1)}`,
		);
		return `[\n${items.join(",\n")}\n${indent}]`;
	}

	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>);
		if (!entries.length) {
			return "[]";
		}

		const lines = entries.map(([key, entryValue]) => {
			const serializedKey = /^\d+$/.test(key)
				? key
				: `'${key.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
			return `${nextIndent}${serializedKey} => ${jsToPhp(entryValue, depth + 1)}`;
		});

		return `[\n${lines.join(",\n")}\n${indent}]`;
	}

	return `'${String(value)}'`;
}

function convertHtmlToJsx(input: string) {
	const voidTags = [
		"area",
		"base",
		"br",
		"col",
		"embed",
		"hr",
		"img",
		"input",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	];

	let output = input.trim();
	output = output
		.replace(/\bclass=/g, "className=")
		.replace(/\bfor=/g, "htmlFor=")
		.replace(/\btabindex=/gi, "tabIndex=")
		.replace(/\bmaxlength=/gi, "maxLength=")
		.replace(/\breadonly=/gi, "readOnly=");

	for (const tag of voidTags) {
		const matcher = new RegExp(`<${tag}(\\s[^/>]*?)?>`, "gi");
		output = output.replace(matcher, (full) =>
			full.endsWith("/>") ? full : full.replace(/>$/, " />"),
		);
	}

	return output;
}

const LOREM_WORDS = [
	"lorem",
	"ipsum",
	"dolor",
	"sit",
	"amet",
	"consectetur",
	"adipiscing",
	"elit",
	"integer",
	"viverra",
	"phasellus",
	"ornare",
	"placerat",
	"volutpat",
	"fermentum",
	"ultricies",
	"facilisi",
	"dictum",
	"scelerisque",
	"tempor",
];

function createLorem(paragraphCount: number) {
	const nextParagraphs = Array.from(
		{ length: Math.max(1, paragraphCount) },
		(_, index) => {
			const sentenceCount = 3 + (index % 3);
			const sentences = Array.from({ length: sentenceCount }, () => {
				const count = 8 + Math.floor(Math.random() * 9);
				const sentenceWords = Array.from(
					{ length: count },
					() => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)],
				);
				const text = sentenceWords.join(" ");
				return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
			});
			return sentences.join(" ");
		},
	);

	return nextParagraphs.join("\n\n");
}

function decodeHexToAscii(value: string) {
	const clean = value.replace(/0x/g, "").replace(/\s+/g, "");
	if (!clean || clean.length % 2 !== 0) {
		throw new Error("Hex string must have an even number of characters.");
	}

	const bytes = clean.match(/.{2}/g);
	if (!bytes) {
		return "";
	}

	return String.fromCharCode(...bytes.map((pair) => Number.parseInt(pair, 16)));
}

function encodeAsciiToHex(value: string) {
	return Array.from(value)
		.map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
		.join(" ");
}

function toCamelCase(input: string) {
	const normalized = input
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.toLowerCase()
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (!normalized.length) {
		return "";
	}

	return normalized
		.map((word, index) =>
			index === 0 ? word : `${word[0].toUpperCase()}${word.slice(1)}`,
		)
		.join("");
}

function toPascalCase(input: string) {
	const camel = toCamelCase(input);
	return camel ? `${camel[0].toUpperCase()}${camel.slice(1)}` : "";
}

function toSnakeCase(input: string) {
	return toCamelCase(input)
		.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
		.replace(/^_/, "");
}

function toKebabCase(input: string) {
	return toSnakeCase(input).replace(/_/g, "-");
}

function toTitleCase(input: string) {
	return input
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean)
		.map(
			(word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
		)
		.join(" ");
}

function ToolLabel({ text }: { text: string }) {
	return (
		<p className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-[color:var(--app-fg-muted)]">
			{text}
		</p>
	);
}

function CustomSelect({
	value,
	onChange,
	options,
	className,
	placeholder = "Select option",
	size = "md",
}: {
	value: string;
	onChange: (nextValue: string) => void;
	options: Array<{ value: string; label: string }>;
	className?: string;
	placeholder?: string;
	size?: "sm" | "md";
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const selectedOption =
		options.find((option) => option.value === value) ?? null;

	useEffect(() => {
		if (!open) {
			return;
		}

		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		const onEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};

		window.addEventListener("mousedown", onPointerDown);
		window.addEventListener("keydown", onEscape);
		return () => {
			window.removeEventListener("mousedown", onPointerDown);
			window.removeEventListener("keydown", onEscape);
		};
	}, [open]);

	return (
		<div ref={rootRef} className={`relative ${className ?? ""}`}>
			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				className={`flex w-full items-center justify-between gap-2 rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] text-left text-[color:var(--app-fg)] transition hover:[border-color:var(--app-border-strong)] ${
					size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
				}`}
				aria-haspopup="listbox"
				aria-expanded={open}
			>
				<span className="min-w-0 truncate">
					{selectedOption?.label ?? placeholder}
				</span>
				<ChevronDown
					className={`size-3.5 shrink-0 text-[color:var(--app-fg-soft)] transition ${
						open ? "rotate-180" : ""
					}`}
				/>
			</button>

			{open ? (
				<div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-60 overflow-auto rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] p-1 shadow-[0_18px_64px_var(--app-shadow)]">
					{options.map((option) => {
						const isActive = option.value === value;
						return (
							<button
								type="button"
								key={option.value}
								onClick={() => {
									onChange(option.value);
									setOpen(false);
								}}
								className={`mb-0.5 flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition ${
									isActive
										? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-fg)]"
										: "border-transparent text-[color:var(--app-fg-muted)] hover:[border-color:var(--app-border)] hover:bg-[color:var(--app-surface-bg)] hover:text-[color:var(--app-fg)]"
								}`}
								role="option"
								aria-selected={isActive}
							>
								<span className="truncate">{option.label}</span>
								{isActive ? <Check className="size-3 shrink-0" /> : null}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

function UnixTimeConverterTool() {
	const [input, setInput] = useState(`${Math.floor(Date.now() / 1000)}`);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");
	const { defaultLayout: defaultUnixLayout, onLayoutChanged: onUnixLayout } =
		usePersistedPanelLayout(UNIX_IO_LAYOUT_COOKIE_KEY, UNIX_IO_PANEL_IDS);

	const convert = () => {
		try {
			setError("");
			let date: Date;

			if (isLikelyUnixTimestamp(input)) {
				const numeric = Number(input.trim());
				if (input.trim().length > 10) {
					date = new Date(numeric);
				} else {
					date = new Date(numeric * 1000);
				}
			} else {
				date = new Date(input);
			}

			if (Number.isNaN(date.getTime())) {
				throw new Error("Could not parse that timestamp/date.");
			}

			const result = {
				iso: date.toISOString(),
				utc: date.toUTCString(),
				locale: date.toLocaleString(),
				unixSeconds: Math.floor(date.getTime() / 1000),
				unixMilliseconds: date.getTime(),
			};

			setOutput(JSON.stringify(result, null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="min-h-[calc(100vh-170px)]">
			<ResizablePanelGroup
				direction="vertical"
				className="h-full min-h-[540px]"
				id="unix-io-panels"
				defaultLayout={defaultUnixLayout}
				onLayoutChanged={onUnixLayout}
			>
				<ResizablePanel
					id={UNIX_IO_PANEL_IDS[0]}
					defaultSize={54}
					minSize={30}
				>
					<section className="flex h-full min-h-0 flex-col gap-2.5 pr-1">
						<div>
							<h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--app-fg-muted)]">
								Input
							</h3>
							<ToolLabel text="Unix time or date string" />
						</div>
						<ToolTextarea
							rows={10}
							value={input}
							onChange={setInput}
							placeholder="1700000000 or 2026-02-24T18:25:00Z"
							className="h-full min-h-0 resize-none"
						/>
						<div>
							<ActionRow>
								<ActionButton label="Convert" onClick={convert} />
								<ActionButton
									label="Now"
									variant="ghost"
									onClick={() => {
										setInput(`${Math.floor(Date.now() / 1000)}`);
										setError("");
									}}
								/>
							</ActionRow>
							<ErrorText text={error} />
						</div>
					</section>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel
					id={UNIX_IO_PANEL_IDS[1]}
					defaultSize={46}
					minSize={28}
				>
					<section className="flex h-full min-h-0 flex-col gap-2.5 pl-1">
						<h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--app-fg-muted)]">
							Output
						</h3>
						<div className="min-h-0 flex-1">
							<OutputBox value={output} fill />
						</div>
					</section>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

function JsonFormatValidateTool() {
	const [input, setInput] = useState('{"project":"uutil.space","ok":true}');
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const run = (mode: "format" | "minify" | "validate") => {
		try {
			setError("");
			const parsed = parseJsonSafely(input);
			if (mode === "validate") {
				setOutput("Valid JSON");
				return;
			}
			setOutput(
				mode === "format"
					? JSON.stringify(parsed, null, 2)
					: JSON.stringify(parsed),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON">
				<ToolTextarea
					rows={14}
					value={input}
					onChange={setInput}
					placeholder='{"foo":"bar"}'
				/>
				<ActionRow>
					<ActionButton label="Format" onClick={() => run("format")} />
					<ActionButton
						label="Minify"
						variant="ghost"
						onClick={() => run("minify")}
					/>
					<ActionButton
						label="Validate"
						variant="ghost"
						onClick={() => run("validate")}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Result">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function Base64StringTool() {
	const [input, setInput] = useState("Hello from uutil.space");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="String Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="Enter text or base64"
				/>
				<ActionRow>
					<ActionButton
						label="Encode"
						onClick={() => {
							try {
								setError("");
								setOutput(encodeTextToBase64(input));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
					<ActionButton
						label="Decode"
						variant="ghost"
						onClick={() => {
							try {
								setError("");
								setOutput(decodeBase64ToText(input));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function Base64ImageTool() {
	const [base64, setBase64] = useState("");
	const [mimeType, setMimeType] = useState("image/png");
	const [preview, setPreview] = useState("");
	const [error, setError] = useState("");

	const handleFile = async (file: File) => {
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result ?? ""));
			reader.onerror = () => reject(new Error("Failed reading file."));
			reader.readAsDataURL(file);
		});

		const [prefix, payload] = dataUrl.split(",");
		setBase64(payload ?? "");
		const detected = prefix.match(/data:(.*?);base64/);
		if (detected?.[1]) {
			setMimeType(detected[1]);
		}
		setPreview(dataUrl);
	};

	const decodeImage = () => {
		try {
			setError("");
			const content = base64.trim();
			if (!content) {
				throw new Error("Provide a base64 payload.");
			}

			if (content.startsWith("data:")) {
				setPreview(content);
				return;
			}

			setPreview(`data:${mimeType};base64,${content.replace(/\s+/g, "")}`);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
			<ToolCard title="Base64 Image Data">
				<div className="mb-3">
					<ToolLabel text="Upload image" />
					<input
						type="file"
						accept="image/*"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) {
								void handleFile(file);
							}
						}}
						className="w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 text-sm"
					/>
				</div>

				<ToolLabel text="Mime type" />
				<input
					type="text"
					value={mimeType}
					onChange={(event) => setMimeType(event.target.value)}
					className="mb-3 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 text-sm"
				/>

				<ToolTextarea
					rows={10}
					value={base64}
					onChange={setBase64}
					placeholder="Paste a base64 string or data URL"
				/>

				<ActionRow>
					<ActionButton label="Decode to Preview" onClick={decodeImage} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="Preview">
				{preview ? (
					<img
						src={preview}
						alt="Decoded preview"
						className="max-h-[500px] w-full rounded-lg border [border-color:var(--app-border)] object-contain"
					/>
				) : (
					<div className="rounded-lg border border-dashed [border-color:var(--app-border)] p-6 text-sm text-[color:var(--app-fg-muted)]">
						Preview will render here.
					</div>
				)}
			</ToolCard>
		</div>
	);
}

function JwtDebuggerTool() {
	const [token, setToken] = useState("");
	const [headerOutput, setHeaderOutput] = useState("");
	const [payloadOutput, setPayloadOutput] = useState("");
	const [metaOutput, setMetaOutput] = useState("");
	const [error, setError] = useState("");

	const decodeToken = () => {
		try {
			setError("");
			const parts = token.trim().split(".");
			if (parts.length < 2) {
				throw new Error("Token must include at least header and payload.");
			}

			const header = JSON.parse(decodeBase64UrlSegment(parts[0]));
			const payload = JSON.parse(decodeBase64UrlSegment(parts[1]));

			const exp =
				typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;
			const iat =
				typeof payload.iat === "number" ? new Date(payload.iat * 1000) : null;

			setHeaderOutput(JSON.stringify(header, null, 2));
			setPayloadOutput(JSON.stringify(payload, null, 2));
			setMetaOutput(
				JSON.stringify(
					{
						signature: parts[2] ?? "(none)",
						expiresAt: exp ? exp.toISOString() : "not present",
						issuedAt: iat ? iat.toISOString() : "not present",
						expired: exp ? Date.now() > exp.getTime() : null,
					},
					null,
					2,
				),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<ToolCard title="JWT Input">
				<ToolTextarea
					rows={5}
					value={token}
					onChange={setToken}
					placeholder="eyJhbGciOi..."
				/>
				<ActionRow>
					<ActionButton label="Decode JWT" onClick={decodeToken} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolGrid>
				<ToolCard title="Header">
					<OutputBox value={headerOutput} />
				</ToolCard>
				<ToolCard title="Payload">
					<OutputBox value={payloadOutput} />
				</ToolCard>
			</ToolGrid>

			<ToolCard title="Token Metadata">
				<OutputBox value={metaOutput} />
			</ToolCard>
		</div>
	);
}

function RegexTesterTool() {
	const [pattern, setPattern] = useState("\\b[a-zA-Z]{4}\\b");
	const [flags, setFlags] = useState("g");
	const [text, setText] = useState("This sample has many four word items.");
	const [replacement, setReplacement] = useState("[$&]");
	const [matchesOutput, setMatchesOutput] = useState("");
	const [replaceOutput, setReplaceOutput] = useState("");
	const [error, setError] = useState("");

	const run = () => {
		try {
			setError("");
			const regex = new RegExp(pattern, flags);
			const matches = Array.from(text.matchAll(regex));
			const mapped = matches.map((match, index) => ({
				index,
				match: match[0],
				position: match.index,
				groups: match.groups ?? null,
			}));
			setMatchesOutput(JSON.stringify(mapped, null, 2));
			setReplaceOutput(text.replace(regex, replacement));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<ToolCard title="Pattern Setup">
				<div className="grid gap-3 md:grid-cols-[1fr_120px]">
					<div>
						<ToolLabel text="Pattern" />
						<input
							type="text"
							value={pattern}
							onChange={(event) => setPattern(event.target.value)}
							className="w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
						/>
					</div>
					<div>
						<ToolLabel text="Flags" />
						<input
							type="text"
							value={flags}
							onChange={(event) => setFlags(event.target.value)}
							className="w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
						/>
					</div>
				</div>
				<div className="mt-3">
					<ToolLabel text="Test text" />
					<ToolTextarea
						rows={7}
						value={text}
						onChange={setText}
						placeholder="Text to test against"
					/>
				</div>
				<div className="mt-3">
					<ToolLabel text="Replacement string" />
					<input
						type="text"
						value={replacement}
						onChange={(event) => setReplacement(event.target.value)}
						className="w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
					/>
				</div>
				<ActionRow>
					<ActionButton label="Run Regex" onClick={run} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolGrid>
				<ToolCard title="Matches">
					<OutputBox value={matchesOutput} />
				</ToolCard>
				<ToolCard title="Replace Preview">
					<OutputBox value={replaceOutput} />
				</ToolCard>
			</ToolGrid>
		</div>
	);
}

function UrlEncodeDecodeTool() {
	const [input, setInput] = useState(
		"https://uutil.space/tools?q=hello world&tab=all",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="Input">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="Text or encoded URL"
				/>
				<ActionRow>
					<ActionButton
						label="Encode"
						onClick={() => {
							setError("");
							setOutput(encodeURIComponent(input));
						}}
					/>
					<ActionButton
						label="Decode"
						variant="ghost"
						onClick={() => {
							try {
								setError("");
								setOutput(decodeURIComponent(input));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function UrlParserTool() {
	const [input, setInput] = useState(
		"https://uutil.space/tools?name=json&active=true#main",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const parseUrl = () => {
		try {
			setError("");
			const prepared = /^https?:\/\//i.test(input) ? input : `https://${input}`;
			const parsed = new URL(prepared);
			const query: Record<string, string> = {};
			parsed.searchParams.forEach((value, key) => {
				query[key] = value;
			});

			setOutput(
				JSON.stringify(
					{
						href: parsed.href,
						protocol: parsed.protocol,
						origin: parsed.origin,
						host: parsed.host,
						hostname: parsed.hostname,
						port: parsed.port,
						pathname: parsed.pathname,
						search: parsed.search,
						hash: parsed.hash,
						query,
					},
					null,
					2,
				),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="URL">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="https://example.com/a?b=1"
				/>
				<ActionRow>
					<ActionButton label="Parse URL" onClick={parseUrl} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="Parsed Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function HtmlEntityTool() {
	const [input, setInput] = useState('<div class="title">A & B</div>');
	const [output, setOutput] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="Text / HTML">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="&amp;"
				/>
				<ActionRow>
					<ActionButton
						label="Encode"
						onClick={() => setOutput(he.encode(input))}
					/>
					<ActionButton
						label="Decode"
						variant="ghost"
						onClick={() => setOutput(he.decode(input))}
					/>
				</ActionRow>
			</ToolCard>
			<ToolCard title="Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function BackslashTool() {
	const [input, setInput] = useState("Line one\nLine two\tTabbed");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="Input">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="Text with or without escapes"
				/>
				<ActionRow>
					<ActionButton
						label="Escape"
						onClick={() => {
							setError("");
							setOutput(JSON.stringify(input).slice(1, -1));
						}}
					/>
					<ActionButton
						label="Unescape"
						variant="ghost"
						onClick={() => {
							try {
								setError("");
								const escaped = input
									.replace(/\\/g, "\\\\")
									.replace(/"/g, '\\"')
									.replace(/\n/g, "\\n");
								setOutput(JSON.parse(`"${escaped}"`));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function UuidUlidTool() {
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const decodeValue = () => {
		try {
			setError("");
			const value = input.trim();
			if (!value) {
				throw new Error("Enter a UUID or ULID to decode.");
			}

			if (validateUuid(value)) {
				const ver = version(value);
				const parsedBytes = Array.from(parseUuid(value)).map((part) =>
					part.toString(16).padStart(2, "0"),
				);
				const info: Record<string, unknown> = {
					type: "UUID",
					value,
					version: ver,
					bytes: parsedBytes.join(" "),
				};

				if (ver === 7) {
					const compact = value.replace(/-/g, "");
					const timestampHex = compact.slice(0, 12);
					const timestampMs = Number.parseInt(timestampHex, 16);
					info.timestamp = new Date(timestampMs).toISOString();
				}

				setOutput(JSON.stringify(info, null, 2));
				return;
			}

			if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(value)) {
				const ms = decodeTime(value);
				setOutput(
					JSON.stringify(
						{
							type: "ULID",
							value,
							timestamp: new Date(ms).toISOString(),
							unixMs: ms,
						},
						null,
						2,
					),
				);
				return;
			}

			throw new Error("Value is not a valid UUID or ULID.");
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Generate">
				<ActionRow>
					<ActionButton label="UUID v4" onClick={() => setOutput(v4())} />
					<ActionButton
						label="UUID v7"
						variant="ghost"
						onClick={() => setOutput(v7())}
					/>
					<ActionButton
						label="ULID"
						variant="ghost"
						onClick={() => setOutput(ulid())}
					/>
				</ActionRow>
				<OutputBox value={output} />
			</ToolCard>

			<ToolCard title="Decode">
				<ToolTextarea
					rows={8}
					value={input}
					onChange={setInput}
					placeholder="Paste UUID or ULID"
				/>
				<ActionRow>
					<ActionButton label="Decode" onClick={decodeValue} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
		</ToolGrid>
	);
}

function HtmlPreviewTool() {
	const [html, setHtml] = useState(
		"<section><h1>uutil.space</h1><p>Live preview</p></section>",
	);

	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
			<ToolCard title="HTML Source">
				<ToolTextarea
					rows={16}
					value={html}
					onChange={setHtml}
					placeholder="<div>Hello</div>"
				/>
			</ToolCard>

			<ToolCard title="Preview">
				<iframe
					title="HTML Preview"
					sandbox="allow-same-origin"
					srcDoc={html}
					className="h-[420px] w-full rounded-lg border [border-color:var(--app-border)] bg-white"
				/>
			</ToolCard>
		</div>
	);
}

function TextDiffTool() {
	const { themeId, themeType } = useAppTheme();
	const [left, setLeft] = useState("line1\nline2\nline3");
	const [right, setRight] = useState("line1\nline2 changed\nline3\nline4");
	const [diffStyle, setDiffStyle] = useState<"split" | "unified">("split");
	const [lineDiffType, setLineDiffType] = useState<"word" | "char" | "none">(
		"word",
	);
	const [copyState, setCopyState] = useState<
		"idle" | "left" | "right" | "both"
	>("idle");
	const diffFile = useMemo(
		() =>
			parseDiffFromFile(
				{
					name: "original.txt",
					contents: left,
					lang: "text",
				},
				{
					name: "updated.txt",
					contents: right,
					lang: "text",
				},
			),
		[left, right],
	);

	const copyText = async (kind: "left" | "right" | "both") => {
		const payload =
			kind === "left"
				? left
				: kind === "right"
					? right
					: `--- Original ---\n${left}\n\n--- Updated ---\n${right}`;
		await navigator.clipboard.writeText(payload);
		setCopyState(kind);
		setTimeout(() => setCopyState("idle"), 1200);
	};

	return (
		<div className="space-y-4">
			<ToolGrid>
				<ToolCard title="Original">
					<ToolTextarea
						rows={10}
						value={left}
						onChange={setLeft}
						placeholder="Original text"
					/>
				</ToolCard>
				<ToolCard title="Updated">
					<ToolTextarea
						rows={10}
						value={right}
						onChange={setRight}
						placeholder="Updated text"
					/>
				</ToolCard>
			</ToolGrid>

			<ToolCard title="Diff Output">
				<div className="mb-3 flex flex-wrap gap-2">
					<CustomSelect
						value={diffStyle}
						onChange={(nextValue) =>
							setDiffStyle(nextValue as "split" | "unified")
						}
						options={[
							{ value: "split", label: "Split view" },
							{ value: "unified", label: "Unified view" },
						]}
						size="sm"
						className="w-[156px]"
					/>
					<CustomSelect
						value={lineDiffType}
						onChange={(nextValue) =>
							setLineDiffType(nextValue as "word" | "char" | "none")
						}
						options={[
							{ value: "word", label: "Word changes" },
							{ value: "char", label: "Character changes" },
							{ value: "none", label: "Line-only changes" },
						]}
						size="sm"
						className="w-[196px]"
					/>
					<ActionButton
						label="Copy Original"
						variant="ghost"
						onClick={() => void copyText("left")}
					/>
					<ActionButton
						label="Copy Updated"
						variant="ghost"
						onClick={() => void copyText("right")}
					/>
					<ActionButton
						label="Copy Both"
						variant="ghost"
						onClick={() => void copyText("both")}
					/>
				</div>
				<div className="overflow-x-auto rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] p-2">
					<PierreFileDiff
						fileDiff={diffFile}
						options={{
							theme: themeId,
							themeType,
							diffStyle,
							lineDiffType,
							overflow: "wrap",
							hunkSeparators: "line-info",
							disableFileHeader: false,
						}}
						className="block min-h-20"
					/>
				</div>
				<p className="text-xs text-[color:var(--app-fg-soft)]">
					{copyState === "idle"
						? "Rendered with @pierre/diffs."
						: copyState === "left"
							? "Original copied."
							: copyState === "right"
								? "Updated copied."
								: "Both versions copied in a single template."}
				</p>
			</ToolCard>
		</div>
	);
}

function YamlToJsonTool() {
	const [input, setInput] = useState(
		"name: uutil.space\nactive: true\nfeatures:\n  - json\n  - yaml",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="YAML">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="key: value"
				/>
				<ActionRow>
					<ActionButton
						label="Convert"
						onClick={() => {
							try {
								setError("");
								setOutput(JSON.stringify(yaml.load(input), null, 2));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="JSON">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function JsonToYamlTool() {
	const [input, setInput] = useState('{"name":"uutil.space","active":true}');
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="JSON">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder='{"a":1}'
				/>
				<ActionRow>
					<ActionButton
						label="Convert"
						onClick={() => {
							try {
								setError("");
								setOutput(
									yaml.dump(parseJsonSafely(input), { lineWidth: 100 }),
								);
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="YAML">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function NumberBaseTool() {
	const [value, setValue] = useState("101101");
	const [fromBase, setFromBase] = useState("2");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const base = Number.parseInt(fromBase, 10);
			if (!Number.isInteger(base) || base < 2 || base > 36) {
				throw new Error("Base must be an integer from 2 to 36.");
			}

			const parsed = parseBaseToBigInt(value, base);
			const result = {
				binary: formatBigIntToBase(parsed, 2),
				octal: formatBigIntToBase(parsed, 8),
				decimal: formatBigIntToBase(parsed, 10),
				hexadecimal: formatBigIntToBase(parsed, 16),
			};
			setOutput(JSON.stringify(result, null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Number Input">
				<ToolLabel text="Value" />
				<input
					type="text"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					className="mb-3 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
				/>
				<ToolLabel text="Base (2-36)" />
				<input
					type="number"
					min={2}
					max={36}
					value={fromBase}
					onChange={(event) => setFromBase(event.target.value)}
					className="mb-3 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
				/>
				<ActionRow>
					<ActionButton label="Convert" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Converted">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function HtmlBeautifyMinifyTool() {
	const [input, setInput] = useState("<div><h1>Hello</h1><p>World</p></div>");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const beautify = async () => {
		try {
			setError("");
			const value = await formatPrettier(input, {
				parser: "html",
				plugins: [prettierHtmlPlugin],
			});
			setOutput(value);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	const minify = async () => {
		try {
			setError("");
			setOutput(minifyHtmlMarkup(input));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error={error}
			onBeautify={() => void beautify()}
			onMinify={() => void minify()}
			placeholder="<section>...</section>"
		/>
	);
}

function CssBeautifyMinifyTool() {
	const [input, setInput] = useState("body{color:#fff;background:#111}");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const beautify = async () => {
		try {
			setError("");
			const value = await formatPrettier(input, {
				parser: "css",
				plugins: [prettierPostcssPlugin],
			});
			setOutput(value);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	const minify = () => {
		try {
			setError("");
			setOutput(collapseWhitespaceForStyles(input));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error={error}
			onBeautify={() => void beautify()}
			onMinify={minify}
			placeholder=".class { color: #fff; }"
		/>
	);
}

function JsBeautifyMinifyTool() {
	const [input, setInput] = useState("const sum=(a,b)=>a+b;");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const beautify = async () => {
		try {
			setError("");
			const value = await formatPrettier(input, {
				parser: "babel",
				plugins: [prettierBabelPlugin, prettierEstreePlugin],
			});
			setOutput(value);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	const minify = async () => {
		try {
			setError("");
			const result = await minifyJs(input);
			setOutput(result.code ?? "");
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error={error}
			onBeautify={() => void beautify()}
			onMinify={() => void minify()}
			placeholder="const value = 1;"
		/>
	);
}

function ErbBeautifyMinifyTool() {
	const [input, setInput] = useState(
		"<% if user %>\n<div><%= user.name %></div>\n<% end %>",
	);
	const [output, setOutput] = useState("");

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error=""
			onBeautify={() => setOutput(beautifyErb(input))}
			onMinify={() => setOutput(minifyErb(input))}
			placeholder="<% if condition %>..."
		/>
	);
}

function LessBeautifyMinifyTool() {
	const [input, setInput] = useState(
		"@color:#08f; .btn{color:@color; padding:8px 12px;}",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const beautify = async () => {
		try {
			setError("");
			const value = await formatPrettier(input, {
				parser: "less",
				plugins: [prettierPostcssPlugin],
			});
			setOutput(value);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error={error}
			onBeautify={() => void beautify()}
			onMinify={() => setOutput(collapseWhitespaceForStyles(input))}
			placeholder="@color: #0af;"
		/>
	);
}

function ScssBeautifyMinifyTool() {
	const [input, setInput] = useState(
		"$primary:#0af;.card{color:$primary;padding:16px;}",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const beautify = async () => {
		try {
			setError("");
			const value = await formatPrettier(input, {
				parser: "scss",
				plugins: [prettierPostcssPlugin],
			});
			setOutput(value);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error={error}
			onBeautify={() => void beautify()}
			onMinify={() => setOutput(collapseWhitespaceForStyles(input))}
			placeholder="$color: #0bf;"
		/>
	);
}

function XmlBeautifyMinifyTool() {
	const [input, setInput] = useState("<root><item id='1'>Value</item></root>");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<GenericFormatTool
			input={input}
			setInput={setInput}
			output={output}
			error={error}
			onBeautify={() => {
				try {
					setError("");
					setOutput(xmlFormat(input, { collapseContent: true }));
				} catch (err) {
					setError((err as Error).message);
				}
			}}
			onMinify={() => {
				try {
					setError("");
					setOutput(vkbeautify.xmlmin(input));
				} catch (err) {
					setError((err as Error).message);
				}
			}}
			placeholder="<root><item /></root>"
		/>
	);
}

function GenericFormatTool({
	input,
	setInput,
	output,
	error,
	onBeautify,
	onMinify,
	placeholder,
}: {
	input: string;
	setInput: (value: string) => void;
	output: string;
	error: string;
	onBeautify: () => void;
	onMinify: () => void;
	placeholder: string;
}) {
	return (
		<ToolGrid>
			<ToolCard title="Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder={placeholder}
				/>
				<ActionRow>
					<ActionButton label="Beautify" onClick={onBeautify} />
					<ActionButton label="Minify" variant="ghost" onClick={onMinify} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function LoremIpsumTool() {
	const [paragraphs, setParagraphs] = useState(3);
	const [output, setOutput] = useState(() => createLorem(3));

	const generate = () => {
		setOutput(createLorem(paragraphs));
	};

	return (
		<ToolGrid>
			<ToolCard title="Generator">
				<ToolLabel text="Paragraph count" />
				<input
					type="number"
					min={1}
					max={20}
					value={paragraphs}
					onChange={(event) =>
						setParagraphs(Number.parseInt(event.target.value, 10) || 1)
					}
					className="mb-3 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2"
				/>
				<ActionRow>
					<ActionButton label="Generate" onClick={generate} />
				</ActionRow>
			</ToolCard>
			<ToolCard title="Lorem Ipsum">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function QrCodeTool() {
	const [text, setText] = useState("https://uutil.space");
	const [qrDataUrl, setQrDataUrl] = useState("");
	const [decodedOutput, setDecodedOutput] = useState("");
	const [error, setError] = useState("");

	const generateQr = async () => {
		try {
			setError("");
			setQrDataUrl(await QRCode.toDataURL(text, { margin: 1, width: 360 }));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	const decodeQrFromFile = async (file: File) => {
		try {
			setError("");
			const url = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result ?? ""));
				reader.onerror = () => reject(new Error("Failed reading file."));
				reader.readAsDataURL(file);
			});

			const image = await new Promise<HTMLImageElement>((resolve, reject) => {
				const img = new window.Image();
				img.onload = () => resolve(img);
				img.onerror = () =>
					reject(new Error("Could not decode uploaded image."));
				img.src = url;
			});

			const canvas = document.createElement("canvas");
			canvas.width = image.width;
			canvas.height = image.height;
			const context = canvas.getContext("2d");
			if (!context) {
				throw new Error("Canvas context unavailable.");
			}

			context.drawImage(image, 0, 0);
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const result = jsQR(imageData.data, imageData.width, imageData.height);
			if (!result) {
				throw new Error("No QR code detected in the image.");
			}

			setDecodedOutput(result.data);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<ToolGrid>
				<ToolCard title="Generator">
					<ToolTextarea
						rows={8}
						value={text}
						onChange={setText}
						placeholder="Text for QR code"
					/>
					<ActionRow>
						<ActionButton
							label="Generate QR"
							onClick={() => void generateQr()}
						/>
					</ActionRow>
					{qrDataUrl ? (
						<img
							src={qrDataUrl}
							alt="QR Code"
							className="mx-auto mt-2 rounded-lg border [border-color:var(--app-border)] bg-white p-3"
						/>
					) : null}
				</ToolCard>

				<ToolCard title="Reader">
					<ToolLabel text="Upload QR image" />
					<input
						type="file"
						accept="image/*"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) {
								void decodeQrFromFile(file);
							}
						}}
						className="mb-3 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 text-sm"
					/>
					<OutputBox value={decodedOutput} />
				</ToolCard>
			</ToolGrid>
			<ErrorText text={error} />
		</div>
	);
}

function StringInspectorTool() {
	const [input, setInput] = useState("Hello world\n123\nTEST");

	const stats = useMemo(() => {
		const words = input.match(/\S+/g) ?? [];
		const bytes = new TextEncoder().encode(input).length;
		const lines = input ? input.split(/\r?\n/).length : 0;
		const digits = (input.match(/\d/g) ?? []).length;
		const upper = (input.match(/[A-Z]/g) ?? []).length;
		const lower = (input.match(/[a-z]/g) ?? []).length;
		const whitespace = (input.match(/\s/g) ?? []).length;

		return {
			characters: input.length,
			bytes,
			words: words.length,
			lines,
			digits,
			uppercase: upper,
			lowercase: lower,
			whitespace,
		};
	}, [input]);

	return (
		<ToolGrid>
			<ToolCard title="Input Text">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="Type text"
				/>
			</ToolCard>
			<ToolCard title="Inspection">
				<OutputBox value={JSON.stringify(stats, null, 2)} />
			</ToolCard>
		</ToolGrid>
	);
}

function JsonToCsvTool() {
	const [input, setInput] = useState(
		'[{"name":"Ada","score":98},{"name":"Linus","score":95}]',
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const parsed = parseJsonSafely(input);
			const arrayValue = Array.isArray(parsed) ? parsed : [parsed];
			setOutput(Papa.unparse(arrayValue));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="[{...}]"
				/>
				<ActionRow>
					<ActionButton label="Convert" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="CSV">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function CsvToJsonTool() {
	const [input, setInput] = useState("name,score\nAda,98\nLinus,95");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="CSV">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="col1,col2"
				/>
				<ActionRow>
					<ActionButton
						label="Convert"
						onClick={() => {
							try {
								setError("");
								const result = Papa.parse(input, {
									header: true,
									skipEmptyLines: true,
								});
								if (result.errors.length) {
									throw new Error(result.errors[0].message);
								}
								setOutput(JSON.stringify(result.data, null, 2));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="JSON">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function HashGeneratorTool() {
	const [input, setInput] = useState("uutil.space");
	const [algorithm, setAlgorithm] = useState<
		"MD5" | "SHA1" | "SHA256" | "SHA512"
	>("SHA256");
	const [output, setOutput] = useState("");

	const hash = () => {
		const result =
			algorithm === "MD5"
				? CryptoJS.MD5(input)
				: algorithm === "SHA1"
					? CryptoJS.SHA1(input)
					: algorithm === "SHA256"
						? CryptoJS.SHA256(input)
						: CryptoJS.SHA512(input);

		setOutput(result.toString(CryptoJS.enc.Hex));
	};

	return (
		<ToolGrid>
			<ToolCard title="Input">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="Text to hash"
				/>
				<div className="mb-3 flex gap-2">
					{(["MD5", "SHA1", "SHA256", "SHA512"] as const).map((value) => (
						<button
							key={value}
							type="button"
							onClick={() => setAlgorithm(value)}
							className={`rounded-md border px-2.5 py-1 text-xs ${
								value === algorithm
									? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-strong)]"
									: "[border-color:var(--app-border)] text-[color:var(--app-fg-muted)]"
							}`}
						>
							{value}
						</button>
					))}
				</div>
				<ActionRow>
					<ActionButton label="Generate Hash" onClick={hash} />
				</ActionRow>
			</ToolCard>
			<ToolCard title="Digest">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function HtmlToJsxTool() {
	const [input, setInput] = useState('<div class="card"><h2>Hello</h2></div>');
	const [output, setOutput] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="HTML">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="<div>"
				/>
				<ActionRow>
					<ActionButton
						label="Convert"
						onClick={() => {
							setOutput(convertHtmlToJsx(input));
						}}
					/>
				</ActionRow>
			</ToolCard>
			<ToolCard title="JSX">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function MarkdownPreviewTool() {
	const [markdown, setMarkdown] = useState(
		"# uutil.space\n\n- Fast\n- Focused\n- Useful",
	);
	const html = useMemo(() => marked.parse(markdown) as string, [markdown]);

	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
			<ToolCard title="Markdown">
				<ToolTextarea
					rows={16}
					value={markdown}
					onChange={setMarkdown}
					placeholder="# Title"
				/>
			</ToolCard>
			<ToolCard title="Preview">
				<iframe
					title="Markdown Preview"
					sandbox="allow-same-origin"
					srcDoc={`<article style="font-family: ui-sans-serif, sans-serif; padding: 16px; line-height: 1.6">${html}</article>`}
					className="h-[420px] w-full rounded-lg border [border-color:var(--app-border)] bg-white"
				/>
				<div className="mt-3">
					<ToolLabel text="Rendered HTML" />
					<OutputBox value={html} />
				</div>
			</ToolCard>
		</div>
	);
}

function SqlFormatterTool() {
	const [input, setInput] = useState(
		"select id,name from users where active=1 order by created_at desc;",
	);
	const [dialect, setDialect] = useState<SqlLanguage>("postgresql");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const dialects: SqlLanguage[] = [
		"clickhouse",
		"postgresql",
		"mysql",
		"sqlite",
		"sql",
		"spark",
		"trino",
	];

	return (
		<ToolGrid>
			<ToolCard title="SQL Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="SELECT * FROM ..."
				/>
				<ToolLabel text="Dialect" />
				<CustomSelect
					value={dialect}
					onChange={(nextValue) => setDialect(nextValue as SqlLanguage)}
					options={dialects.map((item) => ({
						value: item,
						label: item,
					}))}
					className="mb-3 w-full"
				/>
				<ActionRow>
					<ActionButton
						label="Format SQL"
						onClick={() => {
							try {
								setError("");
								setOutput(formatSql(input, { language: dialect }));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="Formatted SQL">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function StringCaseConverterTool() {
	const [input, setInput] = useState("hello world from uutil");

	const output = useMemo(() => {
		return JSON.stringify(
			{
				camelCase: toCamelCase(input),
				pascalCase: toPascalCase(input),
				snakeCase: toSnakeCase(input),
				kebabCase: toKebabCase(input),
				titleCase: toTitleCase(input),
				upperCase: input.toUpperCase(),
				lowerCase: input.toLowerCase(),
			},
			null,
			2,
		);
	}, [input]);

	return (
		<ToolGrid>
			<ToolCard title="Input String">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="text value"
				/>
			</ToolCard>
			<ToolCard title="Case Variants">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function CronJobParserTool() {
	const [expression, setExpression] = useState("*/15 * * * *");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const parseCron = () => {
		try {
			setError("");
			const parsed = CronExpressionParser.parse(expression, {
				currentDate: new Date(),
			});
			const nextRuns = Array.from({ length: 8 }, () =>
				parsed.next().toString(),
			);
			setOutput(JSON.stringify({ expression, nextRuns }, null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Cron Expression">
				<ToolTextarea
					rows={8}
					value={expression}
					onChange={setExpression}
					placeholder="0 9 * * 1-5"
				/>
				<ActionRow>
					<ActionButton label="Parse" onClick={parseCron} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="Next Runs">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function ColorConverterTool() {
	const [input, setInput] = useState("#3498db");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const color = Color(input);
			setOutput(
				JSON.stringify(
					{
						hex: color.hex(),
						rgb: color.rgb().string(),
						hsl: color.hsl().string(),
						hsv: color.hsv().string(),
						cmyk: color.cmyk().array(),
						alpha: color.alpha(),
					},
					null,
					2,
				),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<ToolGrid>
				<ToolCard title="Color Input">
					<ToolTextarea
						rows={6}
						value={input}
						onChange={setInput}
						placeholder="#ff0000 or rgb(255,0,0)"
					/>
					<ActionRow>
						<ActionButton label="Convert" onClick={convert} />
					</ActionRow>
					<ErrorText text={error} />
				</ToolCard>
				<ToolCard title="Converted Values">
					<OutputBox value={output} />
				</ToolCard>
			</ToolGrid>
			<div className="rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] p-4">
				<p className="mb-2 text-xs uppercase tracking-[0.16em] text-[color:var(--app-fg-soft)]">
					Preview
				</p>
				<div
					className="h-24 rounded-lg border [border-color:var(--app-border)]"
					style={{ background: input }}
				/>
			</div>
		</div>
	);
}

function PhpToJsonTool() {
	const [input, setInput] = useState(
		"<?php ['name' => 'uutil', 'count' => 3, 'active' => true];",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const value = isSerialized(input.trim())
				? unserialize(input.trim())
				: parsePhpToObject(input);
			setOutput(JSON.stringify(value, null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="PHP Source or Serialized Value">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="<?php ['a' => 1];"
				/>
				<ActionRow>
					<ActionButton label="Convert to JSON" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="JSON Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function JsonToPhpTool() {
	const [input, setInput] = useState(
		'{"name":"uutil","count":3,"active":true}',
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const parsed = parseJsonSafely(input);
			setOutput(jsToPhp(parsed));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder='{"a":1}'
				/>
				<ActionRow>
					<ActionButton label="Convert to PHP" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>

			<ToolCard title="PHP Array Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function PhpSerializerTool() {
	const [input, setInput] = useState('{"name":"uutil","id":1}');
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const run = () => {
		try {
			setError("");
			const parsed = parseJsonSafely(input);
			setOutput(serialize(parsed));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder='{"a":1}'
				/>
				<ActionRow>
					<ActionButton label="Serialize" onClick={run} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Serialized String">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function PhpUnserializerTool() {
	const [input, setInput] = useState(
		'a:2:{s:4:"name";s:5:"uutil";s:2:"id";i:1;}',
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const run = () => {
		try {
			setError("");
			setOutput(JSON.stringify(unserialize(input), null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Serialized Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder='a:1:{s:3:"foo";s:3:"bar";}'
				/>
				<ActionRow>
					<ActionButton label="Unserialize" onClick={run} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="JSON Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function RandomStringTool() {
	const [length, setLength] = useState(32);
	const [includeLower, setIncludeLower] = useState(true);
	const [includeUpper, setIncludeUpper] = useState(true);
	const [includeNumbers, setIncludeNumbers] = useState(true);
	const [includeSymbols, setIncludeSymbols] = useState(false);
	const [output, setOutput] = useState("");

	const generate = () => {
		const lower = "abcdefghijklmnopqrstuvwxyz";
		const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		const numbers = "0123456789";
		const symbols = "!@#$%^&*()_+-={}[]<>?";

		let pool = "";
		if (includeLower) pool += lower;
		if (includeUpper) pool += upper;
		if (includeNumbers) pool += numbers;
		if (includeSymbols) pool += symbols;

		if (!pool) {
			setOutput("Select at least one character set.");
			return;
		}

		const bytes = crypto.getRandomValues(new Uint32Array(Math.max(1, length)));
		let value = "";
		for (let index = 0; index < length; index += 1) {
			value += pool[bytes[index] % pool.length];
		}

		setOutput(value);
	};

	return (
		<ToolGrid>
			<ToolCard title="Generator Options">
				<ToolLabel text="Length" />
				<input
					type="number"
					min={1}
					max={2048}
					value={length}
					onChange={(event) =>
						setLength(Number.parseInt(event.target.value, 10) || 1)
					}
					className="mb-3 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2"
				/>

				<div className="mb-3 grid grid-cols-2 gap-2 text-sm">
					<ToggleBox
						label="Lowercase"
						checked={includeLower}
						onChange={setIncludeLower}
					/>
					<ToggleBox
						label="Uppercase"
						checked={includeUpper}
						onChange={setIncludeUpper}
					/>
					<ToggleBox
						label="Numbers"
						checked={includeNumbers}
						onChange={setIncludeNumbers}
					/>
					<ToggleBox
						label="Symbols"
						checked={includeSymbols}
						onChange={setIncludeSymbols}
					/>
				</div>

				<ActionRow>
					<ActionButton label="Generate" onClick={generate} />
				</ActionRow>
			</ToolCard>

			<ToolCard title="Random Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function ToggleBox({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-2 rounded-md border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-2 py-2">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
			/>
			<span>{label}</span>
		</label>
	);
}

function SvgToCssTool() {
	const [input, setInput] = useState(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="#0ea5e9"/></svg>',
	);
	const [output, setOutput] = useState("");

	const convert = () => {
		const normalized = input
			.replace(/\s{2,}/g, " ")
			.replace(/>\s+</g, "><")
			.trim();
		const encoded = encodeURIComponent(normalized)
			.replace(/'/g, "%27")
			.replace(/"/g, "%22");

		setOutput(`background-image: url("data:image/svg+xml,${encoded}");`);
	};

	return (
		<ToolGrid>
			<ToolCard title="SVG Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="<svg ...>"
				/>
				<ActionRow>
					<ActionButton label="Convert" onClick={convert} />
				</ActionRow>
			</ToolCard>
			<ToolCard title="CSS Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function CurlToCodeTool() {
	const [input, setInput] = useState(
		"curl -X GET https://api.github.com/users/octocat",
	);
	const [target, setTarget] = useState<CurlTarget>("node-fetch");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const parsed = parseCurlCommand(input);
			setOutput(renderCurlAsCode(parsed, target));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="cURL Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="curl ..."
				/>
				<ToolLabel text="Target language" />
				<CustomSelect
					value={target}
					onChange={(nextValue) => setTarget(nextValue as CurlTarget)}
					options={[
						{ value: "node-fetch", label: "Node Fetch" },
						{ value: "javascript", label: "JavaScript (fetch)" },
						{ value: "python", label: "Python (requests)" },
						{ value: "go", label: "Go" },
						{ value: "php", label: "PHP" },
					]}
					className="mb-3 w-full"
				/>
				<ActionRow>
					<ActionButton label="Convert" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Code Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function JsonToCodeTool() {
	const [input, setInput] = useState('{"id":1,"name":"Ada","roles":["admin"]}');
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const parsed = parseJsonSafely(input);
			const interfaces = JsonToTS(parsed);
			setOutput(interfaces.join("\n\n"));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder='{"name":"Ada"}'
				/>
				<ActionRow>
					<ActionButton label="Generate Code" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="TypeScript Interfaces">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function CertificateDecoderTool() {
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const decodeCertificate = async () => {
		try {
			setError("");
			const match = input.match(
				/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/,
			);
			if (!match) {
				throw new Error("Paste a valid PEM certificate block.");
			}

			const { X509Certificate } = await import("@peculiar/x509");
			const cert = new X509Certificate(match[0]);
			setOutput(
				JSON.stringify(
					{
						subject: cert.subject,
						issuer: cert.issuer,
						serialNumber: cert.serialNumber,
						validFrom: cert.notBefore,
						validTo: cert.notAfter,
						signatureAlgorithm: cert.signatureAlgorithm.name,
						publicKeyAlgorithm: cert.publicKey.algorithm.name,
						isSelfSigned: cert.isSelfSigned,
					},
					null,
					2,
				),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="PEM Certificate">
				<ToolTextarea
					rows={14}
					value={input}
					onChange={setInput}
					placeholder="-----BEGIN CERTIFICATE-----"
				/>
				<ActionRow>
					<ActionButton
						label="Decode Certificate"
						onClick={() => void decodeCertificate()}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Decoded Metadata">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function HexToAsciiTool() {
	const [input, setInput] = useState("48 65 6c 6c 6f");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="Hex Input">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="48 65 6c 6c 6f"
				/>
				<ActionRow>
					<ActionButton
						label="Convert"
						onClick={() => {
							try {
								setError("");
								setOutput(decodeHexToAscii(input));
							} catch (err) {
								setError((err as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="ASCII Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function AsciiToHexTool() {
	const [input, setInput] = useState("Hello");
	const [output, setOutput] = useState("");

	return (
		<ToolGrid>
			<ToolCard title="ASCII Input">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="Hello"
				/>
				<ActionRow>
					<ActionButton
						label="Convert"
						onClick={() => setOutput(encodeAsciiToHex(input))}
					/>
				</ActionRow>
			</ToolCard>
			<ToolCard title="Hex Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function LineSortDedupeTool() {
	const [input, setInput] = useState("banana\nApple\nbanana\ncherry");
	const [ignoreCase, setIgnoreCase] = useState(true);
	const [dedupe, setDedupe] = useState(true);
	const [descending, setDescending] = useState(false);
	const [trimLines, setTrimLines] = useState(true);
	const [output, setOutput] = useState("");

	const run = () => {
		let lines = input.split(/\r?\n/);

		if (trimLines) {
			lines = lines.map((line) => line.trim());
		}

		lines = lines.filter((line) => line.length > 0);

		if (dedupe) {
			const seen = new Set<string>();
			lines = lines.filter((line) => {
				const key = ignoreCase ? line.toLowerCase() : line;
				if (seen.has(key)) {
					return false;
				}
				seen.add(key);
				return true;
			});
		}

		lines.sort((a, b) => {
			const left = ignoreCase ? a.toLowerCase() : a;
			const right = ignoreCase ? b.toLowerCase() : b;
			if (left < right) return descending ? 1 : -1;
			if (left > right) return descending ? -1 : 1;
			return 0;
		});

		setOutput(lines.join("\n"));
	};

	return (
		<ToolGrid>
			<ToolCard title="Lines Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="One value per line"
				/>
				<div className="mb-3 grid grid-cols-2 gap-2 text-sm">
					<ToggleBox
						label="Ignore case"
						checked={ignoreCase}
						onChange={setIgnoreCase}
					/>
					<ToggleBox label="Dedupe" checked={dedupe} onChange={setDedupe} />
					<ToggleBox
						label="Descending"
						checked={descending}
						onChange={setDescending}
					/>
					<ToggleBox
						label="Trim lines"
						checked={trimLines}
						onChange={setTrimLines}
					/>
				</div>
				<ActionRow>
					<ActionButton label="Sort & Dedupe" onClick={run} />
				</ActionRow>
			</ToolCard>
			<ToolCard title="Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}
