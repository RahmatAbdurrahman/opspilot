# Demo Checklist

Run this 30–60 minutes before presenting, and again 5 minutes before.

## Production dashboard

- [ ] Open <https://opspilot-snowy.vercel.app/> in a normal (non-incognito) window. It loads without an error card.
- [ ] Wait for the first load to finish. The first request after idle can take several seconds; this is expected (Apps Script cold start).
- [ ] Operational data is available: Overview KPI cards show values, tables have rows.
- [ ] Click **Refresh** in the topbar **once**, then confirm data is still shown. Do not spam it.
- [ ] Overview is visible and clean (no skeleton, no error card).
- [ ] Priorities opens `INV-017` and `TASK-025` drawers without errors.
- [ ] **INV-017 evidence available:** Action Center shows it as *Executed* with a receipt; Activity shows its draft(s) and *Email sent*.
- [ ] **TASK-025 evidence available:** Action Center shows *Executed*; Activity shows *Calendar event created*.
- [ ] Action Center is visible, with the summary cards populated.
- [ ] Activity records are visible (about 17 at last snapshot, including 1 historical execution issue).
- [ ] Browser console shows no errors (F12 → Console), then close dev tools.

## IBM Bob and execution boundary

- [ ] IBM Bob is connected to the OpsPilot MCP server and the tools are listed.
- [ ] The execution tools (`opspilot_send_email`, `opspilot_calendar`) **require approval** in IBM Bob.
- [ ] The main `opspilot` flow is the one used for `Handle <ID>`; it must not expose send or calendar-create capability.
- [ ] You know which already-executed conversation or recorded run you will show for `INV-017` and `TASK-025` (do not run new executions live).

## Screen and safety

- [ ] No secrets visible: no API keys, `.env` content, MCP configuration, Langflow keys, Apps Script URL or Composio credentials on any screen or tab.
- [ ] Close unrelated tabs, notifications and personal bookmarks.
- [ ] Browser zoom 100%, window at 1440×900 or the presentation resolution; sidebar and topbar fit.
- [ ] Dark mode and display scaling look correct on the presenting machine.
- [ ] Network is stable; presenting device is charged.
- [ ] Backup screenshots available offline (see `docs/screenshot-plan.md`).
- [ ] Demo script open on a second screen or printed (`docs/demo-script.md`).

## Emergency fallbacks

**If Apps Script is temporarily slow or the dashboard shows "Operational data is temporarily unavailable":**

1. Wait for the loading skeleton to finish (up to about 25 seconds in the worst case); the dashboard retries once on its own.
2. If an error card appears, press **Retry** once.
3. If it is still unavailable, use the already-loaded cached dashboard tab or the backup screenshots and keep narrating the verified workflow. Do not keep reloading.

**If Gmail / Calendar external execution is slow, or an IBM Bob step stalls:**

1. Do not trigger execution again.
2. Show the historical execution receipt in **Action Center** and the evidence in **Activity** (`INV-017`, `TASK-025`).
3. Say: "Eksekusi eksternal melewati Gmail dan Calendar, jadi bisa tertunda. Saya tunjukkan bukti eksekusi yang sudah tercatat."

**If the production URL does not load at all:**

1. Switch to backup screenshots and continue the script.
2. Check the Vercel project status after the demo.

## After the demo

- [ ] Note any unexpected behavior for follow-up.
- [ ] Do not change data or configuration in the middle of judging.
