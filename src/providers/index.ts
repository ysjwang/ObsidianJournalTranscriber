import { TranscriberSettings } from "../settings";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { TranscriptionProvider } from "./types";

export type { TranscriptionProvider, TranscriptionInput } from "./types";

export function getProvider(settings: TranscriberSettings): TranscriptionProvider {
	switch (settings.provider) {
		case "anthropic":
			if (!settings.anthropicApiKey) {
				throw new Error("No Anthropic API key set. Add one in plugin settings.");
			}
			return new AnthropicProvider(settings.anthropicApiKey, settings.anthropicModel);
		case "google":
			if (!settings.googleApiKey) {
				throw new Error("No Google API key set. Add one in plugin settings.");
			}
			return new GoogleProvider(settings.googleApiKey, settings.googleModel);
		default:
			throw new Error(`Unknown provider: ${settings.provider}`);
	}
}
