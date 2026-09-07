import type { LocalTool } from "./types";
export const tool: LocalTool = {
	fields: [
		{
			key: "url",
			label: "Destination URL",
			value: "https://example.com/docs?ref=guide#quickstart",
		},
		{
			key: "source",
			label: "Campaign source",
			type: "text",
			value: "newsletter",
		},
		{ key: "medium", label: "Campaign medium", type: "text", value: "email" },
		{
			key: "campaign",
			label: "Campaign name",
			type: "text",
			value: "autumn-launch",
		},
		{
			key: "term",
			label: "Campaign term (optional)",
			type: "text",
			value: "",
			optional: true,
		},
		{
			key: "content",
			label: "Campaign content (optional)",
			type: "text",
			value: "primary-cta",
			optional: true,
		},
		{
			key: "existing",
			label: "Existing campaign parameters",
			type: "select",
			value: "Replace",
			options: ["Replace", "Preserve existing"],
		},
	],
	filename: "campaign-url.txt",
	smoke: "utm_source=newsletter",
	help: "Build campaign links without visiting the destination. Supports HTTP(S) only and rejects embedded credentials. Existing unrelated query parameters and fragments are retained. Replace also removes optional UTM parameters left blank; Preserve existing leaves existing values untouched. Parameter values are URL-encoded.",
	run: (v) => {
		const url = new URL(v.url.trim());
		if (
			!["http:", "https:"].includes(url.protocol) ||
			url.username ||
			url.password
		)
			throw new Error("Use an HTTP(S) URL without embedded credentials.");
		for (const key of ["source", "medium", "campaign", "term", "content"]) {
			const name = `utm_${key}`,
				value = v[key].trim();
			if (v.existing === "Preserve existing" && url.searchParams.has(name))
				continue;
			url.searchParams.delete(name);
			if (value) url.searchParams.set(name, value);
		}
		return url.toString();
	},
};
