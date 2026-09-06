import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import type { Plugin } from "vite";

/** Emit before Nitro indexes public assets, so /sw.js is served in production. */
export function offlinePlugin(): Plugin {
	return {
		name: "uutil-offline-worker",
		apply: "build",
		applyToEnvironment: environment => environment.name === "client",
		generateBundle: {
			order: "post",
			async handler(_options, bundle) {
				const assets = Object.keys(bundle).filter(name => /\.(?:js|css|wasm)$/.test(name)).map(name => `/${name}`);
				for (const name of await readdir("public/fonts")) if (name.endsWith(".woff2")) assets.push(`/fonts/${name}`);
				const source = await readFile("src/routes/index.tsx", "utf8");
				const routes = ["/", ...[...source.matchAll(/id: "([^"]+)",\s*name: "([^"]+)"/g)].map(match => `/tools/${match[1]}`)];
				const files = [...new Set([...assets, ...routes, "/manifest.json", "/icon.svg", "/app-icon-192.png", "/app-icon-512.png"])].sort();
				const template = await readFile("scripts/service-worker.js", "utf8");
				const version = createHash("sha256").update(files.join("\n")).update(template).digest("hex").slice(0, 12);
				this.emitFile({ type: "asset", fileName: "sw.js", source: `const CACHE = ${JSON.stringify(`uutil-offline-${version}`)};\nconst FILES = ${JSON.stringify(files)};\nconst ROUTES = ${JSON.stringify(routes)};\n${template}` });
				console.log(`Offline worker: ${assets.length} static assets and ${routes.length} anonymous route shells (${version}).`);
			},
		},
	};
}
