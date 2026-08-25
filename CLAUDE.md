# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ChatGPT_Cleaner is a single browser-console script for bulk-deleting entries
from a user's chatgpt.com conversation history ("Recents"): paste it into
DevTools, tick the conversations to remove in the panel it injects, confirm,
done.

## Why a console script, not a standalone program (read this first)

An earlier version of this project was a Go/Bubble Tea terminal app that
made its own HTTP calls to chatgpt.com's private `backend-api` endpoints
using a copied session-token cookie. **That approach no longer works**:
OpenAI has Cloudflare in front of these endpoints, and Cloudflare rejects
requests from external HTTP clients (Go's `net/http`, curl, etc.) with
`403` + a JS-challenge HTML page — `cf-mitigated: challenge` in the response
headers — regardless of whether the session cookie is valid. This is a
bot-management wall, not an auth failure, and it triggers even with a
correct token.

The fix was to stop being a separate client altogether. This script runs as
plain JavaScript **inside the chatgpt.com tab itself**, pasted into DevTools
by the user. Its `fetch()` calls are same-origin requests made by a browser
Cloudflare has already cleared — there is no separate client to challenge,
and no session token to extract, copy, or store, since the browser attaches
cookies (including `HttpOnly` ones) to same-origin requests automatically.

**Do not reintroduce an external HTTP client (Go, Python, curl, Node
outside a browser, etc.) for this.** It will hit the same Cloudflare wall.
If a terminal/native UI is wanted again in the future, the legitimate path
is driving an actual browser instance (e.g. via WebDriver or the Chrome
DevTools Protocol) so requests still originate from a real, already-trusted
browser — not spoofing headers, TLS fingerprints, or solving the challenge
programmatically from outside one.

## Auth model

1. `GET /api/auth/session` (same-origin, `credentials: "include"`) →
   returns a short-lived JWT `accessToken`. The browser attaches the
   `__Secure-next-auth.session-token` cookie itself; the script never reads
   or handles that cookie's value.
2. `GET /backend-api/conversations?offset=&limit=&order=updated` with
   `Authorization: Bearer <accessToken>` → paginated conversation list.
3. `PATCH /backend-api/conversation/{id}` with body `{"is_visible": false}`
   and the same bearer token → deletes one conversation (identical to
   clicking the sidebar's trash icon).

These are undocumented endpoints and can change without notice — if listing
or deleting starts failing with an unexpected error, check whether OpenAI
has changed the shape of `/api/auth/session` or `/backend-api/conversations`
before assuming a bug in this script.

## Automation script (`run-in-safari.sh`)

`browser/run-in-safari.sh` runs the console script in Safari with one
command instead of manual copy/paste. It works through Safari's own
AppleScript command `do JavaScript ... in document` (from Safari's
Standard Suite), which runs arbitrary JS directly in a tab — no DevTools,
no clipboard, no simulated keystrokes.

This is deliberately different from — and safer than — UI-scripting
(`System Events` keystrokes to open DevTools and paste) or any of the
Cloudflare-defeating approaches ruled out above. `do JavaScript` is gated
behind an explicit, off-by-default user opt-in (Safari ▸ Develop ▸ "Allow
JavaScript from Apple Events") plus a one-time macOS Automation-permission
prompt. **Do not try to script around either of those gates** (e.g. via
`defaults write` on Safari's preferences, or accessibility-permission UI
scripting) — respecting them is what keeps this "automating a workflow the
user explicitly enabled" rather than "bypassing a security control," which
is the same line the Cloudflare section above draws.

The script finds an existing chatgpt.com tab in the front Safari window, or
opens one; reads `chatgpt-cleaner.console.js` fresh off disk each run (so
the two files never drift out of sync); and hands its contents to `do
JavaScript`. Keep it a plain, dependency-free bash + `osascript` script for
the same reason the console script itself stays dependency-free.

## Architecture

Everything user-facing lives in `browser/chatgpt-cleaner.console.js`, a
single IIFE with no external dependencies (nothing to `npm install`, no
bundler — it's pasted directly into a console, or read and injected by
`run-in-safari.sh`):

- **Networking** (`getAccessToken`, `listAllConversations`,
  `deleteConversation`) — thin wrappers over `fetch()`. All same-origin,
  relative URLs (`/api/auth/session`, `/backend-api/...`) so they resolve
  against whatever chatgpt.com origin the tab is actually on.
- **UI** — a hand-built floating panel (`#chatgpt-cleaner-panel`) injected
  into `document.body` with inline styles (no external stylesheet; the
  DevTools console is exempt from the page's CSP, so this is both simplest
  and safe from CSP blocking). `renderList`/`renderSummary` re-render from
  `state` on every change; there's no framework or virtual DOM here, it's
  small enough not to need one.
- **State** (`state.accessToken`, `state.conversations`,
  `state.selected`) — a plain object/Set, module-scoped inside the IIFE.
  Re-pasting the script removes any existing panel first
  (`document.getElementById(PANEL_ID)?.remove()`), so re-running is always
  safe and starts clean.

## Conventions

- License is MIT; attribution line on user-facing docs is
  "Built with Claude Code".
- Deletion is a soft-delete (`is_visible: false`), matching the real
  chatgpt.com UI's own "Delete" action — do not switch this to some other
  endpoint without checking it still matches what the web app does.
- Keep this dependency-free and copy-paste-able. The entire point is that a
  user can open one file, paste it into a console, and have it work — don't
  introduce a build step, an npm package, or a second file it has to load.
