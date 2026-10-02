# Screenshot Plan (5 captures)

This is a **capture plan only**. No screenshots have been taken or generated. Capture the real production dashboard and your real IBM Bob session; do not edit content into the images.

**General rules**

- Desktop browser at 1440×900, zoom 100%, dark theme as shipped.
- Warm the data first (open each page once, press **Refresh** once) so no skeleton is visible.
- Hide bookmarks bar and extensions; no secrets, API keys, tokens, email addresses beyond the synthetic demo ones, or MCP configuration visible.
- Export PNG, then crop as suggested. Keep file names `01-overview.png` … `05-activity.png`.
- All data is synthetic demonstration data; say so in at least one caption.

---

## 1 · Overview

- **Page/state:** `/` fully loaded, scrolled to top.
- **Entity:** none (whole dashboard).
- **Must be visible:** the four KPI cards (Revenue at Risk, Attention Items, Open Tasks, Active Opportunities), both charts, the sidebar with the OpsPilot brand, the topbar with Refresh and Ask Bob.
- **Crop:** full viewport, including sidebar and topbar.
- **Caption:** *"OpsPilot Overview: what needs attention today, at a glance (synthetic demo data)."*

## 2 · Action Center

- **Page/state:** `/actions`, tab **All**, no filter, no drawer open.
- **Entity:** the list should include `INV-017` and `TASK-025` as *Executed* and some *Recommended* rows.
- **Must be visible:** the four summary cards (Recommended, Prepared, Executed, Approval Required), the *Human Control* panel, and the table with lifecycle badges.
- **Crop:** content area plus sidebar; exclude browser chrome.
- **Caption:** *"Action Center: every action's lifecycle is derived from the action log, and execution stays behind human approval."*

## 3 · IBM Bob invoice workflow

- **Page/state:** your IBM Bob conversation after `Handle INV-017`.
- **Entity:** `INV-017`.
- **Must be visible:** the command `Handle INV-017`, the verified invoice context (customer, amount, overdue), the recommendation, and the prepared Gmail **draft**, with clear indication that nothing was sent.
- **Crop:** the conversation panel only; blur or crop any account name, key or configuration pane.
- **Caption:** *"IBM Bob + Langflow verify INV-017 and prepare a Gmail draft. The reasoning flow cannot send it."*

## 4 · IBM Bob human approval

- **Page/state:** IBM Bob at the approval prompt (or the approval result) for the explicit `SEND INV-017` command. If you also have `CREATE TASK-025`, you may use that instead.
- **Entity:** `INV-017` (preferred).
- **Must be visible:** the explicit command, the tool name `opspilot_send_email`, and the approval request/decision.
- **Crop:** approval dialog plus enough conversation to show the command that led to it.
- **Caption:** *"The consequential-action boundary: an explicit command plus IBM Bob human approval before `opspilot_send_email` runs."*

## 5 · Activity / audit log

- **Page/state:** `/activity`, all filters at *All*, table view; optionally open the `INV-017` *Email sent* row in the drawer for a second image variant.
- **Entity:** rows for `INV-017` (draft created, email sent) and `TASK-025` (calendar event created).
- **Must be visible:** summary cards (Total Activity, Drafts Created, External Actions Executed, Execution Issues), the Auditability panel, rows showing *Explicit SEND command* / *Confirmed via IBM Bob* in the Decision column.
- **Crop:** content area; if the drawer variant is used, crop to the right-hand drawer plus the table behind it.
- **Caption:** *"Activity: execution evidence and human-approval status, shown only when actually recorded. Historical records are preserved."*

---

## Backups

- Save the same five captures at 390×844 (mobile) only if the submission form allows more images; they are optional.
- Keep a copy of the five originals offline for the demo fallback (see `docs/demo-checklist.md`).
