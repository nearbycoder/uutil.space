import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: string }>;
};
export function useOffline() {
	const [status, setStatus] = useState("Offline mode is not enabled.");
	const [busy, setBusy] = useState(false);
	const [enabled, setEnabled] = useState(false);
	const [online, setOnline] = useState(true);
	const [canInstall, setCanInstall] = useState(false);
	const [updateReady, setUpdateReady] = useState(false);
	const prompt = useRef<InstallEvent | null>(null);
	const registration = useRef<ServiceWorkerRegistration | null>(null);
	const reload = useRef(false);
	useEffect(() => {
		const connectivity = () => setOnline(navigator.onLine);
		connectivity();
		const install = (event: Event) => {
			event.preventDefault();
			prompt.current = event as InstallEvent;
			setCanInstall(true);
		};
		const installed = () => {
			prompt.current = null;
			setCanInstall(false);
		};
		const changed = () => {
			if (reload.current) location.reload();
		};
		window.addEventListener("online", connectivity);
		window.addEventListener("offline", connectivity);
		window.addEventListener("beforeinstallprompt", install);
		window.addEventListener("appinstalled", installed);
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.addEventListener("controllerchange", changed);
			void navigator.serviceWorker
				.getRegistration("/")
				.then((reg) => {
					if (reg?.active) {
						registration.current = reg;
						setEnabled(true);
						setStatus("All tools are prepared for offline use.");
						setUpdateReady(Boolean(reg.waiting));
						reg.onupdatefound = () => {
							const worker = reg.installing;
							if (worker)
								worker.onstatechange = () => {
									if (worker.state === "installed")
										setUpdateReady(Boolean(reg.waiting));
								};
						};
						void reg.update().catch(() => {});
					}
				})
				.catch(() => {});
		}
		return () => {
			window.removeEventListener("online", connectivity);
			window.removeEventListener("offline", connectivity);
			window.removeEventListener("beforeinstallprompt", install);
			window.removeEventListener("appinstalled", installed);
			navigator.serviceWorker?.removeEventListener("controllerchange", changed);
		};
	}, []);
	const enable = async () => {
		if (!import.meta.env.PROD) {
			setStatus("Offline mode is available in production builds.");
			return;
		}
		if (!("serviceWorker" in navigator)) {
			setStatus("This browser does not support offline installation.");
			return;
		}
		setBusy(true);
		setStatus("Downloading app files and tool pages. Keep this tab open…");
		try {
			const reg = await navigator.serviceWorker.register("/sw.js", {
				scope: "/",
				updateViaCache: "none",
			});
			registration.current = reg;
			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(
					() =>
						reject(
							new Error(
								"Download timed out. Check your connection and try again.",
							),
						),
					120_000,
				);
				const check = () => {
					if (reg.active || reg.waiting) {
						clearTimeout(timer);
						resolve();
					} else if (reg.installing?.state === "redundant") {
						clearTimeout(timer);
						reject(
							new Error(
								"Offline download failed. Check your connection or browser storage.",
							),
						);
					}
				};
				if (reg.installing)
					reg.installing.addEventListener("statechange", check);
				check();
			});
			setEnabled(true);
			setUpdateReady(Boolean(reg.waiting));
			setStatus("All tools are prepared for offline use.");
		} catch (e) {
			setStatus((e as Error).message);
		} finally {
			setBusy(false);
		}
	};
	const remove = async () => {
		setBusy(true);
		try {
			const reg = await navigator.serviceWorker.getRegistration("/");
			await reg?.unregister();
			for (const key of await caches.keys())
				if (key.startsWith("uutil-offline-")) await caches.delete(key);
			setEnabled(false);
			setUpdateReady(false);
			setStatus(
				"Offline files removed. Saved workspace items are unchanged. Reload to finish disabling offline mode.",
			);
		} catch {
			setStatus(
				"Could not remove offline files. Try your browser's site-storage settings.",
			);
		} finally {
			setBusy(false);
		}
	};
	const install = async () => {
		const event = prompt.current;
		if (!event) return;
		try {
			await event.prompt();
			await event.userChoice;
		} finally {
			prompt.current = null;
			setCanInstall(false);
		}
	};
	const update = () => {
		if (registration.current?.waiting) {
			reload.current = true;
			registration.current.waiting.postMessage("ACTIVATE_UPDATE");
		}
	};
	return {
		status,
		busy,
		enabled,
		online,
		canInstall,
		updateReady,
		enable,
		remove,
		install,
		update,
	};
}
