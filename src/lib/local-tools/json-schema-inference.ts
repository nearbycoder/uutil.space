import { json, type LocalTool, object, print } from "./types";
export function inferSchema(
	samples: unknown[],
	required: boolean,
	allowExtra: boolean,
): Record<string, unknown> {
	if (!samples.length) return {};
	const groups = new Map<string, unknown[]>();
	for (const sample of samples) {
		const type =
			sample === null
				? "null"
				: Array.isArray(sample)
					? "array"
					: typeof sample === "number"
						? Number.isInteger(sample)
							? "integer"
							: "number"
						: typeof sample;
		groups.set(type, [...(groups.get(type) ?? []), sample]);
	}
	if (groups.has("number") && groups.has("integer")) {
		groups.set("number", [
			...(groups.get("number") ?? []),
			...(groups.get("integer") ?? []),
		]);
		groups.delete("integer");
	}
	const schemas = [...groups].map(([type, values]): Record<string, unknown> => {
		if (type === "array")
			return {
				type,
				items: inferSchema(
					(values as unknown[][]).flat(),
					required,
					allowExtra,
				),
			};
		if (type !== "object") return { type };
		const objects = values.filter(object),
			keys = [...new Set(objects.flatMap(Object.keys))];
		return {
			type,
			properties: Object.fromEntries(
				keys.map((key) => [
					key,
					inferSchema(
						objects
							.filter((item) => Object.hasOwn(item, key))
							.map((item) => item[key]),
						required,
						allowExtra,
					),
				]),
			),
			...(required
				? {
						required: keys.filter((key) =>
							objects.every((item) => Object.hasOwn(item, key)),
						),
					}
				: {}),
			additionalProperties: allowExtra,
		};
	});
	return schemas.length === 1 ? schemas[0] : { anyOf: schemas };
}
export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "Sample JSON document",
			value:
				'[{"id":1,"name":"Alex","active":true},{"id":2,"name":"Sam","note":null}]',
		},
		{
			key: "required",
			label: "Required properties",
			type: "select",
			value: "Observed in every object",
			options: ["Observed in every object", "None"],
		},
		{
			key: "extra",
			label: "Additional properties",
			type: "select",
			value: "Allow",
			options: ["Allow", "Disallow"],
		},
	],
	filename: "inferred-schema.json",
	smoke: "additionalProperties",
	help: "Infers draft-7 types from one sample document, combining heterogeneous array items and marking only consistently present keys required. Empty arrays cannot reveal item types. No formats, enums or business rules are guessed; review before using for validation.",
	run: (v) =>
		print({
			$schema: "http://json-schema.org/draft-07/schema#",
			...inferSchema(
				[json(v.input)],
				v.required !== "None",
				v.extra === "Allow",
			),
		}),
};
