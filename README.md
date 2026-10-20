# OpenCode UniiChat

Persistent, zoomable conversation memory for OpenCode V2. Inspired by Victor Taelin's UniiChat / OptChat setup.

Logs conversation text, builds a binary summary tree, and replaces previous turns in model requests with a compact `<chat>` view. The current turn stays verbatim. Tools `unii_zoom` and `unii_date` retrieve logged details and timestamps.

## Install

Requires OpenCode V2's server plugin API and a configured summarization provider. No build or npm dependencies are needed. Clone the public repository:

```sh
git clone https://github.com/kakzaki/opencode-unii-chat.git
```

Add the checkout's absolute directory to `plugins` in your global or project `opencode.jsonc`, preserving other entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-unii-chat"]
}
```

Replace the path on another machine. Linux/macOS absolute paths and `file:///...` directories are also supported by OpenCode. Configure `UNII_MODEL=provider/model` in the environment of the OpenCode service. The default `deepseek/deepseek-flash` requires that provider to be configured.

If already installed as `~/.config/opencode/plugins/unii-chat.js`, move that auto-loaded copy outside the plugins folder before enabling this package. Load only one copy. Existing memory storage remains compatible. Reload plugins after configuration changes; environment changes require restarting the service process.

The source is available on [GitHub](https://github.com/kakzaki/opencode-unii-chat). This package is not published to the npm registry; install from the checkout above. `npm pack` creates an npm-compatible archive.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `UNII_MODEL` | `deepseek/deepseek-flash` | Summarization model; additional slashes in model IDs are supported |
| `UNII_DISABLE` | unset | `1` skips plugin registration |
| `UNII_DEBUG` | unset | `1` enables diagnostic stderr output |
| `UNII_WAIT_MS` | `1500` | Context summary wait budget in milliseconds |
| `UNII_SUMMARIZE_TIMEOUT_MS` | `20000` | Per-call summary timeout in milliseconds |
| `UNII_DATA_DIR` | See below | Override memory storage root |

Use positive numeric timeout values. Configuration uses environment variables, not plugin options.

## Storage and limitations

Default storage on all platforms: `~/.local/share/opencode/unii/<project-id>/<session-id>/`.

- `main/YYYY-MM-DD.jsonl`: logged text, tool inputs/outputs, timestamps.
- `tree/YYYY-MM-DD.jsonl`: summary nodes.
- `view.json`: persisted view and imported notes.

Logs are plaintext and may contain sensitive conversation and tool data. Long tool inputs/outputs are clipped, so this is not a lossless transcript archive. Summarization sends selected text to the configured provider and can incur charges. Summaries may omit details; zoom retrieves the locally logged text. A new session can import up to 24 summary notes from the latest saved session in the same project.

Summary lines target 512 UTF-8 bytes. The view grows toward 128 KB, then merges toward 64 KB when parent summaries are available. These are byte thresholds, not token limits or guaranteed request bounds. Failed summaries may fall back to truncated raw text. Timeouts stop waiting but do not cancel the provider request. Concurrent processes writing the same session are unsupported.

## Development

Node.js 22+:

```sh
npm run check
npm test
npm pack --dry-run
```

Tests use isolated temporary storage and a fake model. They do not establish live provider compatibility. The previous live two-turn CLI test timed out; a fresh live installation still needs a smoke test. Give a distinctive fact in one turn and ask for it in the next turn of the same session. Inspect the tree and saved view as well: recall alone does not prove context replacement ran.

To uninstall, remove the plugin configuration and reload plugins. Stored memory remains; back it up before manually removing data.

Initial extraction; OpenCode V1 is unsupported.

## License

[MIT](LICENSE), copyright (c) 2026 kakzaki.
