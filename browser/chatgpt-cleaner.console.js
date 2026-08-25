// ChatGPT_Cleaner — browser console edition.
//
// Run this FROM chatgpt.com's own DevTools console — not as an extension,
// not from an external process. It only ever makes same-origin fetch()
// calls from inside the page you're already logged into, so:
//   - the browser attaches your session cookie itself; you never copy or
//     even see a session token.
//   - there's no Cloudflare bot-challenge to fight, because the request
//     never leaves the browser tab that already passed it — it's still
//     that same, already-trusted browser making the call.
//
// Usage:
//   1. Log in to https://chatgpt.com in your browser.
//   2. Open DevTools:
//        Safari:        Develop > Show Web Inspector          (Cmd+Opt+I)
//        Chrome/Edge:   More tools > Developer tools           (Cmd+Opt+I / F12)
//        Firefox:       Web Developer Tools                    (Cmd+Opt+I / F12)
//      then switch to the Console tab.
//   3. Paste this entire file's contents in and press Enter.
//   4. A "ChatGPT_Cleaner" panel appears in the top-right corner.
//   5. Tick the conversations you want gone, then "Delete selected".
//
// Re-running this script (paste it again) removes the old panel and starts
// fresh — handy after a page reload, since the panel doesn't survive one.
//
// USE AT YOUR OWN RISK: this drives OpenAI's private, undocumented
// backend-api endpoints (the same ones the sidebar's trash icon uses).
// Deletion is immediate and cannot be undone by this tool. See the full
// disclaimer at https://github.com/baldwinsung/ChatGPT_Cleaner.
(() => {
  "use strict";

  const PANEL_ID = "chatgpt-cleaner-panel";
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();

  const state = {
    accessToken: null,
    conversations: [],
    selected: new Set(),
  };

  // ---- networking --------------------------------------------------------
  // Same-origin fetch(): the browser attaches cookies (including the
  // HttpOnly session cookie and Cloudflare's cf_clearance) automatically.
  // credentials: "include" just makes that explicit.

  async function getAccessToken() {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) throw new Error(`session check failed: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.accessToken) throw new Error("no active session — log in and try again");
    return data.accessToken;
  }

  async function listAllConversations(accessToken) {
    const all = [];
    let offset = 0;
    const limit = 100;
    for (;;) {
      const res = await fetch(
        `/backend-api/conversations?offset=${offset}&limit=${limit}&order=updated`,
        { credentials: "include", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`failed to list conversations: HTTP ${res.status}`);
      const data = await res.json();
      const items = data.items || [];
      all.push(
        ...items.map((item) => ({
          id: item.id,
          title: item.title || "(untitled)",
          updateTime: item.update_time || "",
        }))
      );
      offset += items.length;
      if (items.length === 0 || offset >= (data.total || 0)) break;
    }
    return all;
  }

  async function deleteConversation(accessToken, id) {
    const res = await fetch(`/backend-api/conversation/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_visible: false }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  function formatDate(raw) {
    if (!raw) return "?";
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toISOString().slice(0, 16).replace("T", " ");
  }

  // ---- UI ------------------------------------------------------------
  // The DevTools console is exempt from the page's Content-Security-Policy,
  // so injecting styled DOM here (rather than loading anything external) is
  // both simplest and CSP-safe.

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  Object.assign(panel.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    width: "380px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    background: "#202123",
    color: "#ececf1",
    border: "1px solid #4d4d4f",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,.4)",
    zIndex: 2147483647,
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
  });

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #4d4d4f;">
      <strong>ChatGPT_Cleaner</strong>
      <button id="cgc-close" style="background:none;border:none;color:#ececf1;cursor:pointer;font-size:16px;line-height:1;">&times;</button>
    </div>
    <div id="cgc-summary" style="padding:8px 12px;color:#acacbe;">Loading recents&hellip;</div>
    <div id="cgc-list" style="overflow-y:auto;flex:1;padding:0 4px;"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid #4d4d4f;">
      <button id="cgc-all">Select all</button>
      <button id="cgc-none">Select none</button>
      <button id="cgc-refresh">Refresh</button>
      <button id="cgc-delete" style="margin-left:auto;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">Delete selected</button>
    </div>
  `;
  document.body.appendChild(panel);

  for (const btn of panel.querySelectorAll("button")) {
    if (btn.id !== "cgc-delete") {
      Object.assign(btn.style, {
        background: "#343541",
        color: "#ececf1",
        border: "1px solid #4d4d4f",
        borderRadius: "6px",
        padding: "4px 10px",
        cursor: "pointer",
      });
    }
  }

  const summaryEl = panel.querySelector("#cgc-summary");
  const listEl = panel.querySelector("#cgc-list");
  const deleteBtn = panel.querySelector("#cgc-delete");

  panel.querySelector("#cgc-close").onclick = () => panel.remove();
  panel.querySelector("#cgc-all").onclick = () => {
    state.conversations.forEach((c) => state.selected.add(c.id));
    renderList();
  };
  panel.querySelector("#cgc-none").onclick = () => {
    state.selected.clear();
    renderList();
  };
  panel.querySelector("#cgc-refresh").onclick = () => load();
  deleteBtn.onclick = onDeleteClick;

  function summaryText() {
    return `${state.conversations.length} recent(s) — ${state.selected.size} selected`;
  }

  function renderSummary(text) {
    summaryEl.textContent = text;
  }

  function renderList() {
    listEl.innerHTML = "";
    for (const c of state.conversations) {
      const row = document.createElement("label");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 8px",
        borderBottom: "1px solid #2d2d30",
        cursor: "pointer",
      });

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selected.has(c.id);
      checkbox.onchange = () => {
        if (checkbox.checked) state.selected.add(c.id);
        else state.selected.delete(c.id);
        renderSummary(summaryText());
      };

      const title = document.createElement("span");
      Object.assign(title.style, {
        flex: "1",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      title.textContent = c.title;

      const date = document.createElement("span");
      date.style.color = "#8e8ea0";
      date.style.fontSize = "11px";
      date.textContent = formatDate(c.updateTime);

      row.append(checkbox, title, date);
      listEl.appendChild(row);
    }
    renderSummary(summaryText());
  }

  async function load() {
    renderSummary("Loading recents…");
    listEl.innerHTML = "";
    try {
      if (!state.accessToken) state.accessToken = await getAccessToken();
      state.conversations = await listAllConversations(state.accessToken);
      state.selected.clear();
      renderList();
    } catch (err) {
      renderSummary(`Failed: ${err.message}`);
    }
  }

  async function onDeleteClick() {
    const ids = [...state.selected];
    if (ids.length === 0) {
      renderSummary(`${summaryText()} — nothing selected`);
      return;
    }
    const ok = confirm(
      `Delete ${ids.length} conversation(s)? This makes the same call as the sidebar's ` +
        "trash icon and cannot be undone."
    );
    if (!ok) return;

    deleteBtn.disabled = true;
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteConversation(state.accessToken, id);
      } catch (err) {
        failed++;
        console.error("ChatGPT_Cleaner: failed to delete", id, err);
      }
    }
    deleteBtn.disabled = false;
    if (failed > 0) {
      alert(`${failed} of ${ids.length} deletion(s) failed — see the console for details.`);
    }
    await load();
  }

  console.warn(
    "ChatGPT_Cleaner: use at your own risk — this drives OpenAI's private, undocumented " +
      "API. See https://github.com/baldwinsung/ChatGPT_Cleaner for the full disclaimer."
  );

  load();
})();
