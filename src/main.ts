import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	TranscriberSettings,
	TranscriberSettingTab,
} from "./settings";
import { normalizeToJpeg, pickImage } from "./image";
import { getProvider } from "./providers";
import { insertTranscription, saveImageToVault } from "./insert";

export default class JournalTranscriberPlugin extends Plugin {
	settings: TranscriberSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TranscriberSettingTab(this.app, this));

		this.addCommand({
			id: "insert-transcribed-note",
			name: "Insert transcribed note",
			editorCallback: (editor: Editor) => {
				void this.runTranscription(editor);
			},
		});

		this.addRibbonIcon("scan-text", "Insert transcribed note", () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				new Notice("Open a note first.");
				return;
			}
			void this.runTranscription(view.editor);
		});
	}

	private async runTranscription(editor: Editor): Promise<void> {
		try {
			const file = await pickImage();
			if (!file) return;

			const notice = new Notice("Transcribing…", 0);
			try {
				const image = await normalizeToJpeg(file, this.settings.maxImageEdge);
				const provider = getProvider(this.settings);
				const text = await provider.transcribe({
					base64: image.base64,
					mediaType: image.mediaType,
					prompt: this.settings.transcriptionPrompt,
				});
				const imageName = await saveImageToVault(this.app, this.settings, image);
				insertTranscription(editor, imageName, text);
				new Notice("Transcribed ✓");
			} finally {
				notice.hide();
			}
		} catch (e) {
			console.error("Journal Transcriber:", e);
			new Notice(
				"Transcription failed: " +
					(e instanceof Error ? e.message : String(e)),
			);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
