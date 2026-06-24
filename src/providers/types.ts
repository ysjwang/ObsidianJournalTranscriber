export interface TranscriptionInput {
	/** Base64-encoded image data (no data: prefix, no newlines). */
	base64: string;
	/** MIME type of the image, e.g. "image/jpeg". */
	mediaType: string;
	/** The transcription instructions sent alongside the image. */
	prompt: string;
}

export interface TranscriptionProvider {
	transcribe(input: TranscriptionInput): Promise<string>;
}
