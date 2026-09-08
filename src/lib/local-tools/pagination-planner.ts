import { integer, type LocalTool, print } from "./types";
export const tool: LocalTool = {
	fields: [
		{ key: "total", label: "Total records", type: "text", value: "237" },
		{ key: "size", label: "Page size", type: "text", value: "25" },
		{ key: "page", label: "Requested page", type: "text", value: "3" },
		{
			key: "base",
			label: "Page numbering",
			type: "select",
			value: "One-based",
			options: ["One-based", "Zero-based"],
		},
		{
			key: "bounds",
			label: "Out-of-range pages",
			type: "select",
			value: "Clamp",
			options: ["Clamp", "Error"],
		},
		{
			key: "radius",
			label: "Adjacent pages on each side",
			type: "text",
			value: "2",
		},
	],
	filename: "pagination-plan.json",
	smoke: '"offset": 50',
	help: "Plans offset-based pagination; no database or API request runs. Record ranges are always 1-based and inclusive, while API page numbers follow your selected convention. Navigation includes first/last pages and gap ranges. Empty datasets return no active page or navigation, regardless of requested page. Clamp resolves out-of-range requests; Error rejects them. Supports safe-integer record counts using exact intermediate arithmetic, page sizes up to 100,000, and a window radius up to 10.",
	run: (v) => {
		const total = integer(v.total, 0, Number.MAX_SAFE_INTEGER),
			size = integer(v.size, 1, 100000),
			requested = integer(v.page, 0, Number.MAX_SAFE_INTEGER),
			base = v.base === "One-based" ? 1 : 0,
			radius = integer(v.radius, 0, 10);
		const pages = Number((BigInt(total) + BigInt(size) - 1n) / BigInt(size));
		if (pages === 0)
			return print({
				totalRecords: 0,
				totalPages: 0,
				page: null,
				pageSize: size,
				offset: 0,
				limit: size,
				recordsOnPage: 0,
				recordRange: null,
				hasPrevious: false,
				hasNext: false,
				previousPage: null,
				nextPage: null,
				navigation: [],
				pageQuery: null,
				offsetQuery: `?offset=0&limit=${size}`,
			});
		const requestedIndex = requested - base;
		if (v.bounds === "Error" && (requestedIndex < 0 || requestedIndex >= pages))
			throw new Error("Requested page is outside the available range.");
		const index = Math.max(0, Math.min(pages - 1, requestedIndex)),
			page = index + base,
			offset = Number(BigInt(index) * BigInt(size)),
			count = Math.min(size, total - offset),
			indices = new Set<number>([0, pages - 1]);
		for (
			let i = Math.max(0, index - radius);
			i <= Math.min(pages - 1, index + radius);
			i++
		)
			indices.add(i);
		const sorted = [...indices].sort((a, b) => a - b),
			navigation: (
				| { page: number; current: boolean }
				| { gap: true; from: number; to: number }
			)[] = [];
		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i] - sorted[i - 1] > 1)
				navigation.push({
					gap: true,
					from: sorted[i - 1] + 1 + base,
					to: sorted[i] - 1 + base,
				});
			navigation.push({ page: sorted[i] + base, current: sorted[i] === index });
		}
		return print({
			totalRecords: total,
			totalPages: pages,
			requestedPage: requested,
			page,
			pageSize: size,
			wasClamped: page !== requested,
			offset,
			limit: size,
			recordsOnPage: count,
			recordRange: { first: offset + 1, last: offset + count },
			hasPrevious: index > 0,
			hasNext: index < pages - 1,
			previousPage: index > 0 ? page - 1 : null,
			nextPage: index < pages - 1 ? page + 1 : null,
			navigation,
			pageQuery: `?page=${page}&pageSize=${size}`,
			offsetQuery: `?offset=${offset}&limit=${size}`,
		});
	},
};
