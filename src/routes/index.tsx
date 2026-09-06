import { parseDiffFromFile } from "@pierre/diffs";
import { FileDiff as PierreFileDiff } from "@pierre/diffs/react";
import {
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { Buffer } from "buffer";
import Color from "color";
import {
	buildCron,
	checkContrast,
	generateMockData,
	redactText,
	type CronSchedule,
	type MockFieldType,
	type validateJsonSchema,
} from "#/lib/workspace-utilities";
import { CronExpressionParser } from "cron-parser";
import CryptoJS from "crypto-js";
import he from "he";
import * as yaml from "js-yaml";
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
	Copy,
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
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
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
import {
	type CurlTarget,
	decodeHexToAscii,
	encodeAsciiToHex,
	formatBigIntToBase,
	parseBaseToBigInt,
	parseCurlCommand,
	parseTimestampInput,
	renderCurlAsCode,
	runRegex,
	toCamelCase,
	toKebabCase,
	toPascalCase,
	toSnakeCase,
	toTitleCase,
	unescapeBackslashes,
} from "#/lib/converters";
import {
	analyzePassword,
	analyzeReadability,
	analyzeSecurityHeaders,
	calculateChmod,
	calculateDateDifference,
	calculateIpv4Cidr,
	canonicalizeUrl,
	compareSemVer,
	convertDataSize,
	createSlug,
	DATA_SIZE_UNITS,
	type DataSizeUnit,
	decodeBase32,
	encodeBase32,
	envToJson,
	exploreJsonPath,
	generateHmac,
	type HmacAlgorithm,
	inspectMacAddress,
	inspectUnicode,
	jsonLinesToJson,
	jsonToEnv,
	jsonToJsonLines,
	jsonToQueryString,
	lookupMimeTypes,
	queryStringToJson,
	searchHttpStatuses,
} from "#/lib/tool-utilities";
import {
	getUiPreferences,
	NAV_EXPANDED_STORAGE_KEY,
} from "#/lib/ui-preferences";
import { WORKBENCH_DARK, WORKBENCH_LIGHT } from "#/lib/workbench-theme";

const runtimeGlobal = globalThis as typeof globalThis & {
	Buffer?: typeof Buffer;
};
runtimeGlobal.Buffer ??= Buffer;

export const Route = createFileRoute("/")({
	loader: () => getUiPreferences(),
	component: HomeRouteComponent,
});

function HomeRouteComponent() {
	return <ToolingApp initialUiPreferences={Route.useLoaderData()} />;
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
		name: "Hex to UTF-8",
		category: "Encoding",
		summary: "Decode hexadecimal bytes into validated UTF-8 text.",
		component: HexToAsciiTool,
	},
	{
		id: "ascii-to-hex",
		name: "UTF-8 to Hex",
		category: "Encoding",
		summary: "Encode text into its UTF-8 hexadecimal bytes.",
		component: AsciiToHexTool,
	},
	{
		id: "line-sort-dedupe",
		name: "Line Sort/Dedupe",
		category: "Core",
		summary: "Sort lines, remove duplicates, and clean whitespace.",
		component: LineSortDedupeTool,
	},
	{
		id: "json-path-explorer",
		name: "JSON Path Explorer",
		category: "Parsing",
		summary: "Extract nested JSON values with dot and bracket paths.",
		component: JsonPathExplorerTool,
	},
	{
		id: "query-string-converter",
		name: "Query String Converter",
		category: "Conversion",
		summary: "Convert query strings to JSON and JSON objects back to queries.",
		component: QueryStringConverterTool,
	},
	{
		id: "ipv4-cidr-calculator",
		name: "IPv4 CIDR Calculator",
		category: "Parsing",
		summary: "Calculate IPv4 network ranges, masks, and usable addresses.",
		component: Ipv4CidrCalculatorTool,
	},
	{
		id: "password-strength",
		name: "Password Strength Analyzer",
		category: "Security",
		summary: "Estimate password entropy and get actionable strength feedback.",
		component: PasswordStrengthTool,
	},
	{
		id: "slug-generator",
		name: "Slug Generator",
		category: "Generators",
		summary: "Turn titles and phrases into clean URL-safe slugs.",
		component: SlugGeneratorTool,
	},
	{
		id: "unicode-inspector",
		name: "Unicode Inspector",
		category: "Encoding",
		summary: "Inspect Unicode code points, UTF-8 bytes, and UTF-16 units.",
		component: UnicodeInspectorTool,
	},
	{
		id: "data-size-converter",
		name: "Data Size Converter",
		category: "Conversion",
		summary: "Convert between decimal and binary data-size units.",
		component: DataSizeConverterTool,
	},
	{
		id: "date-difference",
		name: "Date Difference Calculator",
		category: "Core",
		summary: "Measure precise elapsed time between two dates.",
		component: DateDifferenceTool,
	},
	{
		id: "http-status-lookup",
		name: "HTTP Status Lookup",
		category: "Parsing",
		summary: "Search HTTP status codes by number, name, or response class.",
		component: HttpStatusLookupTool,
	},
	{
		id: "hmac-generator",
		name: "HMAC Generator",
		category: "Security",
		summary: "Create keyed message digests in hexadecimal and base64.",
		component: HmacGeneratorTool,
	},
	{
		id: "base32-codec",
		name: "Base32 Encode/Decode",
		category: "Encoding",
		summary: "Encode UTF-8 text as RFC 4648 Base32 and decode it safely.",
		component: Base32CodecTool,
	},
	{
		id: "semver-compare",
		name: "Semantic Version Compare",
		category: "Parsing",
		summary: "Compare releases and prereleases using SemVer precedence rules.",
		component: SemVerCompareTool,
	},
	{
		id: "env-json-converter",
		name: ".env / JSON Converter",
		category: "Conversion",
		summary: "Move environment assignments to and from structured JSON.",
		component: EnvJsonConverterTool,
	},
	{
		id: "json-lines-converter",
		name: "JSON Lines Converter",
		category: "Conversion",
		summary: "Convert newline-delimited JSON records to and from JSON arrays.",
		component: JsonLinesConverterTool,
	},
	{
		id: "chmod-calculator",
		name: "Chmod Calculator",
		category: "Security",
		summary:
			"Translate Unix file permissions between octal and symbolic forms.",
		component: ChmodCalculatorTool,
	},
	{
		id: "url-canonicalizer",
		name: "URL Canonicalizer",
		category: "Parsing",
		summary: "Normalize safe web URLs and remove tracking noise.",
		component: UrlCanonicalizerTool,
	},
	{
		id: "mac-address-inspector",
		name: "MAC Address Inspector",
		category: "Parsing",
		summary: "Normalize 48-bit MAC addresses and inspect their address flags.",
		component: MacAddressInspectorTool,
	},
	{
		id: "mime-type-lookup",
		name: "MIME Type Lookup",
		category: "Parsing",
		summary: "Find common media types by extension, family, or exact name.",
		component: MimeTypeLookupTool,
	},
	{
		id: "readability-analyzer",
		name: "Readability Analyzer",
		category: "Core",
		summary: "Measure reading time, document structure, ease, and grade level.",
		component: ReadabilityAnalyzerTool,
	},
	{
		id: "security-headers-auditor",
		name: "Security Headers Auditor",
		category: "Security",
		summary:
			"Audit baseline browser security headers and surface risky values.",
		component: SecurityHeadersAuditorTool,
	},
	{
		id: "json-schema-validator",
		name: "JSON Schema Validator",
		category: "Parsing",
		summary:
			"Validate JSON against draft 4, 6, or 7 schemas with field-level errors.",
		component: JsonSchemaValidatorTool,
	},
	{
		id: "text-redactor",
		name: "Text Redactor",
		category: "Security",
		summary: "Mask common secrets and personal data before sharing text.",
		component: TextRedactorTool,
	},
	{
		id: "mock-data-generator",
		name: "Mock Data Generator",
		category: "Generators",
		summary: "Create repeatable sample records as JSON or CSV.",
		component: MockDataGeneratorTool,
	},
	{
		id: "color-contrast-checker",
		name: "Color Contrast Checker",
		category: "Core",
		summary: "Check WCAG contrast and find accessible foreground alternatives.",
		component: ColorContrastCheckerTool,
	},
	{
		id: "cron-builder",
		name: "Cron Builder",
		category: "Core",
		summary: "Build a schedule visually and preview its next runs.",
		component: CronBuilderTool,
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
const THEME_STORAGE_KEY = "uutil.theme.mode";
const LEGACY_THEME_STORAGE_KEY = "uutil.shiki.theme";
const LEGACY_THEME_VARS_STORAGE_KEY = "uutil.shiki.theme-vars";
const UNIX_IO_LAYOUT_COOKIE_KEY = "uutil.layout.unix-io";
const UNIX_IO_PANEL_IDS = ["unix-input", "unix-output"] as const;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const MOBILE_NAV_EXIT_MS = 200;
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_QR_IMAGE_DIMENSION = 4096;
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
const PASSWORD_STRENGTH_LEVELS = ["weak", "fair", "strong", "excellent"];
const SLUG_SEPARATOR_OPTIONS = [
	{ value: "-", label: "Hyphen (-)" },
	{ value: "_", label: "Underscore (_)" },
];
const DATA_SIZE_UNIT_OPTIONS = DATA_SIZE_UNITS.map((unit) => ({
	value: unit,
	label: unit,
}));
const HMAC_ALGORITHM_OPTIONS = ["SHA256", "SHA512", "SHA1", "MD5"].map(
	(value) => ({ value, label: value }),
);

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
	if (
		id.includes("jwt") ||
		id.includes("certificate") ||
		id.includes("password")
	) {
		return Lock;
	}
	if (id.includes("hash") || id.includes("hmac")) {
		return Fingerprint;
	}
	if (id.includes("uuid") || id.includes("random") || id.includes("lorem")) {
		return Sparkles;
	}
	if (id.includes("qr")) {
		return QrCode;
	}
	if (
		id.includes("cron") ||
		id.includes("unix-time") ||
		id.includes("date-difference")
	) {
		return Clock3;
	}
	if (id.includes("http") || id.includes("cidr")) {
		return Globe;
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

	// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store is not yet available in every supported browser.
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
	const [defaultLayout, setDefaultLayout] = useState<PanelLayout>();

	useEffect(() => {
		setDefaultLayout(
			normalizePanelLayout(readJsonCookie<unknown>(cookieKey), panelIds),
		);
	}, [cookieKey, panelIds]);

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

function getThemeFallbackVars(themeId: string): AppCssVariables {
	return themeId === LIGHT_THEME_ID ? WORKBENCH_LIGHT : WORKBENCH_DARK;
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
};

const AppThemeContext = createContext<AppThemeState>({
	themeId: DEFAULT_THEME_ID,
	themeType: "dark",
});

const ToolQueryContext = createContext<ToolQueryRuntime | null>(null);
const ToolGridContext = createContext<boolean>(false);

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
						pickThemeColor(
							colors,
							["descriptionForeground"],
							sidebarForeground,
						),
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
		flattenColorOn(
			muted,
			background,
			mode === "light" ? lightMutedFallback : darkMutedFallback,
		),
		background,
		mode === "light" ? 6.6 : 4.2,
		mode === "light" ? lightMutedFallback : darkMutedFallback,
	);
	const softReadable = enforceContrast(
		flattenColorOn(
			soft,
			background,
			mode === "light" ? lightSoftFallback : darkSoftFallback,
		),
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

void resolveThemeVariables;

type ToolingAppProps = {
	routedToolId?: string;
	initialUiPreferences: Awaited<ReturnType<typeof getUiPreferences>>;
};

export function ToolingApp({
	routedToolId,
	initialUiPreferences,
}: ToolingAppProps) {
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
	const [navExpanded, setNavExpanded] = useState(
		initialUiPreferences.navExpanded,
	);
	const [navPreferenceLoaded, setNavPreferenceLoaded] = useState(
		initialUiPreferences.hasNavExpandedPreference,
	);
	const [isMobileViewport, setIsMobileViewport] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [paletteQuery, setPaletteQuery] = useState("");
	const [paletteIndex, setPaletteIndex] = useState(0);
	const [themeId, setThemeId] = useState<string>(initialUiPreferences.themeId);
	const [themePreferencesLoaded, setThemePreferencesLoaded] = useState(false);
	const themeVars = useMemo(() => getThemeFallbackVars(themeId), [themeId]);
	const [toolTooltip, setToolTooltip] = useState<ToolTooltipState | null>(null);
	const paletteInputRef = useRef<HTMLInputElement>(null);
	const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
	const mobileNavigationTimerRef = useRef<number | null>(null);
	const toolTooltipTimerRef = useRef<number | null>(null);
	const toolTooltipLastVisibleAtRef = useRef<number>(0);
	const toolPaneRef = useRef<HTMLElement | null>(null);
	const lastDomAutoRunKeyRef = useRef<string>("");

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
	const SelectedToolIcon = getToolIcon(selectedTool);
	const toolQuery = useMemo(
		() => parseToolQueryState(location.searchStr),
		[location.searchStr],
	);
	const toolQueryRuntime = useMemo<ToolQueryRuntime>(() => {
		let inputCursor = 0;
		return {
			queryKey: `${selectedTool.id}|${toolQuery.key}`,
			inputs: toolQuery.inputs,
			action: toolQuery.action,
			autoRun: toolQuery.autoRun,
			registerInput: () => inputCursor++,
		};
	}, [
		selectedTool.id,
		toolQuery.action,
		toolQuery.autoRun,
		toolQuery.inputs,
		toolQuery.key,
	]);

	useEffect(() => {
		if (!toolQueryRuntime.autoRun) {
			return;
		}
		if (toolQueryRuntime.inputs.length === 0 && !toolQueryRuntime.action) {
			return;
		}
		if (lastDomAutoRunKeyRef.current === toolQueryRuntime.queryKey) {
			return;
		}

		const pane = toolPaneRef.current;
		if (!pane) {
			return;
		}

		lastDomAutoRunKeyRef.current = toolQueryRuntime.queryKey;
		const timeout = window.setTimeout(() => {
			const actionButtons = [
				...pane.querySelectorAll<HTMLButtonElement>("[data-tool-action]"),
			];
			const targetAction = toolQueryRuntime.action
				? normalizeActionLabel(toolQueryRuntime.action)
				: null;
			const targetButton = targetAction
				? actionButtons.find(
						(button) => button.dataset.toolAction === targetAction,
					)
				: actionButtons[0];
			targetButton?.click();
		}, 100);

		return () => window.clearTimeout(timeout);
	}, [toolQueryRuntime]);

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
		const savedTheme = [
			readCookieValue(THEME_STORAGE_KEY),
			readCookieValue(LEGACY_THEME_STORAGE_KEY),
			window.localStorage.getItem(THEME_STORAGE_KEY),
			window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY),
		].find(
			(value): value is string =>
				typeof value === "string" && AVAILABLE_THEME_IDS.has(value),
		);

		if (savedTheme) {
			setThemeId(savedTheme);
		}
		setThemePreferencesLoaded(true);
	}, []);

	useEffect(() => {
		if (initialUiPreferences.hasNavExpandedPreference) {
			return;
		}

		const savedNavState = window.localStorage.getItem(NAV_EXPANDED_STORAGE_KEY);
		if (!savedNavState) {
			setNavExpanded(window.innerWidth >= 1024);
		} else {
			setNavExpanded(savedNavState === "1");
		}

		setNavPreferenceLoaded(true);
	}, [initialUiPreferences.hasNavExpandedPreference]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const onResize = () => {
			const nextIsMobile = window.innerWidth < 1280;
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
		if (!themePreferencesLoaded) {
			return;
		}

		writeCookieValue(THEME_STORAGE_KEY, themeId);
		window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
		window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
		window.localStorage.removeItem(LEGACY_THEME_VARS_STORAGE_KEY);
		// biome-ignore lint/suspicious/noDocumentCookie: Remove legacy cookies for backwards compatibility.
		document.cookie = `${LEGACY_THEME_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
		// biome-ignore lint/suspicious/noDocumentCookie: Remove legacy cookies for backwards compatibility.
		document.cookie = `${LEGACY_THEME_VARS_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
	}, [themeId, themePreferencesLoaded]);

	useEffect(() => {
		if (typeof window === "undefined" || !navPreferenceLoaded) {
			return;
		}

		writeCookieValue(NAV_EXPANDED_STORAGE_KEY, navExpanded ? "1" : "0");
		window.localStorage.setItem(
			NAV_EXPANDED_STORAGE_KEY,
			navExpanded ? "1" : "0",
		);
	}, [navExpanded, navPreferenceLoaded]);

	useEffect(() => {
		return () => {
			if (mobileNavigationTimerRef.current !== null) {
				window.clearTimeout(mobileNavigationTimerRef.current);
				mobileNavigationTimerRef.current = null;
			}
			if (toolTooltipTimerRef.current !== null) {
				window.clearTimeout(toolTooltipTimerRef.current);
				toolTooltipTimerRef.current = null;
			}
		};
	}, []);

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
	const desktopSidebarWidth = effectiveNavExpanded ? 280 : 72;

	const commitToolSelection = (toolId: string, restoreMenuFocus = false) => {
		if (toolPaneRef.current) {
			toolPaneRef.current.scrollTop = 0;
		}
		const navigation = navigate({
			to: "/tools/$toolId",
			params: { toolId },
		});
		setSelectedToolId(toolId);

		if (restoreMenuFocus) {
			void navigation.then(() => {
				window.requestAnimationFrame(() => {
					mobileMenuButtonRef.current?.focus({ preventScroll: true });
				});
			});
		}
	};

	const selectTool = (toolId: string) => {
		clearToolTooltip();
		const isMobileNavigation = window.matchMedia("(max-width: 1279px)").matches;

		if (isMobileNavigation && mobileNavOpen) {
			setMobileNavOpen(false);
			window.requestAnimationFrame(() => {
				mobileMenuButtonRef.current?.focus({ preventScroll: true });
			});

			if (mobileNavigationTimerRef.current !== null) {
				window.clearTimeout(mobileNavigationTimerRef.current);
			}
			mobileNavigationTimerRef.current = window.setTimeout(() => {
				commitToolSelection(toolId, true);
				mobileNavigationTimerRef.current = null;
			}, MOBILE_NAV_EXIT_MS);
			return;
		}

		commitToolSelection(toolId);
	};

	const sidebarContent = (
		<div
			className={`mobile-safe-bottom flex h-full flex-col ${effectiveNavExpanded ? "px-3 py-5" : "px-2 py-4"}`}
		>
			<div className="mb-4 flex min-h-9 items-center justify-between gap-2 px-2">
				{effectiveNavExpanded ? (
					<span className="text-sm font-semibold">
						Tool library{" "}
						<span className="ml-1.5 font-mono text-xs font-normal text-[color:var(--app-fg-soft)]">
							{TOOL_REGISTRY.length}
						</span>
					</span>
				) : null}
				<button
					type="button"
					onClick={() => setNavExpanded((current) => !current)}
					className="nav-icon-button hidden xl:flex"
					aria-label={
						effectiveNavExpanded
							? "Collapse tools sidebar"
							: "Expand tools sidebar"
					}
					title={
						effectiveNavExpanded
							? "Collapse tools sidebar"
							: "Expand tools sidebar"
					}
				>
					{effectiveNavExpanded ? (
						<ChevronLeft className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					)}
				</button>
				<button
					type="button"
					onClick={() => setMobileNavOpen(false)}
					className="nav-icon-button flex xl:hidden"
					aria-label="Close tools menu"
				>
					<X className="size-4" />
				</button>
			</div>
			{effectiveNavExpanded ? (
				<div className="mb-5 space-y-3 px-1">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--app-fg-soft)]" />
						<input
							type="search"
							aria-label="Search tools"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Filter tools..."
							className="control-surface min-h-11 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] py-2.5 pl-10 pr-3 text-sm text-[color:var(--app-fg)] placeholder:text-[color:var(--app-fg-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)]"
						/>
					</div>
					<CustomSelect
						value={activeCategory}
						ariaLabel="Tool category"
						onChange={(nextValue) =>
							setActiveCategory(nextValue as "All" | ToolCategory)
						}
						options={categoryOptions}
						size="sm"
					/>
					{search || activeCategory !== "All" ? (
						<p
							className="px-1 text-xs text-[color:var(--app-fg-soft)]"
							role="status"
						>
							{filteredTools.length} matching tools
						</p>
					) : null}
				</div>
			) : null}
			<nav
				aria-label="Utilities"
				className="uutil-scrollbar flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
			>
				<div className="space-y-0.5">
					{filteredTools.map((tool) => {
						const ToolIcon = getToolIcon(tool);
						const isSelected = selectedTool.id === tool.id;
						return (
							<button
								type="button"
								key={tool.id}
								aria-label={`${tool.name}: ${tool.summary}`}
								aria-current={isSelected ? "page" : undefined}
								title={tool.name}
								onClick={() => selectTool(tool.id)}
								onMouseEnter={(event) => scheduleToolTooltip(event, tool)}
								onMouseLeave={clearToolTooltip}
								onFocus={(event) => scheduleToolTooltip(event, tool)}
								onBlur={clearToolTooltip}
								className={`sidebar-tool flex min-h-11 w-full items-center rounded-lg text-left transition-colors ${effectiveNavExpanded ? "gap-3 px-3 py-2" : "justify-center p-2"} ${isSelected ? "bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent)]" : "text-[color:var(--app-fg-muted)] hover:bg-[color:var(--app-surface-bg)] hover:text-[color:var(--app-fg)]"}`}
							>
								<ToolIcon className="size-4 shrink-0" aria-hidden="true" />
								{effectiveNavExpanded ? (
									<span className="min-w-0 truncate text-[13px] font-medium">
										{tool.name}
									</span>
								) : null}
							</button>
						);
					})}
					{filteredTools.length === 0 ? (
						<div className="px-3 py-7 text-sm text-[color:var(--app-fg-muted)]">
							No matching tools.
							<button
								type="button"
								onClick={() => {
									setSearch("");
									setActiveCategory("All");
								}}
								className="mt-3 block text-[color:var(--app-accent)] underline underline-offset-4"
							>
								Clear filters
							</button>
						</div>
					) : null}
				</div>
			</nav>
			<div
				className={`mt-4 flex items-center border-t [border-color:var(--app-border)] pt-4 ${effectiveNavExpanded ? "gap-2 px-2" : "justify-center"}`}
			>
				<Shield
					className="size-4 shrink-0 text-[color:var(--app-fg-soft)]"
					aria-hidden="true"
				/>
				{effectiveNavExpanded ? (
					<p className="text-xs text-[color:var(--app-fg-muted)]">
						Your data stays in your browser.
					</p>
				) : null}
			</div>
		</div>
	);

	const toolWorkspace = (
		<div className="workspace-content mx-auto w-full max-w-[1440px] pb-8">
			<section className="workspace-intro">
				<div className="mb-4 flex items-center gap-2 text-xs text-[color:var(--app-fg-soft)]">
					<span>Tools</span>
					<ChevronRight className="size-3" aria-hidden="true" />
					<span>{selectedTool.category}</span>
				</div>
				<div className="flex items-start gap-3">
					<div className="workspace-symbol">
						<SelectedToolIcon className="size-5" aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<h2 className="font-display text-[clamp(1.5rem,2.8vw,2rem)] font-semibold leading-tight tracking-[-0.04em]">
							{selectedTool.name}
						</h2>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--app-fg-muted)]">
							{selectedTool.summary}
						</p>
					</div>
				</div>
			</section>
			<SelectedToolComponent />
			<footer className="workspace-footer">
				<Lock className="size-3.5" aria-hidden="true" />
				<span>Processed locally. Nothing to install, nothing to upload.</span>
				<span className="ml-auto hidden sm:inline">uutil.space</span>
			</footer>
		</div>
	);

	return (
		<AppThemeContext.Provider value={appTheme}>
			<div
				className="app-shell h-[100dvh] min-h-[100svh] overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--app-fg)]"
				style={themeVars}
				data-theme={appTheme.themeType}
				data-ready={themePreferencesLoaded}
			>
				<a href="#workspace" className="skip-link">
					Skip to workspace
				</a>
				<header className="app-topbar relative z-20">
					<div className="flex h-16 w-full items-center gap-3 px-4 lg:px-6">
						<button
							ref={mobileMenuButtonRef}
							type="button"
							onClick={() => setMobileNavOpen(true)}
							className="nav-icon-button flex xl:hidden"
							aria-label="Open tools menu"
						>
							<Menu className="size-5" />
						</button>
						<a
							href="/"
							className="flex min-w-0 shrink-0 items-center gap-2.5 text-[color:var(--app-fg)] no-underline xl:w-[232px]"
							aria-label="uutil.space home"
						>
							<span className="brand-mark grid size-8 place-items-center rounded-lg font-mono text-sm font-semibold">
								u/
							</span>
							<span className="font-display text-lg font-semibold tracking-[-0.05em]">
								uutil
								<span className="font-normal text-[color:var(--app-fg-soft)]">
									.space
								</span>
							</span>
						</a>
						<span className="hidden text-xs text-[color:var(--app-fg-soft)] lg:block">
							The everyday developer toolkit
						</span>
						<button
							type="button"
							onClick={() => setPaletteOpen(true)}
							aria-label="Open quick tool search"
							aria-keyshortcuts="Control+K Meta+K"
							className="topbar-search ml-auto hidden w-full max-w-[300px] items-center gap-2.5 md:flex"
						>
							<Search className="size-4" />
							<span className="flex-1 text-left">Find a tool...</span>
							<kbd>⌘ K</kbd>
						</button>
						<div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
							<button
								type="button"
								onClick={() => setPaletteOpen(true)}
								aria-label="Open quick tool search"
								aria-keyshortcuts="Control+K Meta+K"
								className="nav-icon-button flex md:hidden"
							>
								<Search className="size-5" />
							</button>
							<ThemeModeToggle
								isLightTheme={isLightTheme}
								onToggle={toggleThemeMode}
							/>
						</div>
					</div>
				</header>
				<div className="h-[calc(100dvh-64px)] w-full xl:flex">
					{mobileNavOpen ? (
						<button
							type="button"
							aria-label="Close tools menu"
							onClick={() => setMobileNavOpen(false)}
							className="fixed inset-x-0 bottom-0 top-16 z-30 xl:hidden"
							style={{ backgroundColor: "var(--app-overlay)" }}
						/>
					) : null}
					<aside
						aria-hidden={isMobileViewport && !mobileNavOpen}
						inert={isMobileViewport && !mobileNavOpen}
						className={`sidebar-panel fixed bottom-0 left-0 top-16 z-40 w-[min(88vw,320px)] border-r [border-color:var(--app-border)] bg-[color:var(--app-sidebar-bg)] transition-transform duration-200 xl:static xl:z-auto xl:h-full xl:shrink-0 xl:translate-x-0 xl:w-[var(--desktop-sidebar-width)] ${mobileNavOpen ? "translate-x-0" : "pointer-events-none -translate-x-[105%] xl:pointer-events-auto"}`}
						style={
							{
								"--desktop-sidebar-width": `${desktopSidebarWidth}px`,
								"--app-fg": "var(--app-sidebar-fg)",
								"--app-fg-muted": "var(--app-sidebar-fg-muted)",
								"--app-fg-soft": "var(--app-sidebar-fg-soft)",
							} as AppCssVariables
						}
					>
						{sidebarContent}
					</aside>
					<div className="h-full min-w-0 flex-1">
						<ToolQueryContext.Provider value={toolQueryRuntime}>
							<main
								id="workspace"
								tabIndex={-1}
								ref={toolPaneRef}
								className="uutil-scrollbar h-full min-w-0 overflow-y-auto overscroll-contain px-4 py-5 outline-none sm:px-6 sm:py-6 lg:px-9 lg:py-7"
							>
								{toolWorkspace}
							</main>
						</ToolQueryContext.Provider>
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
			className="nav-icon-button flex sm:w-auto sm:gap-2 sm:px-3"
		>
			{isLightTheme ? (
				<Sun className="size-3.5" />
			) : (
				<Moon className="size-3.5" />
			)}
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

	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:px-4 sm:pt-[10vh]"
			role="dialog"
			aria-modal="true"
			aria-label="Tool search"
		>
			<button
				type="button"
				aria-label="Close command palette"
				onClick={onClose}
				className="absolute inset-0 backdrop-blur-sm"
				style={{ backgroundColor: "var(--app-overlay)" }}
			/>

			<div className="command-dialog mobile-safe-bottom relative z-10 w-full max-w-2xl overflow-hidden rounded-t-xl border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] shadow-[0_30px_96px_var(--app-shadow)] sm:rounded-xl">
				<div className="border-b [border-color:var(--app-border)] px-4 py-4 sm:px-5">
					<div className="mb-3 flex items-center justify-between">
						<p className="font-display text-sm font-semibold text-[color:var(--app-fg)]">
							Jump to a utility
						</p>
						<span className="rounded-md border [border-color:var(--app-border)] px-2 py-1 font-mono text-[10px] text-[color:var(--app-fg-soft)]">
							ESC
						</span>
					</div>
					<input
						ref={inputRef}
						aria-label="Search all tools"
						type="text"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={`Search ${TOOL_REGISTRY.length} tools by name or task...`}
						className="control-surface min-h-12 w-full rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-4 text-sm text-[color:var(--app-fg)] placeholder:text-[color:var(--app-fg-soft)] focus:border-[color:var(--app-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)]"
					/>
					<p className="mt-2 text-[10px] uppercase tracking-[0.13em] text-[color:var(--app-fg-soft)]">
						Use ↑ ↓ to navigate, Enter to open, Esc to close
					</p>
				</div>

				<div className="uutil-scrollbar max-h-[58vh] overflow-auto p-2.5 sm:p-3">
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
											className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition ${
												resultIndex === selectedIndex
													? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)]"
													: "border-transparent hover:[border-color:var(--app-border)] hover:bg-[color:var(--app-surface-bg)]"
											}`}
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex min-w-0 items-start gap-2">
													<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] text-[color:var(--app-fg-muted)]">
														<ToolIcon className="size-4" />
													</div>
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold text-[color:var(--app-fg)]">
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

function JsonSchemaValidatorTool() {
	const [input, setInput] = useState('{"user":{"name":"Alex","age":17}}');
	const [schema, setSchema] = useState(
		'{"type":"object","properties":{"user":{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"integer","minimum":18}},"required":["name","age"]}},"required":["user"]}',
	);
	const [result, setResult] = useState<ReturnType<
		typeof validateJsonSchema
	> | null>(null);
	const [error, setError] = useState("");
	const host = useRef<HTMLDivElement>(null);
	const worker = useRef<Worker | null>(null);
	useEffect(() => () => worker.current?.terminate(), []);
	const validate = () =>
		new Promise<void>((resolve) => {
			setError("");
			setResult(null);
			worker.current?.terminate();
			const task = new Worker(
				new URL("../lib/schema.worker.ts", import.meta.url),
				{ type: "module" },
			);
			worker.current = task;
			const finish = () => {
				clearTimeout(timeout);
				task.terminate();
				resolve();
			};
			const timeout = setTimeout(() => {
				setError(
					"Validation exceeded 3 seconds. Simplify the schema or input.",
				);
				finish();
			}, 3000);
			task.onmessage = ({ data }) => {
				if (data.error) setError(data.error);
				else setResult(data.result);
				finish();
			};
			task.onerror = () => {
				setError("Could not validate this schema.");
				finish();
			};
			task.postMessage({ input, schema });
		});
	const locate = (property: string | number) => {
		const area = host.current?.querySelector("textarea");
		if (!area) return;
		const needle = JSON.stringify(String(property));
		const start = input.indexOf(needle);
		area.focus();
		area.setSelectionRange(
			Math.max(0, start),
			start < 0 ? input.length : start + needle.length,
		);
	};
	return (
		<div ref={host}>
			<ToolGrid>
				<ToolCard title="JSON document">
					<ToolTextarea
						value={input}
						onChange={setInput}
						placeholder="JSON document to validate"
					/>
					<ActionRow>
						<ActionButton label="Validate schema" onClick={validate} />
					</ActionRow>
					<ErrorText text={error} />
				</ToolCard>
				<ToolCard title="JSON Schema">
					<ToolTextarea
						value={schema}
						onChange={setSchema}
						placeholder="JSON Schema (draft 4, 6, or 7)"
					/>
					<p className="mt-3 text-xs text-[color:var(--app-fg-muted)]">
						Drafts 4, 6, and 7. References must be included locally; nothing is
						fetched.
					</p>
				</ToolCard>
			</ToolGrid>
			{result && (
				<ToolCard
					title={
						result.valid
							? "Valid document"
							: `${result.errors.length} validation errors`
					}
					className="mt-5"
				>
					<div className="space-y-2">
						{result.errors.map((issue, i) => (
							<button
								type="button"
								className="block w-full rounded-lg border p-3 text-left text-sm [border-color:var(--app-border)]"
								key={`${issue.path}-${i}`}
								onClick={() => locate(issue.property)}
							>
								<code>{issue.path || "/"}</code> — {issue.message}
								<span className="block text-xs text-[color:var(--app-fg-muted)]">
									Select field in document
								</span>
							</button>
						))}
					</div>
					<OutputBox value={JSON.stringify(result, null, 2)} />
				</ToolCard>
			)}
		</div>
	);
}

function TextRedactorTool() {
	const [input, setInput] = useState(
		"Contact alex@example.com from 192.168.1.1\nAuthorization: Bearer sample-secret-token",
	);
	const [options, setOptions] = useState({
		emails: true,
		tokens: true,
		ips: true,
		phones: false,
	});
	const [output, setOutput] = useState("");
	const [count, setCount] = useState(0);
	return (
		<ToolGrid>
			<ToolCard title="Text to redact">
				<ToolTextarea
					value={input}
					onChange={setInput}
					placeholder="Paste text to redact"
				/>
				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					{(Object.keys(options) as (keyof typeof options)[]).map((key) => (
						<ToggleBox
							key={key}
							label={
								{
									emails: "Email addresses",
									tokens: "Tokens and secrets",
									ips: "IPv4 addresses",
									phones: "Phone numbers",
								}[key]
							}
							checked={options[key]}
							onChange={(value) =>
								setOptions((current) => ({ ...current, [key]: value }))
							}
						/>
					))}
				</div>
				<ActionRow>
					<ActionButton
						label="Redact text"
						onClick={() => {
							const result = redactText(input, options);
							setOutput(result.text);
							setCount(result.count);
						}}
					/>
				</ActionRow>
				<p className="mt-3 text-xs text-[color:var(--app-fg-muted)]">
					Pattern-based detection is not exhaustive. Review the result before
					sharing.
				</p>
			</ToolCard>
			<ToolCard title={`Redacted output · ${count} matches`}>
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function MockDataGeneratorTool() {
	const [count, setCount] = useState("10"),
		[seed, setSeed] = useState("42"),
		[format, setFormat] = useState("json");
	const [fields, setFields] = useState(
		"id:id\nname:name\nemail:email\nactive:boolean",
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");
	return (
		<ToolGrid>
			<ToolCard title="Record schema">
				<div className="grid gap-4 sm:grid-cols-2">
					<label>
						Records
						<ToolTextInput
							aria-label="Record count"
							type="number"
							value={count}
							onChange={setCount}
							min={1}
							max={1000}
						/>
					</label>
					<label>
						Seed
						<ToolTextInput
							aria-label="Random seed"
							type="number"
							value={seed}
							onChange={setSeed}
						/>
					</label>
				</div>
				<div className="mt-4">
					<ToolLabel text="Fields, one name:type per line" />
					<ToolTextarea
						value={fields}
						onChange={setFields}
						rows={6}
						placeholder="Mock fields (name:type)"
					/>
				</div>
				<p className="my-3 text-xs text-[color:var(--app-fg-muted)]">
					Types: id, name, email, integer, boolean, date, company. Emails use
					example.com. Same seed and schema produce the same records.
				</p>
				<CustomSelect
					value={format}
					onChange={setFormat}
					ariaLabel="Output format"
					options={[
						{ value: "json", label: "JSON" },
						{ value: "csv", label: "CSV" },
					]}
				/>
				<ActionRow>
					<ActionButton
						label="Generate records"
						onClick={() => {
							try {
								const rows = generateMockData(
									Number(count),
									Number(seed),
									fields
										.trim()
										.split(/\n/)
										.map((line) => {
											const [name, type, extra] = line.trim().split(":");
											if (extra || !type)
												throw new Error("Use name:type on each line.");
											return {
												name: name.trim(),
												type: type.trim() as MockFieldType,
											};
										}),
								);
								setOutput(
									format === "csv"
										? Papa.unparse(rows)
										: JSON.stringify(rows, null, 2),
								);
								setError("");
							} catch (e) {
								setOutput("");
								setError((e as Error).message);
							}
						}}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Generated data">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function ColorContrastCheckerTool() {
	const [fg, setFg] = useState("#777777"),
		[bg, setBg] = useState("#ffffff");
	let result: ReturnType<typeof checkContrast> | undefined;
	let error = "";
	try {
		result = checkContrast(fg, bg);
	} catch (e) {
		error = (e as Error).message;
	}
	return (
		<ToolGrid>
			<ToolCard title="Color pair">
				<div className="space-y-4">
					<label className="block">
						Foreground
						<ToolTextInput
							aria-label="Foreground color"
							value={fg}
							onChange={setFg}
						/>
					</label>
					<label className="block">
						Background
						<ToolTextInput
							aria-label="Background color"
							value={bg}
							onChange={setBg}
						/>
					</label>
				</div>
				<ErrorText text={error} />
				{result && (
					<>
						<div
							className="mt-5 rounded-lg border p-6"
							style={{
								color: result.foreground,
								background: result.background,
							}}
						>
							<p className="text-2xl font-bold">Readable by design.</p>
							<p className="mt-2 text-sm">A sample of normal-sized text.</p>
						</div>
						<p className="mt-4 text-xs text-[color:var(--app-fg-muted)]">
							WCAG AA: 4.5:1 normal text, 3:1 large text. AAA: 7:1 normal text.
						</p>
					</>
				)}
			</ToolCard>
			<ToolCard title="Contrast results">
				{result && (
					<>
						<p className="mb-4 font-mono text-4xl">
							{result.ratio.toFixed(2)}:1
						</p>
						<OutputBox
							value={`AA normal: ${result.aa ? "Pass" : "Fail"}\nAAA normal: ${result.aaa ? "Pass" : "Fail"}\nAA large: ${result.large ? "Pass" : "Fail"}`}
							fill={false}
						/>
						<ToolLabel text="Accessible foreground alternatives" />
						<ActionRow>
							{result.alternatives.map((color) => (
								<ActionButton
									key={color}
									label={`${color} · ${checkContrast(color, bg).ratio.toFixed(2)}:1`}
									variant="ghost"
									onClick={() => setFg(color)}
								/>
							))}
						</ActionRow>
					</>
				)}
			</ToolCard>
		</ToolGrid>
	);
}

function CronBuilderTool() {
	const [schedule, setSchedule] = useState<CronSchedule>("daily"),
		[minute, setMinute] = useState("0"),
		[hour, setHour] = useState("9"),
		[day, setDay] = useState("1"),
		[interval, setInterval] = useState("15"),
		[zone, setZone] = useState("UTC");
	let output = "",
		error = "";
	try {
		const cron = buildCron(schedule, +minute, +hour, +day, +interval);
		const expression = CronExpressionParser.parse(cron, { tz: zone });
		output = `${cron}\n\nNext 5 runs (${zone}):\n${Array.from({ length: 5 }, () => expression.next().toDate().toLocaleString("en-US", { timeZone: zone, timeZoneName: "short" })).join("\n")}`;
	} catch (e) {
		error = (e as Error).message;
	}
	return (
		<ToolGrid>
			<ToolCard title="Schedule">
				<div className="space-y-4">
					<CustomSelect
						value={schedule}
						onChange={(v) => setSchedule(v as CronSchedule)}
						ariaLabel="Schedule frequency"
						options={["minutes", "hourly", "daily", "weekly", "monthly"].map(
							(value) => ({
								value,
								label: value[0].toUpperCase() + value.slice(1),
							}),
						)}
					/>
					{schedule === "minutes" ? (
						<label className="block">
							Every N minutes
							<ToolTextInput
								aria-label="Minute interval"
								type="number"
								min={1}
								max={59}
								value={interval}
								onChange={setInterval}
							/>
						</label>
					) : (
						<label className="block">
							Minute
							<ToolTextInput
								aria-label="Schedule minute"
								type="number"
								min={0}
								max={59}
								value={minute}
								onChange={setMinute}
							/>
						</label>
					)}
					{!["minutes", "hourly"].includes(schedule) && (
						<label className="block">
							Hour (24-hour)
							<ToolTextInput
								aria-label="Schedule hour"
								type="number"
								min={0}
								max={23}
								value={hour}
								onChange={setHour}
							/>
						</label>
					)}
					{["weekly", "monthly"].includes(schedule) && (
						<label className="block">
							{schedule === "weekly"
								? "Weekday (0 = Sunday, 6 = Saturday)"
								: "Day of month"}
							<ToolTextInput
								aria-label="Schedule day"
								type="number"
								value={day}
								onChange={setDay}
							/>
						</label>
					)}
					<CustomSelect
						value={zone}
						onChange={setZone}
						ariaLabel="Preview timezone"
						options={[
							{ value: "UTC", label: "UTC" },
							{
								value: Intl.DateTimeFormat().resolvedOptions().timeZone,
								label: "Local timezone",
							},
						].filter(
							(v, i, a) => a.findIndex((x) => x.value === v.value) === i,
						)}
					/>
				</div>
				<p className="mt-4 text-xs text-[color:var(--app-fg-muted)]">
					Five-field cron. Configure your scheduler's timezone separately.
					Minute intervals restart each hour; dates 29–31 skip months without
					that date.
				</p>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Expression and upcoming runs">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function ToolGrid({ children }: { children: React.ReactNode }) {
	return (
		<ToolGridContext.Provider value>
			<div className="tool-grid grid min-w-0 items-stretch gap-5 lg:grid-cols-2">
				{children}
			</div>
		</ToolGridContext.Provider>
	);
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
			className={`tool-card flex h-full min-h-0 min-w-0 flex-col rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] p-4 sm:p-5 ${className ?? ""}`}
		>
			<h3 className="tool-card-title mb-4 flex items-center gap-2 text-sm font-semibold text-[color:var(--app-fg)]">
				<span>{title}</span>
			</h3>
			{children}
		</section>
	);
}

function useToolQueryPrefill(value: string, onChange: (value: string) => void) {
	const queryRuntime = useContext(ToolQueryContext);
	const queryInputIndexRef = useRef<number | null>(null);
	const lastAppliedQueryKeyRef = useRef("");

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
	useToolQueryPrefill(value, onChange);

	return (
		<textarea
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			aria-label={placeholder}
			rows={rows}
			spellCheck={false}
			className={`tool-textarea control-surface w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-4 py-3.5 font-mono text-[13px] leading-6 text-[color:var(--app-fg)] transition placeholder:text-[color:var(--app-fg-soft)] focus:border-[color:var(--app-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)] ${className ?? ""}`}
		/>
	);
}

function ToolTextInput({
	value,
	onChange,
	className,
	type = "text",
	...props
}: Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"onChange" | "type" | "value"
> & {
	value: string | number;
	onChange: (value: string) => void;
	type?: "datetime-local" | "number" | "password" | "search" | "text" | "url";
}) {
	useToolQueryPrefill(String(value), onChange);

	return (
		<input
			{...props}
			type={type}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className={`control-surface min-h-12 w-full rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-4 py-3 text-[16px] text-[color:var(--app-fg)] transition placeholder:text-[color:var(--app-fg-soft)] focus:border-[color:var(--app-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)] sm:text-sm ${className ?? ""}`}
		/>
	);
}

function OutputBox({ value, fill }: { value: string; fill?: boolean }) {
	const isInToolGrid = useContext(ToolGridContext);
	const shouldFill = fill ?? isInToolGrid;
	const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");

	const copy = async () => {
		if (!value) {
			return;
		}

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
		<div
			className={`output-panel flex min-w-0 max-w-full flex-col overflow-hidden rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] ${shouldFill ? "min-h-[240px] flex-1" : "min-h-28"}`}
		>
			<div className="output-toolbar flex min-h-11 items-center justify-between gap-3 border-b [border-color:var(--app-border)] px-3">
				<span className="font-mono text-[11px] text-[color:var(--app-fg-soft)]">
					{value
						? `${value.length.toLocaleString()} characters`
						: "Awaiting output"}
				</span>
				<button
					type="button"
					onClick={copy}
					disabled={!value}
					aria-label={value ? "Copy output" : "No output to copy"}
					className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[color:var(--app-fg-muted)] hover:bg-[color:var(--app-surface-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-ring)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					{copyState === "done" ? (
						<Check className="size-3.5" />
					) : (
						<Copy className="size-3.5" />
					)}
					{copyState === "idle"
						? "Copy"
						: copyState === "done"
							? "Copied"
							: "Retry"}
				</button>
			</div>
			{value ? (
				<pre className="uutil-scrollbar min-h-0 max-w-full flex-1 overflow-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[13px] leading-6 text-[color:var(--app-fg)]">
					{value}
				</pre>
			) : (
				<div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center text-[color:var(--app-fg-soft)]">
					<Braces
						className="size-7 opacity-60"
						strokeWidth={1.25}
						aria-hidden="true"
					/>
					<p className="text-sm">Your result will appear here</p>
					<p className="max-w-[240px] text-xs leading-5">
						Enter your input, then run a tool to see the output.
					</p>
				</div>
			)}
		</div>
	);
}

function ActionRow({
	children,
	className = "mt-4",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`action-row flex flex-wrap items-center gap-2.5 ${className}`}
		>
			{children}
		</div>
	);
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
	const onClickRef = useRef(onClick);
	const [busy, setBusy] = useState(false);
	onClickRef.current = onClick;

	const handleClick = useCallback(async () => {
		setBusy(true);
		try {
			await onClickRef.current();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Action failed";
			toast.error(message);
		} finally {
			setBusy(false);
		}
	}, []);

	return (
		<button
			type="button"
			onClick={() => void handleClick()}
			data-tool-action={normalizeActionLabel(label)}
			disabled={busy}
			aria-busy={busy}
			className={`min-h-11 whitespace-nowrap rounded-lg border px-4 py-2.5 text-[13px] font-semibold transition-colors duration-150 active:translate-y-px disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-panel-bg)] ${
				variant === "default"
					? "action-primary border-transparent text-[color:var(--app-accent-contrast)] hover:brightness-110"
					: "control-surface [border-color:var(--app-border)] bg-[color:var(--app-panel-bg)] text-[color:var(--app-fg-muted)] hover:text-[color:var(--app-fg)]"
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
		<p
			role="alert"
			className="mt-3 rounded-lg border border-[color:color-mix(in_srgb,var(--app-danger)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--app-danger)_10%,transparent)] px-3 py-2.5 text-xs font-medium text-[color:var(--app-danger)]"
		>
			{text}
		</p>
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

function parseJsonSafely(value: string) {
	return JSON.parse(value);
}

type PhpArrayEntry = {
	key: unknown;
	value: unknown;
};

class PhpLiteralParser {
	private readonly source: string;
	private cursor = 0;

	constructor(source: string) {
		this.source = source;
	}

	parse(): unknown {
		this.skipWhitespace();
		if (this.matchKeyword("<?php")) {
			this.skipWhitespace();
		}
		if (this.matchWord("return")) {
			this.skipWhitespace();
		}

		const value = this.parseValue();
		this.skipWhitespace();
		this.matchChar(";");
		this.skipWhitespace();
		if (!this.isDone()) {
			throw new Error("Unexpected trailing PHP content.");
		}
		return value;
	}

	private parseValue(): unknown {
		this.skipWhitespace();
		if (this.isDone()) {
			throw new Error("Expected a PHP value.");
		}

		const char = this.peek();
		if (char === "[" || this.peekWord("array")) {
			return this.parseArray();
		}
		if (char === "'" || char === '"') {
			return this.parseString();
		}
		if (char === "-" || this.isDigit(char)) {
			return this.parseNumber();
		}
		if (this.matchWord("true")) {
			return true;
		}
		if (this.matchWord("false")) {
			return false;
		}
		if (this.matchWord("null")) {
			return null;
		}

		throw new Error(`Unsupported PHP token near '${this.preview()}'.`);
	}

	private parseArray(): unknown {
		this.skipWhitespace();
		let endChar = "]";
		if (this.peek() === "[") {
			this.cursor += 1;
		} else if (this.matchWord("array")) {
			this.skipWhitespace();
			this.expectChar("(");
			endChar = ")";
		} else {
			throw new Error("Invalid PHP array syntax.");
		}

		const entries: PhpArrayEntry[] = [];
		while (true) {
			this.skipWhitespace();
			if (this.matchChar(endChar)) {
				break;
			}

			const first = this.parseValue();
			this.skipWhitespace();

			if (this.matchOperator("=>")) {
				const value = this.parseValue();
				entries.push({ key: first, value });
			} else {
				entries.push({ key: null, value: first });
			}

			this.skipWhitespace();
			if (this.matchChar(",")) {
				continue;
			}
			if (this.matchChar(endChar)) {
				break;
			}

			throw new Error(`Expected ',' or '${endChar}' in PHP array.`);
		}

		return this.normalizeArray(entries);
	}

	private normalizeArray(entries: PhpArrayEntry[]): unknown {
		if (entries.every((entry) => entry.key === null)) {
			return entries.map((entry) => entry.value);
		}

		const output: Record<string, unknown> = {};
		let autoIndex = 0;
		for (const entry of entries) {
			let key: string;
			if (entry.key === null) {
				key = String(autoIndex++);
			} else if (typeof entry.key === "number" && Number.isInteger(entry.key)) {
				key = String(entry.key);
				autoIndex = Math.max(autoIndex, entry.key + 1);
			} else {
				key = String(entry.key);
			}
			output[key] = entry.value;
		}
		return output;
	}

	private parseString(): string {
		const quote = this.peek();
		if (quote !== "'" && quote !== '"') {
			throw new Error("Invalid PHP string.");
		}

		this.cursor += 1;
		let result = "";
		while (!this.isDone()) {
			const char = this.consume();
			if (char === quote) {
				return result;
			}
			if (char !== "\\") {
				result += char;
				continue;
			}

			const next = this.consume();
			switch (next) {
				case "n":
					result += "\n";
					break;
				case "r":
					result += "\r";
					break;
				case "t":
					result += "\t";
					break;
				case "\\":
				case "'":
				case '"':
					result += next;
					break;
				default:
					result += next;
					break;
			}
		}

		throw new Error("Unterminated PHP string literal.");
	}

	private parseNumber(): number {
		const remaining = this.source.slice(this.cursor);
		const match = remaining.match(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
		if (!match) {
			throw new Error("Invalid PHP numeric literal.");
		}
		this.cursor += match[0].length;
		return Number(match[0]);
	}

	private skipWhitespace() {
		while (!this.isDone() && /\s/.test(this.peek())) {
			this.cursor += 1;
		}
	}

	private matchWord(word: string): boolean {
		const segment = this.source.slice(this.cursor, this.cursor + word.length);
		if (segment.toLowerCase() !== word.toLowerCase()) {
			return false;
		}

		const next = this.source[this.cursor + word.length];
		if (next && /[a-z0-9_]/i.test(next)) {
			return false;
		}

		this.cursor += word.length;
		return true;
	}

	private matchKeyword(keyword: string): boolean {
		const segment = this.source.slice(
			this.cursor,
			this.cursor + keyword.length,
		);
		if (segment.toLowerCase() !== keyword.toLowerCase()) {
			return false;
		}
		this.cursor += keyword.length;
		return true;
	}

	private peekWord(word: string): boolean {
		const segment = this.source.slice(this.cursor, this.cursor + word.length);
		return segment.toLowerCase() === word.toLowerCase();
	}

	private matchOperator(operator: string): boolean {
		if (
			this.source.slice(this.cursor, this.cursor + operator.length) !== operator
		) {
			return false;
		}
		this.cursor += operator.length;
		return true;
	}

	private expectChar(expected: string) {
		if (!this.matchChar(expected)) {
			throw new Error(`Expected '${expected}' in PHP source.`);
		}
	}

	private matchChar(char: string): boolean {
		if (this.peek() !== char) {
			return false;
		}
		this.cursor += 1;
		return true;
	}

	private peek(): string {
		return this.source[this.cursor] ?? "";
	}

	private consume(): string {
		const value = this.peek();
		if (!value) {
			throw new Error("Unexpected end of PHP input.");
		}
		this.cursor += 1;
		return value;
	}

	private isDigit(value: string): boolean {
		return value >= "0" && value <= "9";
	}

	private isDone(): boolean {
		return this.cursor >= this.source.length;
	}

	private preview(): string {
		return this.source.slice(this.cursor, this.cursor + 12);
	}
}

function parsePhpToObject(code: string): unknown {
	return new PhpLiteralParser(code).parse();
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

function ToolLabel({ text }: { text: string }) {
	return (
		<p className="mb-2 block text-xs font-medium text-[color:var(--app-fg-muted)]">
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
	ariaLabel = "Select option",
	size = "md",
}: {
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
	className?: string;
	placeholder?: string;
	ariaLabel?: string;
	size?: "sm" | "md";
}) {
	return (
		<div className={`relative ${className ?? ""}`}>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				aria-label={ariaLabel}
				className={`control-surface w-full appearance-none rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] pr-10 text-[color:var(--app-fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--app-ring)] ${size === "sm" ? "min-h-11 py-2 pl-3 text-sm" : "min-h-12 py-2.5 pl-4 text-[16px] sm:text-sm"}`}
			>
				{options.some((option) => option.value === value) ? null : (
					<option value="" disabled>
						{placeholder}
					</option>
				)}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<ChevronDown
				aria-hidden="true"
				className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--app-fg-soft)]"
			/>
		</div>
	);
}

function UnixTimeConverterTool() {
	const panelGroupId = useId();
	const [input, setInput] = useState("1700000000");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");
	const { defaultLayout: defaultUnixLayout, onLayoutChanged: onUnixLayout } =
		usePersistedPanelLayout(UNIX_IO_LAYOUT_COOKIE_KEY, UNIX_IO_PANEL_IDS);

	const convert = (source = input) => {
		try {
			setError("");
			const date = parseTimestampInput(source);

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
		<div>
			<ResizablePanelGroup
				direction="horizontal"
				className="responsive-panels"
				id={panelGroupId}
				defaultLayout={defaultUnixLayout}
				onLayoutChanged={onUnixLayout}
			>
				<ResizablePanel id={UNIX_IO_PANEL_IDS[0]} defaultSize={54} minSize={30}>
					<ToolCard title="Unix time or date string">
						<ToolTextarea
							rows={10}
							value={input}
							onChange={setInput}
							placeholder="1700000000 or 2026-02-24T18:25:00Z"
							className="min-h-0 flex-1 resize-none"
						/>
						<div>
							<ActionRow>
								<ActionButton label="Convert" onClick={convert} />
								<ActionButton
									label="Now"
									variant="ghost"
									onClick={() => {
										const now = `${Math.floor(Date.now() / 1000)}`;
										setInput(now);
										convert(now);
									}}
								/>
							</ActionRow>
							<ErrorText text={error} />
						</div>
					</ToolCard>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel id={UNIX_IO_PANEL_IDS[1]} defaultSize={46} minSize={28}>
					<ToolCard title="Result">
						<OutputBox value={output} fill />
					</ToolCard>
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
		try {
			setError("");
			if (!file.type.startsWith("image/")) {
				throw new Error("Choose a recognized image file.");
			}
			if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
				throw new Error("Images must be 10 MB or smaller.");
			}
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
		} catch (err) {
			setError((err as Error).message);
		}
	};

	const decodeImage = () => {
		try {
			setError("");
			const content = base64.trim();
			if (!content) {
				throw new Error("Provide a base64 payload.");
			}

			if (content.startsWith("data:")) {
				if (!/^data:image\/[a-z\d.+-]+;base64,/i.test(content)) {
					throw new Error("Data URL must contain a base64-encoded image.");
				}
				const payload = content
					.slice(content.indexOf(",") + 1)
					.replace(/\s+/g, "");
				base64ToBytes(payload);
				setPreview(content);
				return;
			}

			if (!/^image\/[a-z\d.+-]+$/i.test(mimeType.trim())) {
				throw new Error("MIME type must be an image type such as image/png.");
			}
			const payload = content.replace(/\s+/g, "");
			base64ToBytes(payload);
			setPreview(`data:${mimeType.trim()};base64,${payload}`);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
			<ToolCard title="Base64 Image Data">
				<div className="space-y-4">
					<div>
						<ToolLabel text="Upload image" />
						<input
							type="file"
							aria-label="Upload image"
							accept="image/*"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) {
									void handleFile(file);
								}
							}}
							className="min-h-10 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3.5 py-2.5 text-sm text-[color:var(--app-fg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-ring)]"
						/>
					</div>

					<div>
						<ToolLabel text="Mime type" />
						<ToolTextInput
							aria-label="MIME type"
							value={mimeType}
							onChange={setMimeType}
						/>
					</div>

					<ToolTextarea
						rows={10}
						value={base64}
						onChange={setBase64}
						placeholder="Paste a base64 string or data URL"
					/>
				</div>

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
				<p className="mt-3 rounded-xl border border-[color:color-mix(in_srgb,var(--app-warm)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--app-warm)_8%,transparent)] px-3.5 py-3 text-xs leading-5 text-[color:var(--app-fg-muted)]">
					Decoding does not verify the signature. Treat claims as untrusted
					until a trusted server validates the token.
				</p>
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
			const result = runRegex(pattern, flags, text, replacement);
			setMatchesOutput(JSON.stringify(result.matches, null, 2));
			setReplaceOutput(result.replacement);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<div className="space-y-4">
			<ToolCard title="Pattern Setup">
				<div className="grid gap-4 md:grid-cols-[1fr_120px]">
					<div>
						<ToolLabel text="Pattern" />
						<ToolTextInput
							aria-label="Regular expression pattern"
							value={pattern}
							onChange={setPattern}
							className="w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
						/>
					</div>
					<div>
						<ToolLabel text="Flags" />
						<ToolTextInput
							aria-label="Regular expression flags"
							value={flags}
							onChange={setFlags}
							className="w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3 py-2 font-mono text-sm"
						/>
					</div>
				</div>
				<div className="mt-4">
					<ToolLabel text="Test text" />
					<ToolTextarea
						rows={7}
						value={text}
						onChange={setText}
						placeholder="Text to test against"
					/>
				</div>
				<div className="mt-4">
					<ToolLabel text="Replacement string" />
					<ToolTextInput
						aria-label="Replacement string"
						value={replacement}
						onChange={setReplacement}
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
			const prepared = /^[a-z][a-z\d+.-]*:/i.test(input)
				? input
				: `https://${input}`;
			const parsed = new URL(prepared);
			const query: Record<string, string | string[]> = {};
			parsed.searchParams.forEach((value, key) => {
				const current = query[key];
				query[key] = current
					? Array.isArray(current)
						? [...current, value]
						: [current, value]
					: value;
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
						username: parsed.username,
						passwordPresent: parsed.password.length > 0,
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
								setOutput(unescapeBackslashes(input));
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
				<ActionRow className="mb-4">
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
				<div className="mb-4 flex flex-wrap items-center gap-2.5">
					<CustomSelect
						value={diffStyle}
						ariaLabel="Diff layout"
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
						ariaLabel="Change granularity"
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
				<p className="mt-3 text-xs leading-5 text-[color:var(--app-fg-soft)]">
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
				<div className="space-y-4">
					<div>
						<ToolLabel text="Value" />
						<ToolTextInput
							aria-label="Number value"
							value={value}
							onChange={setValue}
							className="font-mono"
						/>
					</div>
					<div>
						<ToolLabel text="Base (2-36)" />
						<ToolTextInput
							aria-label="Source base"
							type="number"
							min={2}
							max={36}
							value={fromBase}
							onChange={setFromBase}
							className="font-mono"
						/>
					</div>
				</div>
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
	const [output, setOutput] = useState("");

	const generate = () => {
		setOutput(createLorem(paragraphs));
	};

	return (
		<ToolGrid>
			<ToolCard title="Generator">
				<ToolLabel text="Paragraph count" />
				<ToolTextInput
					aria-label="Paragraph count"
					type="number"
					min={1}
					max={20}
					value={paragraphs}
					onChange={(nextValue) =>
						setParagraphs(Number.parseInt(nextValue, 10) || 1)
					}
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
			if (!file.type.startsWith("image/")) {
				throw new Error("Choose a recognized image file.");
			}
			if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
				throw new Error("QR images must be 10 MB or smaller.");
			}
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
			if (
				image.width > MAX_QR_IMAGE_DIMENSION ||
				image.height > MAX_QR_IMAGE_DIMENSION
			) {
				throw new Error("QR images must be no larger than 4096 × 4096 pixels.");
			}

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
							className="mx-auto mt-4 rounded-lg border [border-color:var(--app-border)] bg-white p-3"
						/>
					) : null}
				</ToolCard>

				<ToolCard title="Reader">
					<ToolLabel text="Upload QR image" />
					<input
						type="file"
						aria-label="Upload QR image"
						accept="image/*"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) {
								void decodeQrFromFile(file);
							}
						}}
						className="min-h-10 w-full rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3.5 py-2.5 text-sm text-[color:var(--app-fg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-ring)]"
					/>
					<div className="mt-4">
						<OutputBox value={decodedOutput} />
					</div>
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
				<div className="mt-4 flex flex-wrap gap-2.5">
					{(["MD5", "SHA1", "SHA256", "SHA512"] as const).map((value) => (
						<button
							key={value}
							type="button"
							onClick={() => setAlgorithm(value)}
							aria-pressed={value === algorithm}
							className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-ring)] ${
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
				<div className="mt-4">
					<ToolLabel text="Dialect" />
					<CustomSelect
						value={dialect}
						ariaLabel="SQL dialect"
						onChange={(nextValue) => setDialect(nextValue as SqlLanguage)}
						options={dialects.map((item) => ({
							value: item,
							label: item,
						}))}
						className="w-full"
					/>
				</div>
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
						hsl: color.hsl().round(2).object(),
						hsv: color.hsv().round(2).object(),
						cmyk: color.cmyk().round(2).array(),
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
				<ToolTextInput
					aria-label="Random string length"
					type="number"
					min={1}
					max={2048}
					value={length}
					onChange={(nextValue) =>
						setLength(Number.parseInt(nextValue, 10) || 1)
					}
				/>

				<div className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
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
		<label
			className={`control-surface flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition focus-within:border-[color:var(--app-accent)] focus-within:ring-2 focus-within:ring-[color:var(--app-ring)] ${
				checked
					? "[border-color:var(--app-border-strong)] bg-[color:var(--app-accent-soft)]"
					: "[border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] hover:[border-color:var(--app-border-strong)]"
			}`}
		>
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="sr-only"
			/>
			<span
				aria-hidden="true"
				className={`grid size-4 shrink-0 place-items-center rounded-[4px] border transition ${
					checked
						? "border-[color:var(--app-accent)] bg-[color:var(--app-accent)] text-[color:var(--app-accent-contrast)]"
						: "[border-color:var(--app-border-strong)] bg-[color:var(--app-surface-bg)]"
				}`}
			>
				{checked ? (
					<Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
				) : null}
			</span>
			<span className="text-sm font-medium text-[color:var(--app-fg)]">
				{label}
			</span>
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
				<div className="mt-4">
					<ToolLabel text="Target language" />
					<CustomSelect
						value={target}
						ariaLabel="Target language"
						onChange={(nextValue) => setTarget(nextValue as CurlTarget)}
						options={[
							{ value: "node-fetch", label: "Node Fetch" },
							{ value: "javascript", label: "JavaScript (fetch)" },
							{ value: "python", label: "Python (requests)" },
							{ value: "go", label: "Go" },
							{ value: "php", label: "PHP" },
						]}
						className="w-full"
					/>
				</div>
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

			await import("reflect-metadata");
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
			<ToolCard title="UTF-8 Output">
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
			<ToolCard title="UTF-8 Text Input">
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

function JsonPathExplorerTool() {
	const [json, setJson] = useState(
		'{"users":[{"name":"Ada","roles":["admin","editor"]}],"build.version":"1.2.3"}',
	);
	const [path, setPath] = useState("$.users[0].name");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const explore = () => {
		try {
			setError("");
			const result = exploreJsonPath(json, path);
			setOutput(JSON.stringify(result, null, 2) ?? "undefined");
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON Document">
				<ToolTextarea
					rows={12}
					value={json}
					onChange={setJson}
					placeholder='{"items":[{"id":1}]}'
				/>
				<div className="mt-4">
					<ToolLabel text="Path" />
					<ToolTextInput
						aria-label="JSON path"
						value={path}
						onChange={setPath}
						placeholder="$.items[0].id"
						className="font-mono"
					/>
				</div>
				<ActionRow>
					<ActionButton label="Explore Path" onClick={explore} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Selected Value">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function QueryStringConverterTool() {
	const [input, setInput] = useState(
		'{"tag":["api","tools"],"page":2,"active":true}',
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = (direction: "json-to-query" | "query-to-json") => {
		try {
			setError("");
			setOutput(
				direction === "json-to-query"
					? jsonToQueryString(input)
					: JSON.stringify(queryStringToJson(input), null, 2),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON or Query String">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="?tag=api&tag=tools&page=2"
				/>
				<ActionRow>
					<ActionButton
						label="JSON → Query"
						onClick={() => convert("json-to-query")}
					/>
					<ActionButton
						label="Query → JSON"
						variant="ghost"
						onClick={() => convert("query-to-json")}
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Converted Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function Ipv4CidrCalculatorTool() {
	const [input, setInput] = useState("192.168.10.42/24");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const calculate = () => {
		try {
			setError("");
			setOutput(JSON.stringify(calculateIpv4Cidr(input), null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="IPv4 Network">
				<ToolLabel text="Address / Prefix" />
				<ToolTextInput
					aria-label="IPv4 CIDR network"
					value={input}
					onChange={setInput}
					placeholder="10.20.30.40/24"
					className="font-mono"
				/>
				<ActionRow>
					<ActionButton label="Calculate Network" onClick={calculate} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Network Details">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function PasswordStrengthTool() {
	const [password, setPassword] = useState("Correct-Horse-42-Battery!");
	const [showPassword, setShowPassword] = useState(false);
	const analysis = analyzePassword(password);

	return (
		<ToolGrid>
			<ToolCard title="Password Input">
				<ToolLabel text="Analyzed locally — never transmitted" />
				<ToolTextInput
					aria-label="Password to analyze"
					type={showPassword ? "text" : "password"}
					value={password}
					onChange={setPassword}
					placeholder="Enter a password"
					className="font-mono"
				/>
				<div className="mt-4">
					<ToggleBox
						label="Show password"
						checked={showPassword}
						onChange={setShowPassword}
					/>
				</div>
				<div className="mt-5 rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] p-4">
					<div className="flex items-center justify-between gap-4">
						<span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--app-fg-muted)]">
							Strength
						</span>
						<span className="text-sm font-semibold text-[color:var(--app-accent-strong)]">
							{analysis.label}
						</span>
					</div>
					<div className="mt-3 grid grid-cols-4 gap-2" aria-hidden="true">
						{PASSWORD_STRENGTH_LEVELS.map((level, index) => (
							<span
								key={level}
								className={`h-1.5 rounded-full transition ${
									index < analysis.score
										? "bg-[color:var(--app-accent)] shadow-[0_0_10px_-3px_var(--app-accent)]"
										: "bg-[color:var(--app-border)]"
								}`}
							/>
						))}
					</div>
				</div>
			</ToolCard>
			<ToolCard title="Strength Report">
				<OutputBox value={JSON.stringify(analysis, null, 2)} />
			</ToolCard>
		</ToolGrid>
	);
}

function SlugGeneratorTool() {
	const [input, setInput] = useState("Crème & API Launch: Summer 2026");
	const [separator, setSeparator] = useState<"-" | "_">("-");
	const slug = createSlug(input, separator);

	return (
		<ToolGrid>
			<ToolCard title="Source Text">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="Article title or phrase"
				/>
				<div className="mt-4">
					<ToolLabel text="Separator" />
					<CustomSelect
						value={separator}
						onChange={(value) => setSeparator(value as "-" | "_")}
						ariaLabel="Slug separator"
						options={SLUG_SEPARATOR_OPTIONS}
					/>
				</div>
			</ToolCard>
			<ToolCard title="Generated Slug">
				<OutputBox value={slug} />
			</ToolCard>
		</ToolGrid>
	);
}

function UnicodeInspectorTool() {
	const [input, setInput] = useState("Hello 👋 café");
	const [output, setOutput] = useState("");

	const inspect = () => {
		setOutput(JSON.stringify(inspectUnicode(input), null, 2));
	};

	return (
		<ToolGrid>
			<ToolCard title="Unicode Text">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="Text, emoji, or symbols"
				/>
				<ActionRow>
					<ActionButton label="Inspect Characters" onClick={inspect} />
				</ActionRow>
			</ToolCard>
			<ToolCard title="Code Points & Encodings">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function DataSizeConverterTool() {
	const [value, setValue] = useState("1");
	const [unit, setUnit] = useState<DataSizeUnit>("MiB");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = () => {
		try {
			setError("");
			const result = convertDataSize(Number(value), unit);
			setOutput(
				JSON.stringify(
					{
						input: `${value} ${unit}`,
						bytes: result.bytes,
						conversions: result.values,
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
			<ToolCard title="Data Size">
				<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
					<div>
						<ToolLabel text="Value" />
						<ToolTextInput
							aria-label="Data size value"
							type="number"
							min={0}
							step="any"
							value={value}
							onChange={setValue}
						/>
					</div>
					<div>
						<ToolLabel text="Source Unit" />
						<CustomSelect
							value={unit}
							onChange={(nextUnit) => setUnit(nextUnit as DataSizeUnit)}
							ariaLabel="Data size source unit"
							options={DATA_SIZE_UNIT_OPTIONS}
						/>
					</div>
				</div>
				<ActionRow>
					<ActionButton label="Convert Size" onClick={convert} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Decimal & Binary Units">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function DateDifferenceTool() {
	const [start, setStart] = useState("2026-01-01T09:00");
	const [end, setEnd] = useState("2026-01-03T11:30");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const calculate = () => {
		try {
			setError("");
			setOutput(JSON.stringify(calculateDateDifference(start, end), null, 2));
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Date Range">
				<div className="space-y-4">
					<div>
						<ToolLabel text="Start" />
						<ToolTextInput
							aria-label="Start date"
							type="datetime-local"
							value={start}
							onChange={setStart}
						/>
					</div>
					<div>
						<ToolLabel text="End" />
						<ToolTextInput
							aria-label="End date"
							type="datetime-local"
							value={end}
							onChange={setEnd}
						/>
					</div>
				</div>
				<ActionRow>
					<ActionButton label="Calculate Difference" onClick={calculate} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Elapsed Time">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function HttpStatusLookupTool() {
	const [query, setQuery] = useState("gateway");
	const results = searchHttpStatuses(query);

	return (
		<ToolGrid>
			<ToolCard title="Status Search">
				<ToolLabel text="Code, name, or response class" />
				<ToolTextInput
					aria-label="HTTP status search"
					value={query}
					onChange={setQuery}
					placeholder="404, gateway, client error..."
				/>
				<p className="mt-4 text-sm text-[color:var(--app-fg-muted)]">
					{results.length} {results.length === 1 ? "status" : "statuses"} found
				</p>
			</ToolCard>
			<ToolCard title="HTTP Reference">
				<div className="uutil-scrollbar max-h-[440px] space-y-2 overflow-auto pr-1">
					{results.length ? (
						results.map((status) => (
							<div
								key={status.code}
								className="flex items-center gap-3 rounded-lg border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] p-3"
							>
								<span className="grid min-w-14 place-items-center rounded-md border border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] px-2 py-1.5 font-mono text-sm font-bold text-[color:var(--app-accent-strong)]">
									{status.code}
								</span>
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-[color:var(--app-fg)]">
										{status.name}
									</p>
									<p className="mt-0.5 text-xs text-[color:var(--app-fg-soft)]">
										{status.category}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="rounded-lg border border-dashed [border-color:var(--app-border)] p-6 text-center text-sm text-[color:var(--app-fg-soft)]">
							No matching HTTP statuses.
						</div>
					)}
				</div>
			</ToolCard>
		</ToolGrid>
	);
}

function HmacGeneratorTool() {
	const [message, setMessage] = useState(
		"The quick brown fox jumps over the lazy dog",
	);
	const [secret, setSecret] = useState("key");
	const [algorithm, setAlgorithm] = useState<HmacAlgorithm>("SHA256");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const generate = () => {
		try {
			setError("");
			setOutput(
				JSON.stringify(generateHmac(message, secret, algorithm), null, 2),
			);
		} catch (err) {
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Message & Secret">
				<ToolLabel text="Message" />
				<ToolTextarea
					rows={8}
					value={message}
					onChange={setMessage}
					placeholder="Message to authenticate"
				/>
				<div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
					<div>
						<ToolLabel text="Secret Key" />
						<ToolTextInput
							aria-label="HMAC secret key"
							type="password"
							value={secret}
							onChange={setSecret}
							placeholder="Secret key"
							className="font-mono"
						/>
					</div>
					<div>
						<ToolLabel text="Algorithm" />
						<CustomSelect
							value={algorithm}
							onChange={(value) => setAlgorithm(value as HmacAlgorithm)}
							ariaLabel="HMAC algorithm"
							options={HMAC_ALGORITHM_OPTIONS}
						/>
					</div>
				</div>
				<ActionRow>
					<ActionButton label="Generate HMAC" onClick={generate} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Message Authentication Code">
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
				<div className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
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

function MetricTile({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] p-3.5">
			<p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--app-fg-soft)]">
				{label}
			</p>
			<p className="mt-1.5 font-mono text-base font-semibold text-[color:var(--app-accent-strong)]">
				{value}
			</p>
		</div>
	);
}

function Base32CodecTool() {
	const [input, setInput] = useState("Ship it 🚀");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const run = (mode: "encode" | "decode") => {
		try {
			setError("");
			setOutput(mode === "encode" ? encodeBase32(input) : decodeBase32(input));
		} catch (err) {
			setOutput("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="UTF-8 / Base32 Input">
				<ToolTextarea
					rows={10}
					value={input}
					onChange={setInput}
					placeholder="Enter UTF-8 text or RFC 4648 Base32"
				/>
				<ActionRow>
					<ActionButton label="Encode Base32" onClick={() => run("encode")} />
					<ActionButton
						label="Decode Base32"
						onClick={() => run("decode")}
						variant="ghost"
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Converted Value">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function SemVerCompareTool() {
	const [left, setLeft] = useState("2.0.0-beta.2");
	const [right, setRight] = useState("2.0.0");
	const [output, setOutput] = useState("");
	const [relation, setRelation] = useState("");
	const [error, setError] = useState("");

	const compare = () => {
		try {
			const result = compareSemVer(left, right);
			setError("");
			setRelation(result.relation);
			setOutput(JSON.stringify(result, null, 2));
		} catch (err) {
			setOutput("");
			setRelation("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Versions">
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<ToolLabel text="Version A" />
						<ToolTextInput
							aria-label="First semantic version"
							value={left}
							onChange={setLeft}
							placeholder="1.0.0-beta.1"
							className="font-mono"
						/>
					</div>
					<div>
						<ToolLabel text="Version B" />
						<ToolTextInput
							aria-label="Second semantic version"
							value={right}
							onChange={setRight}
							placeholder="1.0.0"
							className="font-mono"
						/>
					</div>
				</div>
				<ActionRow>
					<ActionButton label="Compare Versions" onClick={compare} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Precedence Result">
				{relation ? (
					<div className="mb-3 inline-flex rounded-full border border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--app-accent-strong)]">
						Version A is {relation}
					</div>
				) : null}
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function EnvJsonConverterTool() {
	const [input, setInput] = useState(
		'API_URL="https://api.example.com"\nPORT=3000\nFEATURE_FLAG=true',
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = (mode: "env" | "json") => {
		try {
			setError("");
			setOutput(
				mode === "env"
					? JSON.stringify(envToJson(input), null, 2)
					: jsonToEnv(input),
			);
		} catch (err) {
			setOutput("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Configuration Input">
				<ToolTextarea
					rows={12}
					value={input}
					onChange={setInput}
					placeholder="Paste .env assignments or a JSON object"
				/>
				<ActionRow>
					<ActionButton label=".env to JSON" onClick={() => convert("env")} />
					<ActionButton
						label="JSON to .env"
						onClick={() => convert("json")}
						variant="ghost"
					/>
				</ActionRow>
				<p className="mt-3 text-xs leading-5 text-[color:var(--app-fg-soft)]">
					Values are parsed as text and substitutions are never executed.
				</p>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Converted Configuration">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function JsonLinesConverterTool() {
	const [input, setInput] = useState(
		'{"event":"deploy","status":"started"}\n{"event":"deploy","status":"complete"}',
	);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const convert = (mode: "lines" | "json") => {
		try {
			setError("");
			setOutput(
				mode === "lines"
					? JSON.stringify(jsonLinesToJson(input), null, 2)
					: jsonToJsonLines(input),
			);
		} catch (err) {
			setOutput("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="JSON / JSONL Input">
				<ToolTextarea
					rows={13}
					value={input}
					onChange={setInput}
					placeholder="One JSON value per line or a JSON array"
				/>
				<ActionRow>
					<ActionButton
						label="JSONL to JSON"
						onClick={() => convert("lines")}
					/>
					<ActionButton
						label="JSON to JSONL"
						onClick={() => convert("json")}
						variant="ghost"
					/>
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Stream-Friendly Output">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function ChmodCalculatorTool() {
	const [input, setInput] = useState("754");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const calculate = () => {
		try {
			setError("");
			setOutput(JSON.stringify(calculateChmod(input), null, 2));
		} catch (err) {
			setOutput("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Permission Mode">
				<ToolLabel text="Octal or symbolic" />
				<ToolTextInput
					aria-label="Unix permission mode"
					value={input}
					onChange={setInput}
					placeholder="754 or rwxr-xr--"
					className="font-mono"
				/>
				<div className="mt-4 grid grid-cols-3 gap-2">
					{["600", "644", "755"].map((mode) => (
						<button
							type="button"
							key={mode}
							onClick={() => setInput(mode)}
							className="control-surface min-h-10 rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-bg)] font-mono text-xs text-[color:var(--app-fg-muted)] transition hover:text-[color:var(--app-fg)]"
						>
							{mode}
						</button>
					))}
				</div>
				<ActionRow>
					<ActionButton label="Calculate Permissions" onClick={calculate} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Permission Breakdown">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function UrlCanonicalizerTool() {
	const [input, setInput] = useState(
		"https://Example.com/docs/?utm_source=newsletter&b=2&a=1#install",
	);
	const [removeTracking, setRemoveTracking] = useState(true);
	const [removeFragment, setRemoveFragment] = useState(true);
	const [removeTrailingSlash, setRemoveTrailingSlash] = useState(true);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const canonicalize = () => {
		try {
			setError("");
			setOutput(
				canonicalizeUrl(input, {
					removeTracking,
					removeFragment,
					removeTrailingSlash,
				}),
			);
		} catch (err) {
			setOutput("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Source URL">
				<ToolTextInput
					aria-label="URL to canonicalize"
					type="url"
					value={input}
					onChange={setInput}
					placeholder="https://example.com/path?b=2&a=1"
					className="font-mono"
				/>
				<div className="mt-4 grid gap-2.5 sm:grid-cols-2">
					<ToggleBox
						label="Remove tracking"
						checked={removeTracking}
						onChange={setRemoveTracking}
					/>
					<ToggleBox
						label="Remove fragment"
						checked={removeFragment}
						onChange={setRemoveFragment}
					/>
					<ToggleBox
						label="Trim trailing slash"
						checked={removeTrailingSlash}
						onChange={setRemoveTrailingSlash}
					/>
				</div>
				<ActionRow>
					<ActionButton label="Canonicalize URL" onClick={canonicalize} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Canonical URL">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function MacAddressInspectorTool() {
	const [input, setInput] = useState("02-42-ac-11-00-02");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const inspect = () => {
		try {
			setError("");
			setOutput(JSON.stringify(inspectMacAddress(input), null, 2));
		} catch (err) {
			setOutput("");
			setError((err as Error).message);
		}
	};

	return (
		<ToolGrid>
			<ToolCard title="Hardware Address">
				<ToolLabel text="48-bit MAC address" />
				<ToolTextInput
					aria-label="MAC address"
					value={input}
					onChange={setInput}
					placeholder="00:1A:2B:3C:4D:5E"
					className="font-mono uppercase"
				/>
				<p className="mt-3 text-xs leading-5 text-[color:var(--app-fg-soft)]">
					Colon, hyphen, Cisco dot, and compact formats are supported.
				</p>
				<ActionRow>
					<ActionButton label="Inspect Address" onClick={inspect} />
				</ActionRow>
				<ErrorText text={error} />
			</ToolCard>
			<ToolCard title="Address Flags">
				<OutputBox value={output} />
			</ToolCard>
		</ToolGrid>
	);
}

function MimeTypeLookupTool() {
	const [query, setQuery] = useState("json");
	const results = useMemo(() => lookupMimeTypes(query), [query]);

	return (
		<ToolGrid>
			<ToolCard title="Media Type Search">
				<ToolTextInput
					aria-label="MIME type search"
					type="search"
					value={query}
					onChange={setQuery}
					placeholder=".svg, application, markdown..."
				/>
				<p className="mt-4 text-sm text-[color:var(--app-fg-muted)]">
					{results.length} {results.length === 1 ? "match" : "matches"} in the
					local reference
				</p>
			</ToolCard>
			<ToolCard title="MIME Reference">
				<div className="uutil-scrollbar max-h-[440px] space-y-2 overflow-auto pr-1">
					{results.length ? (
						results.map((entry) => (
							<div
								key={entry.mime}
								className="rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] p-3.5"
							>
								<p className="break-all font-mono text-sm font-semibold text-[color:var(--app-fg)]">
									{entry.mime}
								</p>
								<p className="mt-1.5 text-xs text-[color:var(--app-fg-soft)]">
									{entry.extensions.length
										? entry.extensions
												.map((extension) => `.${extension}`)
												.join(", ")
										: "No conventional file extension"}
								</p>
							</div>
						))
					) : (
						<div className="rounded-xl border border-dashed [border-color:var(--app-border)] p-6 text-center text-sm text-[color:var(--app-fg-soft)]">
							No matching MIME types.
						</div>
					)}
				</div>
			</ToolCard>
		</ToolGrid>
	);
}

function ReadabilityAnalyzerTool() {
	const [input, setInput] = useState(
		"Clear writing helps people move quickly. Short sentences make technical ideas easier to understand. Good documentation respects the reader's time.",
	);
	const analysis = useMemo(() => analyzeReadability(input), [input]);

	return (
		<ToolGrid>
			<ToolCard title="Document Input">
				<ToolTextarea
					rows={14}
					value={input}
					onChange={setInput}
					placeholder="Paste prose, documentation, or interface copy"
				/>
				<p className="mt-3 text-xs leading-5 text-[color:var(--app-fg-soft)]">
					Metrics update as you type. Scores are estimates for English prose.
				</p>
			</ToolCard>
			<ToolCard title="Reading Profile">
				<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
					<MetricTile label="Words" value={analysis.words} />
					<MetricTile label="Sentences" value={analysis.sentences} />
					<MetricTile label="Paragraphs" value={analysis.paragraphs} />
					<MetricTile
						label="Reading time"
						value={`${analysis.readingMinutes} min`}
					/>
					<MetricTile label="Reading ease" value={analysis.readingEase} />
					<MetricTile label="Grade level" value={analysis.gradeLevel} />
				</div>
				<div className="mt-3 rounded-xl border border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--app-accent-strong)]">
					Overall: {analysis.label}
				</div>
			</ToolCard>
		</ToolGrid>
	);
}

function SecurityHeadersAuditorTool() {
	const [input, setInput] = useState(
		"HTTP/2 200\nContent-Security-Policy: default-src 'self'; script-src 'self'\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nReferrer-Policy: strict-origin-when-cross-origin",
	);
	const [analysis, setAnalysis] = useState<ReturnType<
		typeof analyzeSecurityHeaders
	> | null>(null);

	const audit = () => setAnalysis(analyzeSecurityHeaders(input));

	return (
		<ToolGrid>
			<ToolCard title="Response Headers">
				<ToolTextarea
					rows={14}
					value={input}
					onChange={setInput}
					placeholder="Paste an HTTP status line and response headers"
				/>
				<ActionRow>
					<ActionButton label="Audit Headers" onClick={audit} />
				</ActionRow>
				<p className="mt-3 text-xs leading-5 text-[color:var(--app-fg-soft)]">
					This tool analyzes pasted text locally and never requests the target
					server.
				</p>
			</ToolCard>
			<ToolCard title="Baseline Security Report">
				{analysis ? (
					<div className="space-y-4">
						<div className="flex items-center justify-between rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] p-4">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--app-fg-soft)]">
									Baseline score
								</p>
								<p className="mt-1 text-sm text-[color:var(--app-fg-muted)]">
									{analysis.present.length} of{" "}
									{analysis.present.length + analysis.missing.length}{" "}
									protections present
								</p>
							</div>
							<p className="font-display text-4xl font-semibold text-[color:var(--app-accent-strong)]">
								{analysis.score}
							</p>
						</div>
						<div>
							<ToolLabel text="Findings" />
							<div className="space-y-2">
								{analysis.findings.map((finding) => (
									<div
										key={finding}
										className="rounded-xl border [border-color:var(--app-border)] bg-[color:var(--app-surface-alt)] px-3.5 py-3 text-xs leading-5 text-[color:var(--app-fg-muted)]"
									>
										{finding}
									</div>
								))}
							</div>
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed [border-color:var(--app-border)] p-6 text-center text-sm text-[color:var(--app-fg-soft)]">
						Run the audit to review the baseline response protections.
					</div>
				)}
			</ToolCard>
		</ToolGrid>
	);
}
