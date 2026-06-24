import { App, PluginSettingTab, Setting } from "obsidian";
import type JournalTranscriberPlugin from "./main";

export interface TranscriberSettings {
	provider: "anthropic" | "google";
	anthropicApiKey: string;
	anthropicModel: string;
	googleApiKey: string;
	googleModel: string;
	transcriptionPrompt: string;
	attachmentFolder: string;
	maxImageEdge: number;
}

export const DEFAULT_PROMPT =
	"This image is a screenshot of a handwritten note (e.g. from Apple Notes). " +
	"It may include app toolbars, the device status bar (clock, battery, signal), " +
	"and other on-screen UI chrome. Ignore all of that — transcribe ONLY the " +
	"handwritten note content. Do not transcribe the clock, battery percentage, " +
	"app/menu labels, buttons, or any printed UI text.\n\n" +
	"Transcribe the handwriting into clean Markdown. Preserve structure: use " +
	"headings, bullet/numbered lists, and `- [ ]` checkboxes where the writer used " +
	"them, and emphasis where clearly intended. Reflow text into natural sentences " +
	"and paragraphs — do NOT insert a line break just because the handwriting " +
	"wrapped to a new line. Only break lines at genuine paragraph or list-item " +
	"boundaries. For drawings, diagrams, or sketches, insert a short description in " +
	"square brackets, e.g. `[diagram: flowchart A -> B]`. Output only the " +
	"transcription — no preamble, no commentary.";

export const DEFAULT_SETTINGS: TranscriberSettings = {
	provider: "anthropic",
	anthropicApiKey: "",
	anthropicModel: "claude-sonnet-4-6",
	googleApiKey: "",
	googleModel: "gemini-2.5-flash",
	transcriptionPrompt: DEFAULT_PROMPT,
	attachmentFolder: "attachments",
	maxImageEdge: 1568,
};

export class TranscriberSettingTab extends PluginSettingTab {
	plugin: JournalTranscriberPlugin;

	constructor(app: App, plugin: JournalTranscriberPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Provider")
			.setDesc("Which LLM transcribes your handwriting.")
			.addDropdown((d) =>
				d
					.addOption("anthropic", "Anthropic (Claude)")
					.addOption("google", "Google (Gemini)")
					.setValue(this.plugin.settings.provider)
					.onChange(async (v) => {
						this.plugin.settings.provider = v as "anthropic" | "google";
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.provider === "anthropic") {
			new Setting(containerEl)
				.setName("Anthropic API key")
				.setDesc("Stored locally in this vault's plugin data.")
				.addText((t) => {
					t.inputEl.type = "password";
					t.setPlaceholder("sk-ant-...")
						.setValue(this.plugin.settings.anthropicApiKey)
						.onChange(async (v) => {
							this.plugin.settings.anthropicApiKey = v.trim();
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName("Claude model")
				.addDropdown((d) =>
					d
						.addOption("claude-opus-4-8", "Opus 4.8 (best accuracy)")
						.addOption("claude-sonnet-4-6", "Sonnet 4.6 (balanced)")
						.addOption("claude-haiku-4-5", "Haiku 4.5 (cheapest)")
						.setValue(this.plugin.settings.anthropicModel)
						.onChange(async (v) => {
							this.plugin.settings.anthropicModel = v;
							await this.plugin.saveSettings();
						}),
				);
		} else {
			new Setting(containerEl)
				.setName("Google API key")
				.setDesc("Stored locally in this vault's plugin data.")
				.addText((t) => {
					t.inputEl.type = "password";
					t.setPlaceholder("AIza...")
						.setValue(this.plugin.settings.googleApiKey)
						.onChange(async (v) => {
							this.plugin.settings.googleApiKey = v.trim();
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName("Gemini model")
				.setDesc(
					"A vision-capable Gemini model ID. Update this if Google releases a newer one.",
				)
				.addText((t) =>
					t
						.setPlaceholder("gemini-2.5-flash")
						.setValue(this.plugin.settings.googleModel)
						.onChange(async (v) => {
							this.plugin.settings.googleModel = v.trim();
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl)
			.setName("Attachment folder")
			.setDesc("Vault folder where the original image is saved.")
			.addText((t) =>
				t
					.setPlaceholder("attachments")
					.setValue(this.plugin.settings.attachmentFolder)
					.onChange(async (v) => {
						this.plugin.settings.attachmentFolder = v.trim() || "attachments";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Max image edge (px)")
			.setDesc(
				"Long edge the image is resized to before sending. Lower = cheaper and faster.",
			)
			.addText((t) =>
				t
					.setValue(String(this.plugin.settings.maxImageEdge))
					.onChange(async (v) => {
						const n = parseInt(v, 10);
						this.plugin.settings.maxImageEdge =
							isNaN(n) || n < 256 ? 1568 : n;
						await this.plugin.saveSettings();
					}),
			);

		const promptSetting = new Setting(containerEl)
			.setName("Transcription prompt")
			.setDesc("Instructions sent to the model alongside the image.")
			.addTextArea((t) => {
				t.setValue(this.plugin.settings.transcriptionPrompt).onChange(
					async (v) => {
						this.plugin.settings.transcriptionPrompt = v;
						await this.plugin.saveSettings();
					},
				);
				t.inputEl.rows = 12;
			});
		promptSetting.settingEl.addClass("journal-transcriber-prompt");

		new Setting(containerEl).addButton((b) =>
			b.setButtonText("Reset prompt to default").onClick(async () => {
				this.plugin.settings.transcriptionPrompt = DEFAULT_PROMPT;
				await this.plugin.saveSettings();
				this.display();
			}),
		);
	}
}
