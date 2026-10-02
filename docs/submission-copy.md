# Submission Copy (Bahasa Indonesia)

Siap disalin ke formulir. Semua data dalam demo adalah **data sintetis**. Angka validasi bersifat arah awal, bukan representatif secara statistik.

---

## Project Title

**OpsPilot — AI Revenue Operations Agent untuk Bisnis B2B Kecil**

## Theme / Track

Productivity & Smart Business

## Short Project Description

OpsPilot membantu pemilik atau pemimpin operasional bisnis B2B kecil mengetahui follow-up, invoice, tugas, dan meeting mana yang perlu perhatian hari ini, menyiapkan tindak lanjutnya, lalu menjalankannya hanya setelah persetujuan manusia di IBM Bob. Setiap langkah tercatat dalam jejak audit yang terlihat di dashboard.

## Problem Statement

Pada bisnis B2B kecil (sekitar 2–20 orang), data follow-up pelanggan, invoice, tugas, tenggat, dan meeting tersebar di banyak alat. Operator berulang kali harus memeriksa data, menentukan prioritas, menyiapkan pesan, mengeksekusi, dan mengingat apa yang sudah dilakukan. Akibatnya, follow-up terlambat atau terlewat.

Dalam validasi awal dengan 10 responden: 8 dari 10 menyebut keterlambatan follow-up pelanggan sebagai masalah, 6 dari 10 mengalaminya dalam 3 bulan terakhir, dan 5 dari 9 responden relevan melaporkan keterlambatan follow-up invoice. Ini adalah sinyal awal, bukan bukti representatif.

## Target User

Pemilik atau pemimpin operasional bisnis jasa B2B kecil (sekitar 2–20 orang) yang mengelola pelanggan, invoice, dan jadwal sendiri, dan memeriksa kondisi operasional beberapa kali sehari (8 dari 10 responden validasi melakukannya minimal dua kali per hari).

## Why This Solution Is Needed

Masalahnya bukan kekurangan data, melainkan kekurangan kejelasan: apa yang harus dikerjakan sekarang, dan apakah sudah pernah dikerjakan. OpsPilot menggabungkan analisis, prioritas, rekomendasi, persetujuan manusia, eksekusi, dan catatan audit dalam satu alur. Pada validasi awal, 9 dari 10 responden mengizinkan pesan eksternal oleh AI selama ada aturan atau persetujuan, sehingga pendekatan berbasis persetujuan sesuai dengan kebutuhan pengguna.

## Main Features

- **Overview:** pendapatan berisiko, item yang perlu perhatian, tugas terbuka, peluang aktif, grafik eksposur dan status invoice.
- **Priorities:** antrean prioritas operasional (invoice, lead, tugas, meeting) dengan tingkat keparahan deterministik dan perintah siap salin untuk IBM Bob.
- **Customers, Invoices, Tasks & Meetings:** konteks operasional per entitas; status jatuh tempo dihitung dari tanggal, bukan dari kolom statis.
- **Action Center:** siklus hidup aksi (Recommended → Prepared → Executed) dan Approval Required, diturunkan dari data dan action log.
- **Activity:** jejak audit draft, email, event kalender, rekomendasi, dan masalah eksekusi, dengan status persetujuan manusia yang hanya tampil bila tercatat.
- Tata letak responsif, tombol Refresh data, dan status error yang aman.

## How Langflow Is Used

Langflow menjalankan logika agen. Flow utama `opspilot` menganalisis data operasional, memverifikasi konteks entitas, memberikan rekomendasi yang dapat dijelaskan, dan membuat draft Gmail. Flow ini sengaja **tidak** dapat mengirim email atau membuat event kalender. Eksekusi dipisahkan ke dua flow terpisah, `opspilot_send_email` dan `opspilot_calendar`, yang masing-masing terhubung ke Gmail dan Google Calendar melalui Composio.

## How IBM Bob Is Used

IBM Bob adalah antarmuka operator dan batas kendali manusia. Operator memberi perintah (misalnya `Handle INV-017`), IBM Bob memanggil flow Langflow lewat MCP, dan untuk tool eksekusi (`opspilot_send_email`, `opspilot_calendar`) IBM Bob tetap meminta **persetujuan manusia** sebelum tool berjalan.

