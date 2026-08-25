# ChatGPT_Cleaner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-b083f0.svg)](https://claude.com/claude-code)

**A checklist for mass-deleting your chatgpt.com conversation history.**
ChatGPT_Cleaner drops a small panel into the chatgpt.com page itself,
listing every conversation in your **Recents** sidebar with a checkbox next
to it, so you can tick the ones you don't want and delete them all in one
pass — instead of hunting down and trashing chats one at a time.

## Quick start (Safari, macOS)

1. Open Safari, log in to [chatgpt.com](https://chatgpt.com).
2. Press **`⌘⌥C`** — opens Safari's JavaScript console directly. *(First
   time only: Safari ▸ Settings ▸ Advanced ▸ "Show features for web
   developers", to reveal the Develop menu this shortcut belongs to.)*
3. From a local clone:
   ```sh
   cat browser/chatgpt-cleaner.console.js | pbcopy
   ```
4. Click into the console, paste (**`⌘V`**), press **Enter**.

A checklist panel appears on the page. Tick, delete, done. Want this to
happen with a single command instead? See [Automate it](#automate-it-macos)
below. Full details, controls, and the disclaimer are further down.

> **AI-authored:** every line of this project — code and docs — was written
> by [Claude Code](https://claude.com/claude-code), Anthropic's agentic
> coding tool. Review the source before pointing it at your real account.
> See the disclaimer below.

## ⚠️ Disclaimer — use at your own risk

This project is provided **as-is, with no warranty, and no affiliation with
or endorsement by OpenAI.** Before you run it against a real account,
understand what it actually does:

- **It's not an official API.** There is no public, documented API for a
  user's own conversation history. This tool drives OpenAI's private,
  reverse-engineered `backend-api` endpoints — the same ones the web app
  itself calls. Those endpoints can change, break, or start rejecting
  requests **at any time, without notice**, and OpenAI has not sanctioned
  third-party use of them.
- **Deletion is permanent from this tool's perspective.** There is no undo
  button, trash-recovery screen, or confirmation beyond the one dialog this
  tool shows you. Once a delete call succeeds, that conversation is gone.
  **Double-check your selection before confirming.**
- **Automating chatgpt.com may be against OpenAI's Terms of Service.** Using
  this tool is your decision and your risk to accept — run it only against
  your own account, and stop using it if OpenAI's terms or behavior change
  in a way that makes that no longer true.
- **No liability.** This software is licensed under the [MIT License](LICENSE)
  — used "AS IS", without warranty of any kind. The author(s) and Anthropic
  are not responsible for lost conversations, account restrictions, or any
  other consequence of using this tool.

**In short: this is a convenience tool for cleaning up your own data. Read
the code, understand what it sends, and use it at your own risk.**

## How it works

chatgpt.com has no public API for a user's own conversation history — this
talks to the same private `backend-api` endpoints the web app itself uses to
render and manage the sidebar.

This runs as a plain JavaScript snippet **pasted into your browser's own
DevTools console while chatgpt.com is open** — not a separate program, not
a browser extension. That matters for two reasons:

- **No token handling.** It calls `fetch()` from inside the page you're
  already logged into, so the browser attaches your session cookie itself.
  You never copy, paste, or even see a session token.
- **No bot-blocking.** OpenAI puts Cloudflare in front of these endpoints,
  which rejects requests from external HTTP clients (a Go program, curl,
  etc.) with a `403` and a JS challenge page — even with a perfectly valid
  session cookie attached. A request made from *inside* the already-loaded,
  already-authenticated page doesn't hit that wall, because it isn't a
  separate client trying to prove itself — it's the same browser tab
  Cloudflare already trusts.

## Usage

1. Log in to [chatgpt.com](https://chatgpt.com) in your browser.
2. Open DevTools and switch to the **Console** tab:
   - **Safari:** enable the Develop menu once (Safari ▸ Settings ▸ Advanced
     ▸ "Show features for web developers"), then **Develop ▸ Show Web
     Inspector** (`⌘⌥I`).
   - **Chrome/Edge:** `⌘⌥I` (macOS) or `F12`.
   - **Firefox:** `⌘⌥I` (macOS) or `F12`.
3. Copy the whole file, then paste it into the console and press Enter. From
   a local clone, the fastest way to copy it (macOS) is:

   ```sh
   cat browser/chatgpt-cleaner.console.js | pbcopy
   ```

   Otherwise open [`browser/chatgpt-cleaner.console.js`](browser/chatgpt-cleaner.console.js)
   directly and copy it from there.
4. A "ChatGPT_Cleaner" panel appears in the top-right corner of the page,
   listing your recents with checkboxes.
5. Tick the conversations you want gone, then click **Delete selected** and
   confirm. The panel refreshes itself afterward.

| Control | Action |
|---|---|
| Checkbox next to a conversation | Toggle it |
| **Select all** / **Select none** | Bulk-toggle everything currently loaded |
| **Refresh** | Reload the list from chatgpt.com |
| **Delete selected** | Confirm, then delete every ticked conversation |
| **×** (top-right) | Close the panel |

Re-running the script (paste it again) removes the old panel and starts
fresh. The panel doesn't survive a page reload — just paste it again after
one.

Deleting matches exactly what the trash icon in the chatgpt.com sidebar does
— it cannot be undone from this tool.

## Automate it (macOS)

Yes — but not via UI-scripted keystrokes or clipboard tricks. Safari has a
built-in, Apple-documented AppleScript command, `do JavaScript ... in
document`, that runs arbitrary JS directly in a tab. `browser/run-in-safari.sh`
uses it to inject the script with one command — no DevTools, no `pbcopy`,
no manual paste:

```sh
browser/run-in-safari.sh
```

It finds (or opens) a chatgpt.com tab in Safari and injects the script
straight into it. One-time setup, both of which are consent gates Apple
puts specifically around this capability — the script can't and shouldn't
try to flip them for you:

1. Safari ▸ Settings ▸ Advanced ▸ "Show features for web developers".
2. Safari ▸ Develop ▸ **"Allow JavaScript from Apple Events"** (check it) —
   this is the actual permission that lets an external script run JS in
   Safari at all.
3. First run: macOS asks whether the script may control Safari. Approve it.

Wrap that one command in an Automator Quick Action, a Shortcuts.app
shortcut, or a `launchd` schedule and you've got the "just do it for me"
version — same script, same one-time setup either way.

## Project layout

```
browser/
  chatgpt-cleaner.console.js   The entire tool: paste into DevTools console
  run-in-safari.sh             Optional: runs it in Safari with one command
```

## Safety notes

- Deleting a conversation is immediate and permanent from this tool's point
  of view — there is no undo screen.
- This relies on undocumented chatgpt.com endpoints. If OpenAI changes them,
  listing or deletion may start failing with an HTTP error shown in the
  panel or the console, until the script is updated.
- Nothing here is sent anywhere except to `chatgpt.com` — open the file and
  read it; it's a few hundred lines of plain JavaScript with no external
  dependencies, bundler, or network calls to any other host.

## License

MIT — see [LICENSE](LICENSE). Designed and built by
**[Claude Code](https://claude.com/claude-code)**.
