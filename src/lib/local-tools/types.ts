export type Values = Record<string, string>;
export type Field = {
	key: string;
	label: string;
	value: string;
	type?: "text" | "select";
	options?: string[];
	help?: string;
	optional?: boolean;
};
export type LocalTool = {
	fields: Field[];
	help: string;
	filename: string;
	run: (values: Values) => string;
	smoke: string;
};
export function defaults(tool: LocalTool): Values {
	return Object.fromEntries(
		tool.fields.map((field) => [field.key, field.value]),
	);
}
export function execute(tool: LocalTool, values: Values): string {
	if (Object.values(values).join("").length > 200_000)
		throw new Error("Keep combined input below 200,000 characters.");
	for (const field of tool.fields) {
		if (!field.optional && !values[field.key]?.trim())
			throw new Error(`${field.label} is required.`);
		if (field.options && !field.options.includes(values[field.key]))
			throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
	}
	const result = tool.run(values);
	if (result.length > 2_000_000)
		throw new Error("Result exceeds 2 MB. Reduce the input or output size.");
	return result;
}
export function json(text: string): unknown {
	const value: unknown = JSON.parse(text);
	const visit = (item: unknown, depth: number) => {
		if (depth > 80) throw new Error("JSON nesting exceeds 80 levels.");
		if (
			typeof item === "number" &&
			(!Number.isFinite(item) ||
				(Number.isInteger(item) && !Number.isSafeInteger(item)))
		)
			throw new Error(
				"Use strings for integers outside JavaScript's safe range.",
			);
		if (item && typeof item === "object")
			for (const child of Object.values(item)) visit(child, depth + 1);
	};
	visit(value, 0);
	return value;
}
export function object(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function print(value: unknown): string {
	return JSON.stringify(value, null, 2);
}
export function integer(value: string, min: number, max: number): number {
	const number = Number(value);
	if (
		!value.trim() ||
		!Number.isInteger(number) ||
		number < min ||
		number > max
	)
		throw new Error(`Enter a whole number between ${min} and ${max}.`);
	return number;
}
