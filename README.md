# Journal Transcriber

An Obsidian plugin that transcribes handwritten notes (e.g. Apple Pencil notes
photographed or screenshotted from Apple Notes) into Markdown, using a vision LLM.

**Flow:** open a note → run **Insert transcribed note** → pick a photo → the plugin
sends it to Claude or Gemini for OCR → it inserts the original image (in a collapsible
callout) and the transcribed Markdown at your cursor.

Works on desktop and **iPad** (Obsidian mobile).

## Features

- **Configurable provider** — Anthropic (Claude) or Google (Gemini), chosen in settings.
- **Model selection** — Claude Opus 4.8 / Sonnet 4.6 / Haiku 4.5, or any Gemini model ID.
- **Reflowed Markdown** — preserves headings, lists, and checkboxes; reflows line breaks
  into natural sentences instead of mirroring where the handwriting wrapped.
- **Ignores screenshot chrome** — the prompt instructs the model to skip toolbars, the
  iOS status bar (clock/battery), and other UI, transcribing only the handwriting.
- **HEIC-safe** — picked photos are re-encoded to JPEG and downscaled before sending.
- **Editable prompt** — tune the transcription instructions in settings.

## Settings

| Setting | Notes |
| --- | --- |
| Provider | Anthropic or Google. |
| API key | Stored locally in this vault's `data.json`. |
| Model | Claude model dropdown, or free-text Gemini model ID. |
| Attachment folder | Where the original image is saved (default `attachments`). |
| Max image edge | Long edge the image is resized to (default `1568` px). |
| Transcription prompt | Editable; has a "Reset to default" button. |

You'll need your own API key from [Anthropic](https://console.anthropic.com) or
[Google AI Studio](https://aistudio.google.com).

## Install via BRAT

1. Install the **BRAT** community plugin.
2. BRAT → **Add beta plugin** → paste this repository's URL.
3. Enable **Journal Transcriber** in Community Plugins, then add your API key in settings.

BRAT installs from this repo's latest **GitHub Release** (which ships `main.js`,
`manifest.json`, and `styles.css`).

## Build from source

```bash
npm install
npm run dev      # watch build -> main.js
npm run build    # type-check + production build
```

Copy `main.js`, `manifest.json`, and `styles.css` into
`<vault>/.obsidian/plugins/journal-transcriber/` and reload Obsidian.

## Release (for maintainers)

```bash
npm version patch      # bumps manifest.json + versions.json
git push && git push --tags
```

Pushing a `x.y.z` tag triggers `.github/workflows/release.yml`, which builds and
publishes a GitHub Release with the plugin assets attached — which is what BRAT pulls.
