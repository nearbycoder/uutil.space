/* CACHE, FILES and ROUTES are injected by build-offline.mjs. No user inputs are cached. */
self.addEventListener("install", event => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE);
		try {
			// Bound concurrency so preparing offline mode does not flood the server.
			for (let index = 0; index < FILES.length; index += 6) {
				await Promise.all(FILES.slice(index, index + 6).map(async url => {
					const response = await fetch(new Request(url, { credentials: "omit", cache: "reload" }));
					if (!response.ok) throw new Error(`Offline download failed: ${url}`);
					await cache.put(url, response);
				}));
			}
		} catch (error) { await caches.delete(CACHE); throw error; }
	})());
});
self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		for (const name of await caches.keys()) if (name.startsWith("uutil-offline-") && name !== CACHE) await caches.delete(name);
		await self.clients.claim();
	})());
});
self.addEventListener("message", event => { if (event.data === "ACTIVATE_UPDATE") self.skipWaiting(); });
self.addEventListener("fetch", event => {
	const url = new URL(event.request.url);
	if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
	if (event.request.mode === "navigate" && ROUTES.includes(url.pathname)) {
		event.respondWith(fetch(event.request).catch(async () => {
			// Only pre-cached anonymous shells; never store navigations with cookies or query input.
			const cached = await (await caches.open(CACHE)).match(url.pathname, { ignoreVary: true });
			return cached ?? new Response("This page is not available offline. Reconnect and prepare offline mode again.", { status: 503, headers: { "Content-Type": "text/plain" } });
		}));
		return;
	}
	if (!url.search && FILES.includes(url.pathname) && !ROUTES.includes(url.pathname)) {
		event.respondWith((async () => (await (await caches.open(CACHE)).match(url.pathname)) ?? fetch(event.request))());
	}
});
