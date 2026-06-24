import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import {
	DEFAULT_SETTINGS,
	TranscriberSettings,
	TranscriberSettingTab,
} from "./settings";
import { normalizeToJpeg, pickImage } from "./image";
import { getProvider } from "./providers";
import {
	insertTranscription,
	insertTranscriptionAfterLine,
	saveImageToVault,
} from "./insert";

export default class JournalTranscriberPlugin extends Plugin {
	settings: TranscriberSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TranscriberSettingTab(this.app, this));

		this.addCommand({
			id: "insert-transcribed-note",
			name: "Insert transcribed note",
			icon: "scan-text",
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

		this.addCommand({
			id: "transcribe-image-under-cursor",
			name: "Transcribe image under cursor",
			icon: "scan-text",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				void this.runTranscriptionOnEmbed(editor, view);
			},
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

	private async runTranscriptionOnEmbed(
		editor: Editor,
		view: MarkdownView,
	): Promise<void> {
		try {
			const cursorLine = editor.getCursor().line;
			const line = editor.getLine(cursorLine);
			const linkpath = parseImageEmbed(line);
			if (!linkpath) {
				new Notice("Put the cursor on a line with an image embed.");
				return;
			}

			const tfile = this.app.metadataCache.getFirstLinkpathDest(
				linkpath,
				view.file?.path ?? "",
			);
			if (!(tfile instanceof TFile)) {
				new Notice("Couldn't find that image in the vault.");
				return;
			}

			const notice = new Notice("Transcribing…", 0);
			try {
				const bytes = await this.app.vault.readBinary(tfile);
				const image = await normalizeToJpeg(
					new Blob([bytes]),
					this.settings.maxImageEdge,
				);
				const provider = getProvider(this.settings);
				const text = await provider.transcribe({
					base64: image.base64,
					mediaType: image.mediaType,
					prompt: this.settings.transcriptionPrompt,
				});
				insertTranscriptionAfterLine(editor, cursorLine, text);
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

/**
 * Extracts the image link target from a line containing an embed, supporting
 * both wikilink (`![[image.png]]`, with optional `|alias` or `#anchor`) and
 * Markdown (`![alt](path)`) syntax. Returns null if the line has no embed.
 */
function parseImageEmbed(line: string): string | null {
	const wiki = line.match(/!\[\[([^\]|#]+)/);
	if (wiki) return wiki[1].trim();

	const md = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
	if (md) return decodeURIComponent(md[1].trim());

	return null;
}
