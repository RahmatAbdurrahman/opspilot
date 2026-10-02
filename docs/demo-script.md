# OpsPilot Demo Script (~3 minutes)

Narration is written in Indonesian; UI labels stay in English as they appear on screen. Numbers quoted below are a snapshot from 2026-10-02: **read the actual values from the screen** rather than from this script.

**Rule for the demo:** do not send a new real email or create a new real calendar event. The historical executed evidence for `INV-017` and `TASK-025` is enough and keeps the demo safe and fast.

---

## 0:00–0:25 · Problem

**On screen:** the Overview page, not yet scrolled (or a title slide).

**Say:**
"Di bisnis B2B kecil, follow-up pelanggan, invoice, tugas, dan meeting tersebar di banyak tempat. Pemilik usaha harus mengecek data, menentukan prioritas, menyiapkan pesan, mengirimnya, lalu mengingat apa yang sudah dilakukan. Hasilnya, follow-up terlambat. Dari validasi awal kami dengan 10 responden, 8 dari 10 menyebut keterlambatan follow-up pelanggan sebagai masalah."

*(Say "validasi awal, bukan data representatif" if asked.)*

## 0:25–0:50 · Overview dashboard

**On screen:** Overview — KPI cards (Revenue at Risk, Attention Items, Open Tasks, Active Opportunities), charts, Top Priorities.

**Say:**
"Ini OpsPilot. Dalam satu layar saya langsung tahu: berapa pendapatan yang berisiko karena invoice terlambat, berapa item yang butuh perhatian hari ini, dan peluang yang masih aktif. Dashboard ini hanya menampilkan dan membantu memutuskan. Dashboard tidak mengirim email dan tidak membuat event kalender. Semua data di demo ini adalah data sintetis."

## 0:50–1:15 · Operational priority

**On screen:** Priorities page → click `INV-017` (or open the row's View button) to show the detail drawer.

**Say:**
"Di dashboard, prioritas operasional dihitung secara deterministik dari kondisi seperti invoice terlambat, lead yang lama tidak dihubungi, dan tugas mendesak. Saya buka INV-017: invoice PT Delta Konsultan yang sudah lewat jatuh tempo. Drawer menunjukkan konteksnya dan perintah untuk IBM Bob: `Handle INV-017`. Dari item ini, IBM Bob dan Langflow membantu memverifikasi konteks dan menyiapkan tindak lanjut."

**Visible:** severity badge, overdue days, amount, the *Continue securely in IBM Bob* section with the copyable command.

## 1:15–1:55 · Invoice follow-up with INV-017

**On screen:** IBM Bob (conversation already prepared with the historical run) → then the dashboard Activity or Action Center row for `INV-017`.

**Say:**
"Di IBM Bob, perintah `Handle INV-017` memanggil flow Langflow `opspilot` lewat MCP. Agen memverifikasi dulu bahwa INV-017 memang ada dan terlambat, menjelaskan rekomendasinya, lalu membuat draft Gmail. Agen ini tidak bisa mengirim email."

**Show in IBM Bob:** the verified context and the generated Gmail draft.

"Untuk mengirim, saya harus memberi perintah eksplisit: `SEND INV-017`. Persetujuan lewat kalimat biasa tidak cukup. IBM Bob meminta persetujuan manusia sebelum tool `opspilot_send_email` berjalan."

**Show in IBM Bob:** the explicit `SEND INV-017` command and the human-approval prompt (use the recorded/historical run).

"Setelah disetujui, email terkirim lewat Gmail dan hasilnya dicatat di action log."

**Show:** the successful execution result.

## 1:55–2:25 · TASK-025 calendar workflow

**On screen:** Tasks page → `TASK-025` (Follow up revised proposal, PT Beta Kreatif), then IBM Bob.

**Say:**
"Alurnya sama untuk kalender. TASK-025 adalah follow-up proposal revisi untuk PT Beta Kreatif. Konteks tugas diverifikasi, lalu perintah eksplisit `CREATE TASK-025`. Lagi-lagi IBM Bob meminta persetujuan sebelum tool `opspilot_calendar` membuat event di Google Calendar."

**Show:** verified task context, `CREATE TASK-025`, approval boundary, the executed calendar event.

## 2:25–2:45 · Action Center and Activity

**On screen:** Action Center (lifecycle tabs) → click the `INV-017` and `TASK-025` rows → Activity page.

**Say:**
"Action Center menunjukkan status setiap aksi: Recommended, Prepared, atau Executed, dan hanya dianggap Executed jika action log membuktikannya. Untuk item yang sudah dieksekusi, tidak ada perintah eksekusi baru, ini bagian dari perlindungan duplikasi. Halaman Activity adalah jejak audit: draft, email, event kalender, dan persetujuan manusia ditampilkan hanya jika memang tercatat. Catatan lama yang gagal tetap terlihat, tidak dihapus."

**Visible:** Executed receipts with approval label, Activity table with 17 records (snapshot), the historical *Email send failed* row marked *Unknown entity* with its data-quality warning.

## 2:45–3:00 · Closing

**On screen:** Overview again, or the title slide with the production URL.

**Say:**
"OpsPilot membantu pemilik usaha kecil tahu apa yang butuh perhatian dan bertindak lebih cepat, tanpa menyerahkan keputusan penting ke AI. AI menganalisis dan menyiapkan; manusia menyetujui; setiap langkah tercatat. Terima kasih."

---

## Fallback sentences

- **If the dashboard is slow (Apps Script cold start):** "Data operasional dimuat dari Google Sheets lewat Apps Script, jadi permintaan pertama bisa beberapa detik. Sambil menunggu, saya jelaskan alurnya." Then use a screenshot or the already-warm page. Press **Refresh** only once.
- **If an external action is slow or an IBM Bob step stalls:** "Eksekusi eksternal melewati Gmail dan Calendar, jadi bisa tertunda. Saya tunjukkan bukti eksekusi yang sudah tercatat." Then show the historical receipt in Action Center and the Activity record. Do not re-trigger execution.
- **If the production URL does not load:** switch to the backup screenshots (see `docs/screenshot-plan.md`) and continue with the narration.
- **If asked whether the website can send email:** "Tidak. Website hanya membaca data dan menyalin perintah. Eksekusi hanya lewat tool terpisah di IBM Bob dengan persetujuan manusia."
