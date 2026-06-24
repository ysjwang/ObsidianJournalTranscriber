import { requestUrl } from "obsidian";
import { TranscriptionInput, TranscriptionProvider } from "./types";

/**
 * Calls the Anthropic Messages API with a vision (image) block.
 *
 * Uses Obsidian's requestUrl rather than fetch so the request runs outside the
 * browser's CORS sandbox (the Anthropic API rejects direct browser fetches).
 */
export class AnthropicProvider implements TranscriptionProvider {
	constructor(
		private readonly apiKey: string,
		private readonly model: string,
	) {}

	async transcribe({ base64, mediaType, prompt }: TranscriptionInput): Promise<string> {
		const res = await requestUrl({
			url: "https://api.anthropic.com/v1/messages",
			method: "POST",
			throw: false,
			headers: {
				"x-api-key": this.apiKey,
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: this.model,
				max_tokens: 4096,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "image",
								source: {
									type: "base64",
									media_type: mediaType,
									data: base64,
								},
							},
							{ type: "text", text: prompt },
						],
					},
				],
			}),
		});

		if (res.status >= 400) {
			let message = `HTTP ${res.status}`;
			try {
				message = res.json?.error?.message ?? message;
			} catch (_) {
				/* non-JSON error body */
			}
			throw new Error(`Anthropic API error: ${message}`);
		}

		const data = res.json;
		if (data?.stop_reason === "refusal") {
			throw new Error("Anthropic declined to transcribe this image.");
		}

		const textBlock = (data?.content ?? []).find(
			(b: { type?: string; text?: string }) => b.type === "text",
		);
		const text = textBlock?.text?.trim();
		if (!text) {
			throw new Error("Anthropic returned no text.");
		}
		return text;
	}
}
