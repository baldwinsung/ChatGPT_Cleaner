# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ChatGPT_Cleaner is a single browser-console script for bulk-deleting entries
from a user's chatgpt.com conversation history ("Recents"): paste it into
the console, tick conversations in the panel it injects, confirm, done.
Everything lives in `browser/chatgpt-cleaner.console.js` — a dependency-free
IIFE with no build step, meant to be opened, read, and pasted directly.

## Why a console script, not a standalone program

An earlier Go/Bubble Tea version made its own HTTP calls to chatgpt.com's
`backend-api` endpoints using a copied session-token cookie. **That
doesn't work**: OpenAI has Cloudflare in front of these endpoints, which
rejects external HTTP clients (Go, curl, etc.) with `403` + a JS-challenge
page regardless of cookie validity — a bot-management wall, not an auth
failure. Running the same `fetch()` calls as a script pasted into the
page's own console sidesteps this: it's a same-origin request from a
browser Cloudflare already trusts, with the browser attaching cookies
(including `HttpOnly` ones) automatically. **Don't reintroduce an external
HTTP client for this** — it will hit the same wall. A future terminal UI
would need to drive a real, already-trusted browser instance (WebDriver,
CDP) rather than spoofing one from outside.

A Safari AppleScript wrapper (`do JavaScript ... in document`) was also
tried and removed at the user's request — manual copy/paste was judged
safer than a script driving Safari on your behalf. **Don't re-add
browser-automation here** without the user asking again; manual paste is
the intended interaction model.

## Auth model

1. `GET /api/auth/session` (same-origin, `credentials: "include"`) →
   short-lived JWT `accessToken`. The browser attaches the
   `__Secure-next-auth.session-token` cookie itself; the script never
   touches it.
2. `GET /backend-api/conversations?offset=&limit=&order=updated` with
   `Authorization: Bearer <accessToken>` → paginated conversation list.
3. `PATCH /backend-api/conversation/{id}` with body `{"is_visible": false}`
   → deletes one conversation (identical to the sidebar's trash icon).

These are undocumented and can change without notice — if listing or
deleting starts failing unexpectedly, check whether OpenAI changed the
shape of these responses before assuming a bug here.

## Architecture (`browser/chatgpt-cleaner.console.js`)

- **Networking** (`getAccessToken`, `listAllConversations`,
  `deleteConversation`) — thin `fetch()` wrappers, relative URLs so they
  resolve against whatever chatgpt.com origin the tab is on.
- **UI** — a hand-built floating panel injected into `document.body` with
  inline styles (no stylesheet needed; the console is exempt from the
  page's CSP). `renderList`/`renderSummary` re-render from `state` on every
  change — no framework, it's small enough not to need one.
- **State** — `state.accessToken` / `conversations` / `selected`, plain
  object/Set inside the IIFE. Re-pasting the script removes any existing
  panel first, so re-running is always safe.

## Conventions

- License is MIT; attribution line on user-facing docs is "Built with
  Claude Code".
- Deletion is a soft-delete (`is_visible: false`), matching chatgpt.com's
  own "Delete" action — don't switch endpoints without checking that still
  holds.
- Keep this dependency-free and copy-paste-able: one file, no build step,
  no npm package, no second file to load.
