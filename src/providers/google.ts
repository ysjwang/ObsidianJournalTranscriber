import { requestUrl } from "obsidian";
import { TranscriptionInput, TranscriptionProvider } from "./types";

/**
 * Calls the Google Gemini generateContent API with an inline image part.
 *
 * Uses Obsidian's requestUrl for consistency with the Anthropic provider and to
 * stay outside the browser fetch sandbox on all platforms.
 */
export class GoogleProvider implements TranscriptionProvider {
	constructor(
		private readonly apiKey: string,
		private readonly model: string,
	) {}

	async transcribe({ base64, mediaType, prompt }: TranscriptionInput): Promise<string> {
		const url =
			`https://generativelanguage.googleapis.com/v1beta/models/` +
			`${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

		const res = await requestUrl({
			url,
			method: "POST",
			throw: false,
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{ inline_data: { mime_type: mediaType, data: base64 } },
							{ text: prompt },
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
			throw new Error(`Google API error: ${message}`);
		}

		const candidate = res.json?.candidates?.[0];
		if (candidate?.finishReason === "SAFETY") {
			throw new Error("Google blocked this image for safety reasons.");
		}

		const parts: Array<{ text?: string }> = candidate?.content?.parts ?? [];
		const text = parts
			.map((p) => p.text)
			.filter(Boolean)
			.join("")
			.trim();
		if (!text) {
			throw new Error("Google returned no text.");
		}
		return text;
	}
}
