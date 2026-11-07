# AGENTS.md: Mitra Jaya Servis

## Gambaran proyek
Aplikasi web bengkel "Mitra Jaya Servis" (praktikum APSI Modul 4). Lima role: Customer, Service Advisor (SA), Mekanik, Kasir, Owner. UI dibuat dari desain Figma, backend dan database dibangun dengan bantuan agen AI (vibe coding) dan diperiksa manual.

## Teknologi
- Next.js 16 (App Router), TypeScript, CSS/Tailwind
- Prisma 7 (driver adapter @prisma/adapter-pg), PostgreSQL (Docker `db-ux` untuk lokal; Neon untuk deploy)
- Autentikasi: bcryptjs (hash password), jose (JWT di cookie httpOnly)
- Proteksi route per role ada di `proxy.ts` (Next.js 16 memakai nama Proxy, bukan `middleware.ts`). Ubah file itu, jangan membuat `middleware.ts` baru.
- Deploy rencana: Vercel + Neon

## Cara menjalankan (lokal)
1. `docker start db-ux`
2. `npm install`
3. `npm run dev` (http://localhost:3000)
4. `.env` berisi DATABASE_URL dan secret login (jangan di-commit)

## Sumber desain (Figma)
File: https://www.figma.com/design/og4XMzH0P50x4JDP0X7C7T/7A_USER-INTERFACE (satu page, semua aktor, frame 1440x900). Figma adalah sumber kebenaran untuk tampilan.
- Sebelum membuat atau mengubah layar, baca frame-nya lewat alat Figma (get_design_context, get_screenshot, get_variable_defs, get_motion_context bila ada animasi) dan baca interaksi prototype. Jangan menebak desain. Jika alat Figma gagal, berhenti dan tanyakan.
- Samakan persis: layout, jarak, font (ukuran, berat, line-height), warna, radius, bayangan, ikon, teks, urutan kolom tabel. Pakai aset ikon/logo dari Figma (SVG di `public/figma-assets`), bukan library ikon lain.
- Alat Figma hanya memberi varian Default. State hover, aktif, fokus, nonaktif, error, kosong, dan loading harus dibuat konsisten dengan bahasa desain proyek; laporkan state yang diperkirakan.
- Banyak frame adalah STATE dari satu layar (modal, konfirmasi, notifikasi sukses, daftar setelah ubah). Buat SATU route dengan state, bukan satu halaman per frame. Frame bernama baris (SP-001, PO-003, M-004, SRV-002) adalah layar yang sama dengan contoh data berbeda: tampilkan data nyata.
- Ukuran dalam Figma adalah piksel CSS 1:1. Bandingkan di viewport 1440x900 (DevTools mode responsif), bukan di layar penuh dengan skala Windows 125%.

## Aturan layout
- Setiap layar aplikasi adalah frame 1440x900 satu layar. Badan halaman TIDAK boleh memanjang pada state default di 1440x900. Tabel panjang scroll di dalam kartunya (header sticky) atau memakai paginasi seperti di Figma. Padding, gap, tinggi baris, dan ukuran font diambil dari Figma, bukan nilai bawaan.
- Latar dan header full-bleed (100% lebar layar); hanya isi yang dibatasi container tengah (maks 1440). Tidak ada celah putih di kiri-kanan, tidak ada scrollbar horizontal dari 1280 sampai 2560.
- Sidebar mengikuti Figma tiap role (jangan disatukan menjadi satu komponen):
  - Customer, SA, Mekanik, Owner: overlay yang dibuka tombol hamburger (backdrop, animasi buka/tutup, tutup dengan klik backdrop dan Escape, scroll terkunci, item aktif disorot). Tidak ada strip atau rail permanen di samping konten.
  - Kasir: sidebar PERMANEN, tanpa hamburger dan tanpa overlay (frame 90:2024, 90:2147).
  - Mekanik: lebar 240px, logo sayap putih, label item aktif berwarna biru di pil putih; hamburger 40x40 dengan tiga batang 20x2px (jarak 5px).
- Notifikasi (toast/notice): hilang otomatis setelah 4 detik dengan fade-out, berhenti saat di-hover, tidak muncul lagi setelah reload atau navigasi, timer dibersihkan saat unmount. Gunakan komponen notifikasi yang sudah ada.

## Hak akses (Permission Matrix, dipaksakan di SERVER)
Acuan: `docs/permission-matrix.md` jika ada. Ringkasan:
- Semua role: baca dan ubah akunnya sendiri.
- Customer: CRUD kendaraan sendiri; buat/ubah/hapus servis sendiri hanya saat masih "Menunggu Verifikasi"; baca rincian biaya sendiri; persetujuan biaya (Setuju atau Batalkan servis dengan alasan_batal wajib).
- Service Advisor: verifikasi pendaftaran, konfirmasi kebutuhan servis, batalkan jika sparepart tidak tersedia; CRUD penugasan_mekanik; baca penggunaan_sparepart; CRUD stok dan pemesanan sparepart. SA TIDAK menyentuh rincian_biaya atau persetujuan_biaya.
- Mekanik: hanya penugasan miliknya; ubah servis hanya kolom tanggal_pemeriksaan, hasil_pemeriksaan, kebutuhan_servis, tanggal_mulai, hasil_servis, tanggal_selesai, status_servis; CRUD penggunaan_sparepart miliknya; tidak mengubah stok langsung.
- Kasir: baca customer/servis/persetujuan; CRUD rincian_biaya; buat/baca pembayaran dan validasi jumlah; buat/baca transaksi dan cetak bukti. Kasir TIDAK menulis kolom servis.
- Owner: buat dan baca laporan; baca pembayaran, transaksi, servis.
- Setiap halaman, API route, dan server action memeriksa session dan role (403 bila salah), kepemilikan data, dan daftar kolom yang boleh diubah (whitelist eksplisit).

## Keputusan yang berlaku (konflik Figma vs matrix)
- K1: SA tetap punya CRUD Data Mekanik sesuai Figma (matrix hanya baca).
- K2: rincian_biaya dibuat Kasir, bukan SA.
- K3: Kasir tidak menulis status servis; field status di form rincian hanya tampilan.
- K4: Kelola Akun Kasir mengikuti Figma, tetapi server membatasi Kasir pada akun role Customer dan akunnya sendiri; hanya 5 role nyata (tidak ada "Admin"); tidak boleh menghapus akun sendiri.
- K5: Kelola Akun Owner mengikuti Figma; Owner tidak boleh menghapus akunnya sendiri.
- K6: metode pembayaran "VA" dipetakan ke Transfer (CHECK database hanya Tunai, Transfer, QRIS).
- K7: pembatalan = status_servis 'Batal' + alasan_batal wajib; tidak ada status baru.
- K8: baris pembayaran dan transaksi final dibuat/divalidasi Kasir (Lunas + Terkonfirmasi); Customer tidak boleh menandai Lunas.

## Alur servis (status_servis)
Nilai yang sah: Menunggu Verifikasi, Menunggu Penugasan, Ditugaskan, Diperiksa, Menunggu Persetujuan, Siap Dikerjakan, Diproses, Selesai, Batal. Jangan menambah nilai baru.
Alur: Customer daftar -> SA verifikasi dan tugaskan -> Mekanik periksa -> SA konfirmasi kebutuhan -> Kasir membuat rincian biaya (servis menjadi Menunggu Persetujuan, persetujuan_biaya 'Menunggu') -> Customer setuju (Siap Dikerjakan) atau batalkan -> Mekanik "Mulai servis" (Diproses; stok sparepart berkurang di transaksi yang sama, riwayat_stok 'Pemakaian servis') -> "Selesaikan servis" (Selesai) -> Kasir memvalidasi pembayaran dan mencatat transaksi -> Owner membuat laporan. Setiap perubahan status menulis riwayat_status_servis.

## Aturan data dan keamanan
- Jangan mengubah `prisma/schema.prisma`, `database.sql`, atau `.env`. Jika desain butuh sesuatu yang tidak ada di database, berhenti dan laporkan.
- Data di UI harus nyata dari Prisma, bukan data contoh Figma. Nama, plat, ID, dan nominal contoh di Figma tidak dipakai.
- Penulisan ke beberapa tabel memakai `prisma.$transaction`. ID adalah kode VARCHAR (V001, M001, SP-001, PO-001, R001, PB01, T001); buat ID berikutnya di dalam transaksi. Format ID di Figma (SRV-001, M-001) hanya untuk tampilan.
- Validasi input di server dan patuhi constraint DDL (UNIQUE, CHECK, panjang VARCHAR). Tampilkan error di UI dengan state error/notifikasi yang dirancang.
- Password di-hash dengan bcrypt (cost 10), tidak pernah dikembalikan oleh API, dan tidak ditulis ke file, log, laporan, atau commit.
- Mata uang: Rp 1.130.000. Tanggal berformat Indonesia seperti di Figma.

## Cara kerja agen
- Jangan meluncurkan subagen. Kerjakan sendiri, per bagian kecil.
- Awali dengan `git status` dan `git diff --stat`; pakai ulang yang sudah ada (komponen, helper, route), jangan membuat ulang. Jangan menyentuh halaman role lain kecuali serah-terima yang memang dibutuhkan, dan laporkan.
- Tulis rencana singkat dulu: frame -> route -> state -> endpoint. Setelah itu kerjakan tanpa bertanya, kecuali ada konflik baru atau celah database: berhenti di bagian itu, daftarkan, lanjut ke bagian berikutnya.
- Jangan menambah library tanpa izin. Jangan melakukan commit kecuali diminta.
- Sebelum selesai: `npm run lint`, `npm run build`, bandingkan layar dengan Figma pada 1440x900, cek `scrollHeight <= innerHeight` pada state default, uji state modal/error/sukses dan route role lain (harus diblokir), lalu laporkan: file yang berubah, frame yang tercakup, endpoint, hal yang belum cocok, asumsi, celah database.

## Status pekerjaan (perbarui setiap selesai satu tahap, setelah diverifikasi)
- Selesai: landing, pilih role, login/logout/register, proxy per role, Customer, SA, Mekanik (5A–5D), koreksi hak akses P4.
- Owner (Tahap 7A–7C) selesai; lint/build, API, CRUD akun semua role (akun uji dibersihkan), laporan Oktober (L002; transaksi L001 tidak tertimpa), unduhan PDF, periode invalid, dan akses role telah diverifikasi. Perbandingan visual 1440×900 masih perlu dilakukan.
- Berikutnya: Kasir (Tahap 6: Dashboard, Rincian Biaya Servis, Pembayaran, Bukti Transaksi, Kelola Akun).
- Perbaikan tertunda: halaman Customer (strip kiri dihapus; chip status "Servis aktif" harus sama dengan aktivitas terbaru; teks aktivitas tanpa kurung siku; aturan "Tagihan menunggu"), halaman SA yang memanjang ke bawah (harus pas 1440x900), tautan Dashboard Mekanik, rute SA ganda (penugasan / penugasan-mekanik, status-servis / proses-servis, stok-sparepart / sparepart, verifikasi / pendaftaran-servis: hapus yang tidak dipakai sidebar), peringatan rasio gambar SVG di terminal.

## Celah database yang diketahui
- Tidak ada metode pembayaran "VA" (dipetakan ke Transfer).
- Tidak ada status "pengajuan pembatalan" (dipakai status Batal + alasan_batal).
- Tabel sparepart tidak punya kolom harga: biaya_sparepart pada rincian_biaya diisi Kasir.
- pembayaran.id_kasir NOT NULL: baris pembayaran dibuat Kasir (K8).

## Akun uji (lokal)
Akun uji tiap role ada di data awal `database.sql`. Hanya untuk pengembangan lokal; ganti password sebelum deploy publik.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
