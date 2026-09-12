import { describe, expect, it } from "vitest";
import { tool } from "./data-transfer-planner";
import { defaults, execute } from "./types";

const run = (v: Record<string, string> = {}) =>
	JSON.parse(execute(tool, { ...defaults(tool), ...v }));
describe("transfer planning", () => {
	it("distinguishes decimal bits and binary bytes", () => {
		expect(run()).toMatchObject({
			totalPayloadBytes: 41943040,
			peakPayloadBytesPerSecond: 11250000,
			batches: 2,
			setupSeconds: 0.4,
		});
		expect(run().payloadSeconds).toBeCloseTo(41943040 / 11250000);
		expect(
			run({
				input: "1",
				sizeUnit: "MB",
				files: "1",
				rate: "1",
				rateUnit: "MB/s",
				overhead: "0",
				setup: "0",
			}).totalSeconds,
		).toBe(1);
	});
	it("models shared and independent capacity with partial final batches", () => {
		const shared = run({ files: "3" }),
			independent = run({ files: "3", model: "Rate per transfer" });
		expect(shared.lastBatchFiles).toBe(1);
		expect(independent.payloadSeconds / shared.payloadSeconds).toBeCloseTo(
			2 / 3,
		);
		expect(run({ concurrency: "100" }).concurrentTransfers).toBe(4);
	});
	it("handles empty payloads and zero overhead", () => {
		expect(run({ input: "0" }).totalSeconds).toBe(0.4);
		expect(run({ overhead: "0" }).overheadSeconds).toBe(0);
	});
	it("rejects impossible rates, overhead and counts", () => {
		expect(() => run({ rate: "0" })).toThrow();
		expect(() => run({ overhead: "100" })).toThrow();
		expect(() => run({ files: "0" })).toThrow();
		expect(() => run({ rate: "NaN" })).toThrow();
	});
});
