import { App, Editor, normalizePath, TFolder } from "obsidian";
import { NormalizedImage } from "./image";
import { TranscriberSettings } from "./settings";

function timestamp(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
	);
}

/**
 * Writes the (normalized) image to the configured attachment folder, creating
 * the folder if needed. Returns the file name to use in a wikilink.
 */
export async function saveImageToVault(
	app: App,
	settings: TranscriberSettings,
	image: NormalizedImage,
): Promise<string> {
	const folder = normalizePath(settings.attachmentFolder);

	if (folder && folder !== "/") {
		const existing = app.vault.getAbstractFileByPath(folder);
		if (!(existing instanceof TFolder)) {
			try {
				await app.vault.createFolder(folder);
			} catch (_) {
				// Ignore "folder already exists" races.
			}
		}
	}

	const name = `handwritten-${timestamp()}.${image.extension}`;
	const path = normalizePath(folder && folder !== "/" ? `${folder}/${name}` : name);
	await app.vault.createBinary(path, image.bytes);
	return name;
}

/**
 * Inserts the original scan (in a collapsible callout) followed by the
 * transcribed Markdown at the editor's cursor.
 */
export function insertTranscription(
	editor: Editor,
	imageName: string,
	transcription: string,
): void {
	const block =
		`> [!note]- Original scan\n` +
		`> ![[${imageName}]]\n\n` +
		`${transcription.trim()}\n`;
	editor.replaceSelection(block);
}
