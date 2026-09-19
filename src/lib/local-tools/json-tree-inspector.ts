import { integer, json, type LocalTool, print } from "./types";

export const tool: LocalTool = {
	fields: [
		{
			key: "input",
			label: "JSON document",
			value:
				'{"user":{"name":"Alex","active":true},"tags":["local","fast"],"empty":null}',
		},
		{
			key: "filter",
			label: "Nodes to show",
			type: "select",
			value: "All",
			options: ["All", "Leaves", "Containers"],
		},
		{
			key: "depth",
			label: "Maximum displayed depth",
			type: "text",
			value: "10",
		},
	],
	help: "Inspect JSON types, depths and escaped JSON Pointer paths without changing the document. Container size counts immediate children; string size counts Unicode code points. The root pointer is an empty string. Totals always cover the full tree; display depth and filters only affect the node list. Limited to 10,000 nodes and 80 levels.",
	filename: "json-tree.json",
	smoke: '"pointer": "/user/name"',
	run: (v) => {
		const value = json(v.input),
			depthLimit = integer(v.depth, 0, 80);
		const nodes: {
			pointer: string;
			type: string;
			depth: number;
			size?: number;
		}[] = [];
		const counts: Record<string, number> = {};
		let pointerCharacters = 0;
		let total = 0,
			maxDepth = 0;
		const visit = (item: unknown, pointer: string, depth: number) => {
			pointerCharacters += pointer.length;
			if (pointerCharacters > 1000000)
				throw new Error(
					"Expanded pointer paths exceed 1 MB; shorten keys or reduce nesting.",
				);
			if (++total > 10000)
				throw new Error("Use a document with at most 10,000 nodes.");
			maxDepth = Math.max(maxDepth, depth);
			const type =
				item === null ? "null" : Array.isArray(item) ? "array" : typeof item;
			counts[type] = (counts[type] ?? 0) + 1;
			const container = item !== null && typeof item === "object";
			if (
				depth <= depthLimit &&
				(v.filter === "All" || (v.filter === "Containers") === container)
			) {
				const size = container
					? Object.keys(item).length
					: typeof item === "string"
						? [...item].length
						: undefined;
				nodes.push({ pointer, type, depth, size });
			}
			if (container)
				for (const [key, child] of Object.entries(item))
					visit(
						child,
						`${pointer}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
						depth + 1,
					);
		};
		visit(value, "", 0);
		return print({
			totalNodes: total,
			maxDepth,
			counts,
			displayedNodes: nodes.length,
			nodes,
		});
	},
};
