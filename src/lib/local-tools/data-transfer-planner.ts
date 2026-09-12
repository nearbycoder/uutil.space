import { integer, type LocalTool, print } from "./types";

const sizes: Record<string, number> = {
	B: 1,
	KB: 1000,
	MB: 1e6,
	GB: 1e9,
	TB: 1e12,
	KiB: 1024,
	MiB: 1024 ** 2,
	GiB: 1024 ** 3,
	TiB: 1024 ** 4,
};
const rates: Record<string, number> = {
	"bit/s": 1,
	Kbps: 1000,
	Mbps: 1e6,
	Gbps: 1e9,
	"MB/s": 8e6,
	"MiB/s": 8 * 1024 ** 2,
};
function number(s: string, min: number, max: number) {
	if (!/^(?:\d+\.?\d*|\.\d+)$/.test(s.trim()))
		throw new Error("Enter a non-negative decimal number.");
	const n = Number(s);
	if (!Number.isFinite(n) || n < min || n > max)
		throw new Error("Numeric input is outside the supported range.");
	return n;
}
export const tool: LocalTool = {
	fields: [
		{ key: "input", label: "Size per file", type: "text", value: "10" },
		{
			key: "sizeUnit",
			label: "File size unit",
			type: "select",
			value: "MiB",
			options: Object.keys(sizes),
		},
		{ key: "files", label: "Equal-sized file count", type: "text", value: "4" },
		{ key: "rate", label: "Connection rate", type: "text", value: "100" },
		{
			key: "rateUnit",
			label: "Rate unit",
			type: "select",
			value: "Mbps",
			options: Object.keys(rates),
		},
		{
			key: "overhead",
			label: "Capacity lost to overhead (%)",
			type: "text",
			value: "10",
		},
		{
			key: "concurrency",
			label: "Simultaneous transfers",
			type: "text",
			value: "2",
		},
		{
			key: "model",
			label: "Bandwidth model",
			type: "select",
			value: "Shared total rate",
			options: ["Shared total rate", "Rate per transfer"],
		},
		{
			key: "setup",
			label: "Setup delay per batch (seconds)",
			type: "text",
			value: "0.2",
		},
	],
	filename: "transfer-plan.json",
	smoke: '"files": 4',
	help: "An estimate, not a speed test: nothing is uploaded or downloaded. All files are assumed equal-sized, with constant rates and no retries/compression. Decimal KB/MB use powers of 1,000; KiB/MiB use powers of 1,024; eight bits equal one byte. Overhead is the fraction of link capacity unavailable to payload. Shared rate is redistributed across active transfers; per-transfer mode assumes independent capacity. Each batch pays the setup delay; batches do not overlap. Count/concurrency 1–10,000, overhead 0–99.9%, size/rate up to 10^12 and setup up to one day.",
	run: (v) => {
		const bytesPerFile = number(v.input, 0, 1e12) * sizes[v.sizeUnit],
			files = integer(v.files, 1, 10000),
			rate = number(v.rate, Number.MIN_VALUE, 1e12) * rates[v.rateUnit],
			efficiency = 1 - number(v.overhead, 0, 99.9) / 100,
			concurrency = Math.min(files, integer(v.concurrency, 1, 10000)),
			setup = number(v.setup, 0, 86400),
			batches = Math.ceil(files / concurrency),
			bytes = bytesPerFile * files,
			effectiveBytesPerSecond = (rate / 8) * efficiency;
		const payloadSeconds =
				v.model === "Shared total rate"
					? bytes / effectiveBytesPerSecond
					: (batches * bytesPerFile) / effectiveBytesPerSecond,
			idealSeconds = payloadSeconds * efficiency,
			setupSeconds = batches * setup,
			totalSeconds = payloadSeconds + setupSeconds;
		if (!Number.isFinite(totalSeconds) || !Number.isFinite(bytes / efficiency))
			throw new Error("The estimate exceeds the supported numeric range.");
		return print({
			files,
			bytesPerFile,
			totalPayloadBytes: bytes,
			bandwidthModel: v.model,
			linkBitsPerSecond: rate,
			peakPayloadBytesPerSecond:
				v.model === "Shared total rate"
					? effectiveBytesPerSecond
					: effectiveBytesPerSecond * concurrency,
			concurrentTransfers: concurrency,
			batches,
			lastBatchFiles: files - (batches - 1) * concurrency,
			estimatedWireBytes: bytes / efficiency,
			payloadSeconds,
			overheadSeconds: payloadSeconds - idealSeconds,
			setupSeconds,
			totalSeconds,
			totalMinutes: totalSeconds / 60,
			totalHours: totalSeconds / 3600,
		});
	},
};
