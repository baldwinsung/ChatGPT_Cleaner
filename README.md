# ChatGPT_Cleaner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-b083f0.svg)](https://claude.com/claude-code)

**A checklist for mass-deleting your chatgpt.com conversation history.**
ChatGPT_Cleaner drops a small panel into the chatgpt.com page itself,
listing every conversation in your **Recents** sidebar with a checkbox next
to it, so you can tick the ones you don't want and delete them all in one
pass — instead of hunting down and trashing chats one at a time.

## Usage

1. Log in to [chatgpt.com](https://chatgpt.com) in your browser.
2. Open the JavaScript console:
   - **Safari:** `⌘⌥C`. *(First time only: Safari ▸ Settings ▸ Advanced ▸
     "Show features for web developers", to reveal the Develop menu this
     belongs to.)*
   - **Chrome/Edge/Firefox:** `⌘⌥I` / `F12`, then the **Console** tab.
3. Copy [`browser/chatgpt-cleaner.console.js`](browser/chatgpt-cleaner.console.js).
   From a local clone: `cat browser/chatgpt-cleaner.console.js | pbcopy`.
4. Paste it into the console and press **Enter**. A panel appears in the
   top-right corner, listing your recents with checkboxes.
5. Tick the conversations you want gone, click **Delete selected**, confirm.

| Control | Action |
|---|---|
| Checkbox next to a conversation | Toggle it |
| **Select all** / **Select none** | Bulk-toggle everything currently loaded |
| **Refresh** | Reload the list from chatgpt.com |
| **Delete selected** | Confirm, then delete every ticked conversation |
| **×** (top-right) | Close the panel |

Re-running the script (paste it again) removes the old panel and starts
fresh — the panel doesn't survive a page reload. Deleting matches exactly
what the trash icon in the chatgpt.com sidebar does — it cannot be undone
from this tool.

> **AI-authored:** every line of this project — code and docs — was written
> by [Claude Code](https://claude.com/claude-code), Anthropic's agentic
> coding tool. Review the source before pointing it at your real account.

## ⚠️ Disclaimer — use at your own risk

This project is provided **as-is, with no warranty, and no affiliation with
or endorsement by OpenAI.**

- **It's not an official API.** There's no public, documented API for a
  user's own conversation history. This drives OpenAI's private,
  reverse-engineered `backend-api` endpoints, which can change, break, or
  start rejecting requests **at any time, without notice**.
- **Deletion is permanent.** There's no undo, trash-recovery, or
  confirmation beyond the one dialog this tool shows. **Double-check your
  selection before confirming.**
- **Automating chatgpt.com may be against OpenAI's Terms of Service.** This
  is your decision and your risk — run it only against your own account.
- **No liability.** Licensed [MIT](LICENSE), provided "AS IS." The
  author(s) and Anthropic aren't responsible for lost conversations,
  account restrictions, or any other consequence of using this tool.

Read the code before you run it — it's a single, dependency-free file with
no build step and no calls to any host but `chatgpt.com`.

## How it works

This runs as plain JavaScript **pasted into your browser's own console
while chatgpt.com is open** — not a separate program, not an extension. It
calls `fetch()` from inside the page you're already logged into, so the
browser attaches your session cookie itself; you never see or copy a
session token. That also sidesteps OpenAI's Cloudflare bot-management,
which blocks external HTTP clients (a Go program, curl, etc.) even with a
valid cookie — a request from *inside* the already-authenticated page isn't
a separate client trying to prove itself, so there's no challenge to fail.

## Project layout

```
browser/
  chatgpt-cleaner.console.js   The entire tool: paste into the console
```

## License

MIT — see [LICENSE](LICENSE). Designed and built by
**[Claude Code](https://claude.com/claude-code)**.
