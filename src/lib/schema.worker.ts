import { validateJsonSchema } from "./workspace-utilities";

self.onmessage = (event: MessageEvent<{ input: string; schema: string }>) => {
	try {
		self.postMessage({
			result: validateJsonSchema(event.data.input, event.data.schema),
		});
	} catch (error) {
		self.postMessage({
			error: error instanceof Error ? error.message : "Validation failed",
		});
	}
};