## IBM Bob + Langflow Integration

```
Operator → IBM Bob → MCP → Langflow (opspilot)
                          → verified tools → draft Gmail
Operator → perintah eksplisit (SEND / CREATE)
         → persetujuan manusia di IBM Bob
         → opspilot_send_email / opspilot_calendar
         → Gmail / Google Calendar (Composio)
         → action log (Google Sheets via Apps Script)
```

Dashboard web (Next.js di Vercel) membaca data yang sama untuk visibilitas, prioritas, dan audit, dan menyalin perintah untuk IBM Bob. Dashboard tidak memanggil Gmail, Calendar, Langflow, maupun MCP.

## Responsible AI

- **Manusia dalam alur:** email dan event kalender hanya berjalan setelah perintah eksplisit dan persetujuan manusia di IBM Bob.
- **Pemisahan penalaran dan eksekusi:** flow penalaran tidak memiliki kemampuan mengirim atau membuat event; kemampuan itu hanya ada pada tool terpisah.
- **Kesepakatan bukan otorisasi:** persetujuan dalam bahasa alami saja tidak cukup untuk aksi yang berdampak. Aturan ini dibuat struktural setelah pengujian menunjukkan instruksi agen saja tidak memadai.
- **Konteks entitas terverifikasi** sebelum rekomendasi atau draft dibuat.
- **Status aksi transparan** (Recommended, Prepared, Executed) dan jejak audit di action log.
- **Persetujuan hanya ditampilkan bila tercatat;** keberhasilan eksekusi tidak dipakai untuk menyimpulkan persetujuan.
- **Perlindungan duplikasi** agar aksi yang sudah dieksekusi tidak diulang.
- **Fail closed:** bila data gagal dimuat, dashboard menampilkan status error, bukan data pengganti; status tak dikenal tidak dianggap sukses.
- Catatan uji lama, termasuk satu catatan gagal yang tidak lengkap, sengaja tetap terlihat di audit log.

## Expected Business Impact

Dampak yang diharapkan bersifat kualitatif: pemilik usaha lebih cepat mengetahui apa yang perlu perhatian, mengurangi follow-up yang terlambat atau terlewat, menghemat waktu menyiapkan pesan, dan memiliki catatan yang jelas tentang apa yang sudah dilakukan. Kami belum mengukur dampak finansial atau penghematan waktu secara kuantitatif; hal itu memerlukan uji lapangan dengan bisnis nyata.

## Technical Architecture

- **Dashboard:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, komponen Radix/shadcn, Recharts, Framer Motion, Lucide; di-deploy di Vercel; membaca data di sisi server.
- **Agen dan orkestrasi:** IBM Bob, MCP, Langflow (`opspilot`, `opspilot_send_email`, `opspilot_calendar`).
- **Eksekusi eksternal:** Composio untuk Gmail dan Google Calendar.
- **Data operasional:** Google Sheets melalui Google Apps Script, termasuk `action_log`.
- **Keandalan dashboard:** deduplikasi permintaan, revalidasi data sekitar 20 detik, timeout 12 detik per percobaan, maksimal 2 percobaan untuk kegagalan baca sementara, tombol Refresh/Retry.

Demo: https://opspilot-snowy.vercel.app/

## Known Limitations

- Seluruh data adalah data sintetis untuk demonstrasi, bukan data bisnis nyata atau data sensitif.
- Permintaan dingin ke Google Apps Script dapat memakan beberapa detik.
- Website adalah permukaan pemantauan dan pendukung keputusan, bukan permukaan eksekusi; persetujuan manusia terjadi di IBM Bob.
- Audit log dibaca dari Google Sheet; dashboard menampilkannya apa adanya tetapi tidak menjamin anti-manipulasi.
- Catatan uji lama yang tidak lengkap tetap terlihat, tidak dihapus.
- Belum ada autentikasi atau manajemen multi-tenant.
- Tidak ada eksekusi akuntansi atau pembayaran, dan bukan CRM atau ERP lengkap.
- Validasi pengguna hanya 10 responden dan bersifat arah awal.
