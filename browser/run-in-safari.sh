#!/usr/bin/env bash
# Runs chatgpt-cleaner.console.js directly in Safari's chatgpt.com tab, via
# Safari's own "do JavaScript ... in document" AppleScript command — no
# DevTools, no clipboard, no simulated keystrokes.
#
# One-time setup (both are user-consent gates Apple puts around exactly this
# capability — this script can't and shouldn't try to flip them for you):
#   1. Safari ▸ Settings ▸ Advanced ▸ "Show features for web developers"
#      (reveals the Develop menu).
#   2. Safari ▸ Develop ▸ "Allow JavaScript from Apple Events" (check it).
#   3. First run: macOS will ask whether this script may control Safari.
#      Approve it — that's what lets the panel actually appear.
#
# Usage:
#   browser/run-in-safari.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JS_PATH="$DIR/chatgpt-cleaner.console.js"

if [[ ! -f "$JS_PATH" ]]; then
    echo "error: $JS_PATH not found" >&2
    exit 1
fi

osascript <<OSA
on run
	set jsCode to read (POSIX file "$JS_PATH") as «class utf8»

	tell application "Safari"
		activate
		if (count of windows) = 0 then
			make new document
		end if

		set targetTab to missing value
		repeat with t in tabs of front window
			if (URL of t contains "chatgpt.com") then
				set targetTab to t
				exit repeat
			end if
		end repeat

		if targetTab is missing value then
			set targetTab to (make new tab in front window with properties {URL:"https://chatgpt.com"})
			set current tab of front window to targetTab
			delay 3 -- give the page a moment to finish loading before injecting
		else
			set current tab of front window to targetTab
		end if

		do JavaScript jsCode in targetTab
	end tell
end run
OSA
