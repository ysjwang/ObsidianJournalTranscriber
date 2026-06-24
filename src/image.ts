import { arrayBufferToBase64 } from "obsidian";

export interface NormalizedImage {
	/** Base64-encoded JPEG (no data: prefix). */
	base64: string;
	mediaType: "image/jpeg";
	/** Raw JPEG bytes, for saving to the vault. */
	bytes: ArrayBuffer;
	extension: "jpg";
}

/**
 * Opens the native file/photo picker and resolves with the chosen image File,
 * or null if the user cancelled. On iOS this surfaces
 * "Photo Library / Take Photo / Choose File".
 */
export function pickImage(): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.style.display = "none";

		let settled = false;
		const finish = (file: File | null) => {
			if (settled) return;
			settled = true;
			input.remove();
			resolve(file);
		};

		input.addEventListener("change", () => finish(input.files?.[0] ?? null));

		// If the user cancels, "change" never fires. Detect the return-to-app
		// focus and resolve null shortly after, as a best-effort cleanup.
		window.addEventListener(
			"focus",
			() => window.setTimeout(() => finish(null), 800),
			{ once: true },
		);

		document.body.appendChild(input);
		input.click();
	});
}

/**
 * Decodes any picked image (including iOS HEIC, via the WebView decoder),
 * downscales it so the long edge is <= maxEdge, and re-encodes to JPEG.
 * This normalizes the format (Claude/Gemini don't accept HEIC) and keeps the
 * request small.
 */
export async function normalizeToJpeg(
	file: File,
	maxEdge: number,
): Promise<NormalizedImage> {
	const dataUrl = await readAsDataUrl(file);
	const img = await loadImage(dataUrl);

	let width = img.naturalWidth || img.width;
	let height = img.naturalHeight || img.height;
	if (!width || !height) {
		throw new Error("Could not read image dimensions.");
	}

	const longEdge = Math.max(width, height);
	if (longEdge > maxEdge) {
		const scale = maxEdge / longEdge;
		width = Math.round(width * scale);
		height = Math.round(height * scale);
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get a canvas drawing context.");
	ctx.drawImage(img, 0, 0, width, height);

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
	);
	if (!blob) throw new Error("Could not encode the image to JPEG.");

	const bytes = await blob.arrayBuffer();
	return {
		base64: arrayBufferToBase64(bytes),
		mediaType: "image/jpeg",
		bytes,
		extension: "jpg",
	};
}

function readAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () =>
			reject(new Error("Could not read the selected file."));
		reader.readAsDataURL(file);
	});
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () =>
			reject(
				new Error(
					"Could not decode the selected image (unsupported format on this device?).",
				),
			);
		img.src = src;
	});
}
