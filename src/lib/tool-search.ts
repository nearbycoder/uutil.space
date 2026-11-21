export type SearchableTool = {
	id: string;
	name: string;
	summary: string;
	category: string;
};

export function tokenizeQuery(query: string): string[] {
	return query
		.trim()
		.toLowerCase()
		.split(/[\s/._-]+/)
		.filter(Boolean);
}

function scoreToolMatch(
	tool: SearchableTool,
	normalizedQuery: string,
	tokens: string[],
): number {
	const name = tool.name.toLowerCase();
	const id = tool.id.toLowerCase();
	const category = tool.category.toLowerCase();
	const summary = tool.summary.toLowerCase();
	const haystack = `${name} ${id} ${category} ${summary}`;

	for (const token of tokens) {
		if (!haystack.includes(token)) return -1;
	}

	if (name === normalizedQuery || id === normalizedQuery) return 1000;
	if (name.startsWith(normalizedQuery)) return 800;

	const nameWords = name.split(/[\s/._-]+/).filter(Boolean);
	if (
		tokens.every((token) => nameWords.some((word) => word.startsWith(token)))
	) {
		return 650 + (nameWords[0]?.startsWith(tokens[0]) ? 40 : 0);
	}

	if (name.includes(normalizedQuery)) return 550;

	const nameAndId = `${name} ${id}`;
	if (tokens.every((token) => nameAndId.includes(token))) {
		return 420 + (name.startsWith(tokens[0]) ? 30 : 0);
	}

	if (category.includes(normalizedQuery) || summary.includes(normalizedQuery)) {
		return 280;
	}

	return 160;
}

/**
 * Filter and rank tools with multi-token matching across name, id, category,
 * and summary. Preserves original order when query is empty or scores tie.
 */
export function filterAndRankTools<T extends SearchableTool>(
	tools: readonly T[],
	query: string,
): T[] {
	const normalizedQuery = query.trim().toLowerCase();
	const tokens = tokenizeQuery(query);
	if (tokens.length === 0) return [...tools];

	const scored: Array<{ tool: T; score: number; index: number }> = [];
	for (let index = 0; index < tools.length; index += 1) {
		const tool = tools[index];
		const score = scoreToolMatch(tool, normalizedQuery, tokens);
		if (score >= 0) scored.push({ tool, score, index });
	}

	scored.sort((a, b) => b.score - a.score || a.index - b.index);
	return scored.map((entry) => entry.tool);
}

export function formatTextStats(text: string): string {
	if (!text) return "";
	const chars = text.length.toLocaleString();
	const charUnit = text.length === 1 ? "character" : "characters";
	const lines = text.split(/\r?\n/).length;
	return lines > 1
		? `${chars} ${charUnit} · ${lines.toLocaleString()} lines`
		: `${chars} ${charUnit}`;
}
