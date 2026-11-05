-- =====================================================================
-- Sistem Informasi Pelayanan Mitra Jaya Service
-- DDL PostgreSQL (disesuaikan dengan UI Figma, berdasarkan ERD Modul 3)
-- Eksekusi: psql -U <user> -d <database> -f schema.sql
-- =====================================================================

-- Opsional: reset ulang database (hapus semua tabel)
DROP TABLE IF EXISTS transaksi, laporan, pembayaran, persetujuan_biaya, rincian_biaya,
  pemesanan_sparepart, penggunaan_sparepart, riwayat_stok, sparepart, supplier,
  penugasan_mekanik, riwayat_status_servis, servis, kendaraan,
  owner, kasir, mekanik, service_advisor, customer, pengguna CASCADE;

-- ---------------------------------------------------------------------
-- 1. PENGGUNA DAN ROLE
-- ---------------------------------------------------------------------
CREATE TABLE pengguna (
  id_pengguna        VARCHAR(4)   PRIMARY KEY,
  nama               VARCHAR(100) NOT NULL,
  username           VARCHAR(50)  NOT NULL UNIQUE,
  password           VARCHAR(255) NOT NULL,            -- simpan hasil hash (bcrypt = 60 karakter)
  no_hp              VARCHAR(15)  NOT NULL,
  role               VARCHAR(20)  NOT NULL
                     CHECK (role IN ('Customer','Service Advisor','Mekanik','Kasir','Owner')),
  login              VARCHAR(20)  NOT NULL DEFAULT 'Aktif'
                     CHECK (login IN ('Aktif','Nonaktif')),
  tanggal_registrasi DATE         NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE customer (
  id_customer VARCHAR(4) PRIMARY KEY,
  id_pengguna VARCHAR(4) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- Menu "Data Kendaraan" pada UI Customer: satu customer dapat memiliki lebih dari satu kendaraan
CREATE TABLE kendaraan (
  id_kendaraan   VARCHAR(4)  PRIMARY KEY,
  id_customer    VARCHAR(4)  NOT NULL REFERENCES customer(id_customer) ON DELETE CASCADE,
  nomor_plat     VARCHAR(15) NOT NULL UNIQUE,
  merek          VARCHAR(50) NOT NULL,
  tipe_kendaraan VARCHAR(50) NOT NULL,
  tahun_kendaraan INTEGER    NOT NULL CHECK (tahun_kendaraan BETWEEN 1980 AND 2100),
  nomor_rangka   VARCHAR(30) UNIQUE,
  kilometer      INTEGER     CHECK (kilometer >= 0)
);

CREATE TABLE service_advisor (
  id_sa       VARCHAR(4) PRIMARY KEY,
  id_pengguna VARCHAR(4) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

CREATE TABLE mekanik (
  id_mekanik          VARCHAR(4)  PRIMARY KEY,
  status_ketersediaan VARCHAR(20) NOT NULL DEFAULT 'Tersedia'
                      CHECK (status_ketersediaan IN ('Tersedia','Sedang Bekerja')),
  id_pengguna         VARCHAR(4)  NOT NULL UNIQUE REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

CREATE TABLE kasir (
  id_kasir    VARCHAR(4) PRIMARY KEY,
  id_pengguna VARCHAR(4) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

CREATE TABLE owner (
  id_owner    VARCHAR(4) PRIMARY KEY,
  id_pengguna VARCHAR(4) NOT NULL UNIQUE REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 2. SERVIS
-- ---------------------------------------------------------------------
CREATE TABLE servis (
  id_servis              VARCHAR(4)   PRIMARY KEY,
  nomor_antrian          VARCHAR(10)  NOT NULL UNIQUE,
  tanggal_daftar         DATE         NOT NULL DEFAULT CURRENT_DATE,
  keluhan                VARCHAR(300) NOT NULL,
  catatan_kedatangan     VARCHAR(255),
  status_verifikasi      VARCHAR(20)  NOT NULL DEFAULT 'Menunggu'
                         CHECK (status_verifikasi IN ('Menunggu','Terverifikasi','Ditolak')),
  estimasi_waktu_tunggu  VARCHAR(30),
  tanggal_pemeriksaan    TIMESTAMP,
  hasil_pemeriksaan      VARCHAR(300),
  kebutuhan_servis       VARCHAR(300),
  tanggal_mulai          TIMESTAMP,
  tanggal_selesai        TIMESTAMP,
  status_servis          VARCHAR(25)  NOT NULL DEFAULT 'Menunggu Verifikasi'
                         CHECK (status_servis IN ('Menunggu Verifikasi','Menunggu Penugasan','Ditugaskan',
                           'Diperiksa','Menunggu Persetujuan','Siap Dikerjakan','Diproses','Selesai','Batal')),
  hasil_servis           VARCHAR(300),
  alasan_batal           VARCHAR(300),
  id_kendaraan           VARCHAR(4)   NOT NULL REFERENCES kendaraan(id_kendaraan),
  id_sa                  VARCHAR(4)   REFERENCES service_advisor(id_sa),   -- terisi saat diverifikasi
  CHECK (tanggal_selesai IS NULL OR tanggal_mulai IS NULL OR tanggal_selesai >= tanggal_mulai)
);

-- Menu "Proses dan Status Servis" pada UI Service Advisor (timeline tahapan)
CREATE TABLE riwayat_status_servis (
  id_riwayat  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_servis   VARCHAR(4)   NOT NULL REFERENCES servis(id_servis) ON DELETE CASCADE,
  tahap       VARCHAR(50)  NOT NULL,
  keterangan  VARCHAR(255),
  waktu       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE penugasan_mekanik (
  id_data_mekanik   VARCHAR(4)  PRIMARY KEY,
  tanggal_penugasan TIMESTAMP   NOT NULL DEFAULT NOW(),
  status_penugasan  VARCHAR(20) NOT NULL DEFAULT 'Ditugaskan'
                    CHECK (status_penugasan IN ('Ditugaskan','Diproses','Selesai','Batal')),
  id_servis         VARCHAR(4)  NOT NULL REFERENCES servis(id_servis),
  id_mekanik        VARCHAR(4)  NOT NULL REFERENCES mekanik(id_mekanik)
);

-- ---------------------------------------------------------------------
-- 3. SPAREPART: STOK, PEMESANAN, PENGGUNAAN (menu Service Advisor)
-- ---------------------------------------------------------------------
CREATE TABLE supplier (
  id_supplier      VARCHAR(4)  PRIMARY KEY,
  nama_supplier    VARCHAR(50) NOT NULL UNIQUE,
  kontak_supplier  VARCHAR(15)
);

CREATE TABLE sparepart (
  id_sparepart        VARCHAR(6)   PRIMARY KEY,         -- contoh: SP-001
  nama_sparepart      VARCHAR(100) NOT NULL UNIQUE,
  kategori            VARCHAR(30)  NOT NULL,
  satuan              VARCHAR(15)  NOT NULL,            -- pcs, liter, set, tabung
  stok                INTEGER      NOT NULL DEFAULT 0 CHECK (stok >= 0),
  batas_minimum       INTEGER      NOT NULL DEFAULT 0 CHECK (batas_minimum >= 0),
  lokasi_penyimpanan  VARCHAR(50),
  status_aktif        VARCHAR(10)  NOT NULL DEFAULT 'Aktif' CHECK (status_aktif IN ('Aktif','Tidak aktif')),
  tanggal_diperbarui  TIMESTAMP    NOT NULL DEFAULT NOW(),
  id_supplier         VARCHAR(4)   REFERENCES supplier(id_supplier)
);
-- Status Tersedia / Stok menipis / Habis dihitung di aplikasi:
--   stok = 0 -> Habis ; stok < batas_minimum -> Stok menipis ; selain itu -> Tersedia

CREATE TABLE riwayat_stok (
  id_riwayat     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_sparepart   VARCHAR(6)   NOT NULL REFERENCES sparepart(id_sparepart) ON DELETE CASCADE,
  jenis          VARCHAR(25)  NOT NULL
                 CHECK (jenis IN ('Stok awal','Penyesuaian','Pemakaian servis','Penerimaan pesanan')),
  jumlah_sebelum INTEGER      NOT NULL CHECK (jumlah_sebelum >= 0),
  jumlah_sesudah INTEGER      NOT NULL CHECK (jumlah_sesudah >= 0),
  catatan        VARCHAR(255),                           -- contoh: "Penyesuaian hasil stok opname: 18 -> 24 liter"
  waktu          TIMESTAMP    NOT NULL DEFAULT NOW(),
  id_sa          VARCHAR(4)   REFERENCES service_advisor(id_sa)
);

CREATE TABLE pemesanan_sparepart (
  id_pemesanan       VARCHAR(6)   PRIMARY KEY,           -- contoh: PO-001
  id_sparepart       VARCHAR(6)   NOT NULL REFERENCES sparepart(id_sparepart),
  id_supplier        VARCHAR(4)   NOT NULL REFERENCES supplier(id_supplier),
  jumlah             INTEGER      NOT NULL CHECK (jumlah > 0),
  tanggal_pemesanan  DATE         NOT NULL DEFAULT CURRENT_DATE,
  estimasi_tiba      DATE,
  status_pemesanan   VARCHAR(20)  NOT NULL DEFAULT 'Draf'
                     CHECK (status_pemesanan IN ('Draf','Dipesan','Diterima','Dibatalkan')),
  catatan            VARCHAR(255),
  dibuat_pada        TIMESTAMP    NOT NULL DEFAULT NOW(),
  id_sa              VARCHAR(4)   NOT NULL REFERENCES service_advisor(id_sa),
  CHECK (estimasi_tiba IS NULL OR estimasi_tiba >= tanggal_pemesanan)
);
-- Stok bertambah hanya saat status_pemesanan berubah menjadi 'Diterima' (dilakukan di aplikasi)

CREATE TABLE penggunaan_sparepart (
  id_servis                      VARCHAR(4)   NOT NULL REFERENCES servis(id_servis) ON DELETE CASCADE,
  id_sparepart                   VARCHAR(6)   NOT NULL REFERENCES sparepart(id_sparepart),
  bagian_diganti                 VARCHAR(100),
  jumlah_sparepart               INTEGER      NOT NULL CHECK (jumlah_sparepart > 0),
  status_ketersediaan_sparepart  VARCHAR(20)  NOT NULL DEFAULT 'Tersedia'
                                 CHECK (status_ketersediaan_sparepart IN ('Tersedia','Tidak tersedia')),
  status_pemesanan               VARCHAR(20)  NOT NULL DEFAULT 'Tidak dipesan'
                                 CHECK (status_pemesanan IN ('Tidak dipesan','Sudah dipesan')),
  id_pemesanan                   VARCHAR(6)   REFERENCES pemesanan_sparepart(id_pemesanan),
  PRIMARY KEY (id_servis, id_sparepart)
);

-- ---------------------------------------------------------------------
-- 4. BIAYA, PERSETUJUAN, PEMBAYARAN
-- ---------------------------------------------------------------------
CREATE TABLE rincian_biaya (
  id_rincian      VARCHAR(4)    PRIMARY KEY,
  tanggal_rincian DATE          NOT NULL DEFAULT CURRENT_DATE,
  biaya_jasa      DECIMAL(12,2) NOT NULL CHECK (biaya_jasa >= 0),
  biaya_sparepart DECIMAL(12,2) NOT NULL CHECK (biaya_sparepart >= 0),
  total_biaya     DECIMAL(12,2) NOT NULL,
  id_servis       VARCHAR(4)    NOT NULL UNIQUE REFERENCES servis(id_servis),
  CHECK (total_biaya = biaya_jasa + biaya_sparepart)
);

CREATE TABLE persetujuan_biaya (
  id_persetujuan      VARCHAR(4)  PRIMARY KEY,
  tanggal_persetujuan TIMESTAMP,
  status_persetujuan  VARCHAR(20) NOT NULL DEFAULT 'Menunggu'
                      CHECK (status_persetujuan IN ('Menunggu','Setuju','Tidak setuju')),
  id_rincian          VARCHAR(4)  NOT NULL UNIQUE REFERENCES rincian_biaya(id_rincian)
);

CREATE TABLE pembayaran (
  id_pembayaran          VARCHAR(4)    PRIMARY KEY,
  tanggal_pembayaran     TIMESTAMP     NOT NULL DEFAULT NOW(),
  metode_pembayaran      VARCHAR(30)   NOT NULL CHECK (metode_pembayaran IN ('Tunai','Transfer','QRIS')),
  jumlah_bayar           DECIMAL(12,2) NOT NULL CHECK (jumlah_bayar > 0),
  status_pembayaran      VARCHAR(20)   NOT NULL DEFAULT 'Menunggu' CHECK (status_pembayaran IN ('Menunggu','Lunas')),
  konfirmasi_pembayaran  VARCHAR(20)   NOT NULL DEFAULT 'Belum Dikonfirmasi'
                         CHECK (konfirmasi_pembayaran IN ('Belum Dikonfirmasi','Terkonfirmasi')),
  id_rincian             VARCHAR(4)    NOT NULL REFERENCES rincian_biaya(id_rincian),
  id_kasir               VARCHAR(4)    NOT NULL REFERENCES kasir(id_kasir)
);

-- ---------------------------------------------------------------------
-- 5. LAPORAN DAN TRANSAKSI (menu Owner)
-- ---------------------------------------------------------------------
CREATE TABLE laporan (
  id_laporan       VARCHAR(4)    PRIMARY KEY,
  jenis_laporan    VARCHAR(50)   NOT NULL
                   CHECK (jenis_laporan IN ('Laporan Transaksi','Laporan Pelayanan Servis','Statistik Pelayanan','Laporan Bulanan')),
  periode_awal     DATE          NOT NULL,
  periode_akhir    DATE          NOT NULL,
  tanggal_dibuat   DATE          NOT NULL DEFAULT CURRENT_DATE,
  total_servis     INTEGER       NOT NULL DEFAULT 0 CHECK (total_servis >= 0),
  total_pendapatan DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_pendapatan >= 0),
  id_owner         VARCHAR(4)    NOT NULL REFERENCES owner(id_owner),
  CHECK (periode_akhir >= periode_awal)
);

CREATE TABLE transaksi (
  id_transaksi      VARCHAR(4) PRIMARY KEY,
  tanggal_transaksi DATE       NOT NULL DEFAULT CURRENT_DATE,
  id_laporan        VARCHAR(4) REFERENCES laporan(id_laporan),   -- boleh kosong sebelum laporan dibuat
  id_pembayaran     VARCHAR(4) NOT NULL UNIQUE REFERENCES pembayaran(id_pembayaran)
);

-- ---------------------------------------------------------------------
-- 6. INDEX UNTUK KOLOM YANG SERING DIFILTER
-- ---------------------------------------------------------------------
CREATE INDEX idx_kendaraan_customer    ON kendaraan(id_customer);
CREATE INDEX idx_servis_kendaraan      ON servis(id_kendaraan);
CREATE INDEX idx_servis_status         ON servis(status_servis);
CREATE INDEX idx_penugasan_mekanik     ON penugasan_mekanik(id_mekanik, status_penugasan);
CREATE INDEX idx_penugasan_servis      ON penugasan_mekanik(id_servis);
CREATE INDEX idx_riwayat_status_servis ON riwayat_status_servis(id_servis, waktu);
CREATE INDEX idx_riwayat_stok          ON riwayat_stok(id_sparepart, waktu);
CREATE INDEX idx_pemesanan_status      ON pemesanan_sparepart(status_pemesanan);
CREATE INDEX idx_pembayaran_kasir      ON pembayaran(id_kasir);
CREATE INDEX idx_transaksi_laporan     ON transaksi(id_laporan);

-- Seed data Mitra Jaya Service (dari Normalized.xlsx). Jalankan SETELAH database.sql.
-- Akun uji (kata sandi asli): lihat tabel di akhir file.
BEGIN;

-- 1. PENGGUNA (kata sandi disimpan sebagai hash bcrypt)
INSERT INTO pengguna (id_pengguna, nama, username, password, no_hp, role, login, tanggal_registrasi) VALUES
  ('P001', 'Budi Santoso', 'budi_s', '$2b$10$XI6FphM/BxReWvybDFynGeqvUcH5FuzWUszQTWdF/iKcTXMFa5762', '081234567890', 'Customer', 'Aktif', '2026-09-20'),
  ('P002', 'Sari Wulandari', 'sari.wul', '$2b$10$zcCVon5lAsm.KdjO7o.DTOmn0GuTrBcx.mEaIWj6gctvPLtkhc/lm', '081345678901', 'Customer', 'Aktif', '2026-09-25'),
  ('P003', 'Agus Prasetyo', 'agusp88', '$2b$10$Lye0TdvOg6aybAPtbjjvDuukrQbif/gUE16or0RS5Q89SlAVgwr6G', '081356781234', 'Customer', 'Aktif', '2026-09-26'),
  ('P004', 'Maya Anggraini', 'mayaang', '$2b$10$0uh1qU7QvrY0b.Uhg50KGe7iNXIa3aiUc9f0PZ2usdynO5bsS988e', '081267893456', 'Customer', 'Aktif', '2026-09-27'),
  ('P005', 'Rizki Hidayat', 'rizki_h', '$2b$10$SI8l1ugy1tJUwOboOOmAgunUBt9qeBGNAZ/hPmE9v0SRBLCeaQ0p6', '081378904567', 'Customer', 'Aktif', '2026-09-28'),
  ('P006', 'Fitri Handayani', 'fitri.hd', '$2b$10$mL234d755JpM3NPPEreYPuDY.QqqgryTI.Nrsr0fvFhtD6.MRLg5m', '081289015678', 'Customer', 'Aktif', '2026-09-29'),
  ('P007', 'Doni Saputra', 'donisptr', '$2b$10$AUKxSJVZPtyB5LA7HTDMZuX69iVYo6sjzORsUxSzDkj6u/L9bbNkG', '081390126789', 'Customer', 'Aktif', '2026-09-30'),
  ('P008', 'Lina Marlina', 'lina_m', '$2b$10$OD8MVHjKnAWNKb1td72xmeJ85rcyA20qvDkBtR/JNp9.bc3s6ZRIe', '081201237890', 'Customer', 'Aktif', '2026-10-01'),
  ('P009', 'Hasan Basri', 'hasanb15', '$2b$10$MuZkAmVk0N1NwUNGmjLXWuLclSsBI7AhC54ZxgsrwbJLk3sqDzLLi', '081312348901', 'Customer', 'Aktif', '2026-10-01'),
  ('P010', 'Wulan Sari', 'wulan.s', '$2b$10$EJ.aGDjKHZu4MehyLWFkcOA1dGgieWwHDt6.o/DtcPTVJrws8ltwC', '081223459012', 'Customer', 'Aktif', '2026-10-02'),
  ('P011', 'Bambang Irawan', 'bambang_i', '$2b$10$G4C2dTnUMI6LwRe0SPr9..gp.UJoErjNfjPAvKi/iNW8POP9oWfe.', '081334560123', 'Customer', 'Aktif', '2026-10-03'),
  ('P012', 'Nurul Aini', 'nurul.aini', '$2b$10$CDB.AvgdhSayIVDkpk.a5umtzr1Qu5InzhwLOuMTUMIlC.aUlS7mG', '081245671234', 'Customer', 'Aktif', '2026-10-04'),
  ('P013', 'Eko Wahyudi', 'ekow', '$2b$10$gqcQThbdoOnaFcVSt4Deb.Hq9ZEdunt2uItAmvty1H1pJ8tGcFZuC', '081356782345', 'Customer', 'Aktif', '2026-10-05'),
  ('P014', 'Putri Ayu', 'putri.ayu', '$2b$10$CXoV0tZDxxVruxQmclxTSuNuJ3R.2ObHHdZfW.bftof9GNW/irzcS', '081267893457', 'Customer', 'Aktif', '2026-10-06'),
  ('P015', 'Rudi Hartono', 'rudi_h', '$2b$10$b.a1Ym2v3p/RNnt2x1bZZ.BG8wWMKlhDhdlI1Xzg1T59LmBBQoona', '081378904568', 'Customer', 'Aktif', '2026-10-07'),
  ('P016', 'Kalista Putri Fauzan', 'kalista_sa', '$2b$10$WijZVt0yEWmPLkAZcoBeVO70dR7DeIlvvgRV8GHWbZw/M82Q85Uzm', '082173242006', 'Service Advisor', 'Aktif', '2026-09-15'),
  ('P017', 'Muhammad Raditya Ghayyas', 'raditya_m', '$2b$10$1sA/wPLFT6b9uZ19aEsS8.sMTi6c7vZk65JpzmvcNmT4FvjFyuMWi', '081374552322', 'Mekanik', 'Aktif', '2026-09-15'),
  ('P018', 'Elsi Erlinda', 'elsi_m', '$2b$10$tuY8kDOZ2l0dzEu5h6VCyOv5/ZOOWnrQnWddk3UZbCfH4G0XwUlTK', '081388822120', 'Mekanik', 'Aktif', '2026-09-15'),
  ('P019', 'Serly Mei Witri', 'serly_k', '$2b$10$n6qvlL6HEAOUgUwubP45Vefkj4S7E5EZPk/qE/YTs3byato6wLjtS', '081200000001', 'Kasir', 'Aktif', '2026-09-15'),
  ('P020', 'Divya Amara Putri', 'divya_o', '$2b$10$RIg7kRR.lCFvD6eWB7MZB.jrbOhXWzmc4x1BR0ZVl4wO3oMB4dX26', '081200000002', 'Owner', 'Aktif', '2026-09-15');

-- 2. ROLE
INSERT INTO customer (id_customer, id_pengguna) VALUES
  ('C001', 'P001'),
  ('C002', 'P002'),
  ('C003', 'P003'),
  ('C004', 'P004'),
  ('C005', 'P005'),
  ('C006', 'P006'),
  ('C007', 'P007'),
  ('C008', 'P008'),
  ('C009', 'P009'),
  ('C010', 'P010'),
  ('C011', 'P011'),
  ('C012', 'P012'),
  ('C013', 'P013'),
  ('C014', 'P014'),
  ('C015', 'P015');
INSERT INTO service_advisor (id_sa, id_pengguna) VALUES
  ('SA01', 'P016');
INSERT INTO mekanik (id_mekanik, status_ketersediaan, id_pengguna) VALUES
  ('M001', 'Tersedia', 'P017'),
  ('M002', 'Tersedia', 'P018');
INSERT INTO kasir (id_kasir, id_pengguna) VALUES
  ('K001', 'P019');
INSERT INTO owner (id_owner, id_pengguna) VALUES
  ('O001', 'P020');

-- 3. KENDARAAN
INSERT INTO kendaraan (id_kendaraan, id_customer, nomor_plat, merek, tipe_kendaraan, tahun_kendaraan, nomor_rangka) VALUES
  ('V001', 'C001', 'BA 1234 XY', 'Toyota', 'Avanza', 2019, 'MHFM1BA3J9K123456'),
  ('V002', 'C002', 'BA 5678 AB', 'Honda', 'Beat', 2021, 'MH1JM2110MK234567'),
  ('V003', 'C003', 'BA 2345 CD', 'Suzuki', 'Ertiga', 2018, 'MHYKZE81SJJ345678'),
  ('V004', 'C004', 'BA 3456 EF', 'Daihatsu', 'Xenia', 2017, 'MHKV1BA2JHK456789'),
  ('V005', 'C005', 'BA 4567 GH', 'Yamaha', 'NMAX', 2022, 'MH3SG3190NK567890'),
  ('V006', 'C006', 'BA 5679 IJ', 'Honda', 'Jazz', 2016, 'MRHGK5870GP678901'),
  ('V007', 'C007', 'BA 6789 KL', 'Mitsubishi', 'Xpander', 2020, 'MK2NC1UNJLJ789012'),
  ('V008', 'C008', 'BA 7890 MN', 'Honda', 'Vario', 2020, 'MH1JM3120LK890123'),
  ('V009', 'C009', 'BA 8901 OP', 'Toyota', 'Innova', 2015, 'MHFXW43G1F0901234'),
  ('V010', 'C010', 'BA 1011 QR', 'Honda', 'Brio', 2019, 'MHRDD1830KJ012345'),
  ('V011', 'C011', 'BA 1213 ST', 'Suzuki', 'Satria', 2014, 'MH8BG41CAEJ123450'),
  ('V012', 'C012', 'BA 1415 UV', 'Toyota', 'Calya', 2021, 'MHKA4DA3JMK234501'),
  ('V013', 'C013', 'BA 1617 WX', 'Honda', 'CR-V', 2017, 'MRHRW1860HP345012'),
  ('V014', 'C014', 'BA 1819 YZ', 'Honda', 'Scoopy', 2023, 'MH1JM4110PK456123'),
  ('V015', 'C015', 'BA 2021 AB', 'Toyota', 'Fortuner', 2016, 'MHFYZ59G3GK567234');

-- 4. SERVIS
INSERT INTO servis (id_servis, nomor_antrian, tanggal_daftar, keluhan, catatan_kedatangan, status_verifikasi, estimasi_waktu_tunggu, tanggal_pemeriksaan, hasil_pemeriksaan, kebutuhan_servis, tanggal_mulai, tanggal_selesai, status_servis, hasil_servis, alasan_batal, id_kendaraan, id_sa) VALUES
  ('S001', 'A-001', '2026-10-01', 'Rem berbunyi dan mesin kasar', 'Ada lecet di bumper depan', 'Terverifikasi', NULL, '2026-10-01 09:30:00', 'Kampas rem depan aus, oli kotor', 'Ganti kampas rem dan oli mesin', '2026-10-01 13:00:00', '2026-10-01 15:30:00', 'Selesai', 'Kampas rem dan oli sudah diganti', NULL, 'V001', 'SA01'),
  ('S002', 'A-002', '2026-10-02', 'Mesin bergetar saat idle', NULL, 'Terverifikasi', '30 menit', '2026-10-02 10:20:00', 'Busi aus', 'Ganti busi', '2026-10-02 10:45:00', '2026-10-02 11:30:00', 'Selesai', 'Busi sudah diganti', NULL, 'V002', 'SA01'),
  ('S003', 'A-003', '2026-10-02', 'AC tidak dingin dan berbau apek', NULL, 'Terverifikasi', NULL, '2026-10-02 11:15:00', 'Freon habis, filter kabin kotor', 'Isi freon dan ganti filter kabin', '2026-10-02 11:45:00', '2026-10-02 13:15:00', 'Selesai', 'Freon terisi dan filter kabin sudah diganti', NULL, 'V003', 'SA01'),
  ('S004', 'A-004', '2026-10-03', 'Servis ganti oli rutin', NULL, 'Terverifikasi', NULL, '2026-10-03 08:40:00', 'Oli mesin melewati batas pemakaian', 'Ganti oli mesin dan filter oli', '2026-10-03 09:00:00', '2026-10-03 09:45:00', 'Selesai', 'Oli dan filter oli sudah diganti', NULL, 'V004', 'SA01'),
  ('S005', 'A-005', '2026-10-03', 'Suara kasar saat motor berjalan', 'Goresan di bodi kiri', 'Terverifikasi', NULL, '2026-10-03 10:30:00', 'V-belt aus dan roller CVT rusak', 'Ganti V-belt dan roller', '2026-10-03 11:15:00', '2026-10-03 13:00:00', 'Selesai', 'V-belt dan roller sudah diganti', NULL, 'V005', 'SA01'),
  ('S006', 'A-006', '2026-10-05', 'Aki sering soak dan mesin sulit hidup', NULL, 'Terverifikasi', NULL, '2026-10-05 09:15:00', 'Aki lemah dan tidak bisa diisi ulang', 'Ganti aki', NULL, NULL, 'Batal', NULL, 'Sparepart tidak tersedia', 'V006', 'SA01'),
  ('S007', 'A-007', '2026-10-05', 'Suspensi depan berbunyi di jalan rusak', NULL, 'Terverifikasi', NULL, '2026-10-05 10:45:00', 'Shockbreaker depan bocor', 'Ganti shockbreaker depan kiri dan kanan', NULL, NULL, 'Batal', NULL, 'Customer tidak menyetujui biaya servis', 'V007', 'SA01'),
  ('S008', 'A-008', '2026-10-06', 'Motor susah dihidupkan pagi hari', NULL, 'Terverifikasi', '45 menit', '2026-10-06 10:25:00', 'Busi kotor dan aki lemah', 'Ganti busi dan aki', '2026-10-06 11:00:00', '2026-10-06 12:00:00', 'Selesai', 'Busi dan aki sudah diganti', NULL, 'V008', 'SA01'),
  ('S009', 'A-009', '2026-10-06', 'Mesin cepat panas dan air radiator berkurang', 'Ada rembesan air di bawah mobil', 'Terverifikasi', NULL, '2026-10-06 08:40:00', 'Radiator bocor, coolant habis', 'Ganti radiator dan coolant', '2026-10-08 09:00:00', '2026-10-08 15:00:00', 'Selesai', 'Radiator dan coolant sudah diganti', NULL, 'V009', 'SA01'),
  ('S010', 'A-010', '2026-10-07', 'Lampu depan sebelah kiri mati', NULL, 'Terverifikasi', NULL, '2026-10-07 09:10:00', 'Bohlam H4 putus', 'Ganti bohlam depan', '2026-10-07 09:30:00', '2026-10-07 10:00:00', 'Selesai', 'Bohlam depan sudah diganti', NULL, 'V010', 'SA01'),
  ('S011', 'A-011', '2026-10-07', 'Rem belakang blong', NULL, 'Terverifikasi', NULL, '2026-10-07 13:10:00', 'Kampas rem belakang habis, minyak rem kurang', 'Ganti kampas rem belakang dan minyak rem', '2026-10-07 13:40:00', '2026-10-07 14:30:00', 'Selesai', 'Kampas rem dan minyak rem sudah diganti', NULL, 'V011', 'SA01'),
  ('S012', 'A-012', '2026-10-08', 'Servis berkala 20.000 km', NULL, 'Terverifikasi', NULL, '2026-10-08 09:00:00', 'Oli dan filter perlu diganti', 'Ganti oli, filter oli, dan filter udara', '2026-10-08 09:40:00', '2026-10-08 11:30:00', 'Selesai', 'Oli dan kedua filter sudah diganti', NULL, 'V012', 'SA01'),
  ('S013', 'A-013', '2026-10-08', 'Setir bergetar di kecepatan tinggi', 'Ban depan sudah botak sebagian', 'Terverifikasi', NULL, '2026-10-08 12:45:00', 'Roda tidak seimbang dan sudut roda melenceng', 'Spooring dan balancing', '2026-10-08 13:15:00', '2026-10-08 14:45:00', 'Selesai', 'Spooring dan balancing selesai', NULL, 'V013', 'SA01'),
  ('S014', 'A-014', '2026-10-09', 'Klakson tidak berbunyi', NULL, 'Terverifikasi', '20 menit', '2026-10-09 09:35:00', 'Klakson rusak', 'Ganti klakson', '2026-10-09 10:00:00', '2026-10-09 10:30:00', 'Selesai', 'Klakson sudah diganti', NULL, 'V014', 'SA01'),
  ('S015', 'A-015', '2026-10-09', 'Mesin brebet dan tarikan berat', 'Lampu check engine menyala', 'Terverifikasi', NULL, '2026-10-09 11:20:00', 'Injektor kotor dan sebagian rusak', 'Ganti injektor', NULL, NULL, 'Batal', NULL, 'Sparepart tidak tersedia', 'V015', 'SA01');

-- 5. PENUGASAN MEKANIK (mekanik M003-M015 pada data awal dipetakan ke M001/M002 sesuai sheet 1NF)
INSERT INTO penugasan_mekanik (id_data_mekanik, tanggal_penugasan, status_penugasan, id_servis, id_mekanik) VALUES
  ('DM01', '2026-10-01 09:15:00', 'Selesai', 'S001', 'M001'),
  ('DM02', '2026-10-02 10:00:00', 'Selesai', 'S002', 'M002'),
  ('DM03', '2026-10-02 11:00:00', 'Selesai', 'S003', 'M001'),
  ('DM04', '2026-10-03 08:30:00', 'Selesai', 'S004', 'M002'),
  ('DM05', '2026-10-03 10:15:00', 'Selesai', 'S005', 'M001'),
  ('DM06', '2026-10-05 09:00:00', 'Batal', 'S006', 'M002'),
  ('DM07', '2026-10-05 10:30:00', 'Batal', 'S007', 'M001'),
  ('DM08', '2026-10-06 10:10:00', 'Selesai', 'S008', 'M002'),
  ('DM09', '2026-10-06 08:30:00', 'Selesai', 'S009', 'M002'),
  ('DM10', '2026-10-07 09:00:00', 'Selesai', 'S010', 'M002'),
  ('DM11', '2026-10-07 13:00:00', 'Selesai', 'S011', 'M001'),
  ('DM12', '2026-10-08 08:45:00', 'Selesai', 'S012', 'M001'),
  ('DM13', '2026-10-08 12:30:00', 'Selesai', 'S013', 'M001'),
  ('DM14', '2026-10-09 09:20:00', 'Selesai', 'S014', 'M002'),
  ('DM15', '2026-10-09 11:00:00', 'Batal', 'S015', 'M001');

-- 6. RIWAYAT STATUS SERVIS (jam "Pendaftaran diverifikasi" = 08.00, nilai contoh)
INSERT INTO riwayat_status_servis (id_servis, tahap, keterangan, waktu) VALUES
  ('S001', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-01 08:00:00'),
  ('S001', 'Mekanik ditugaskan', NULL, '2026-10-01 09:15:00'),
  ('S001', 'Hasil pemeriksaan dicatat', 'Kampas rem depan aus, oli kotor', '2026-10-01 09:30:00'),
  ('S001', 'Persetujuan biaya', 'Setuju', '2026-10-01 09:50:00'),
  ('S001', 'Servis dimulai', NULL, '2026-10-01 13:00:00'),
  ('S001', 'Servis selesai', 'Kampas rem dan oli sudah diganti', '2026-10-01 15:30:00'),
  ('S002', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-02 08:00:00'),
  ('S002', 'Mekanik ditugaskan', NULL, '2026-10-02 10:00:00'),
  ('S002', 'Hasil pemeriksaan dicatat', 'Busi aus', '2026-10-02 10:20:00'),
  ('S002', 'Persetujuan biaya', 'Setuju', '2026-10-02 10:30:00'),
  ('S002', 'Servis dimulai', NULL, '2026-10-02 10:45:00'),
  ('S002', 'Servis selesai', 'Busi sudah diganti', '2026-10-02 11:30:00'),
  ('S003', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-02 08:00:00'),
  ('S003', 'Mekanik ditugaskan', NULL, '2026-10-02 11:00:00'),
  ('S003', 'Hasil pemeriksaan dicatat', 'Freon habis, filter kabin kotor', '2026-10-02 11:15:00'),
  ('S003', 'Persetujuan biaya', 'Setuju', '2026-10-02 11:30:00'),
  ('S003', 'Servis dimulai', NULL, '2026-10-02 11:45:00'),
  ('S003', 'Servis selesai', 'Freon terisi dan filter kabin sudah diganti', '2026-10-02 13:15:00'),
  ('S004', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-03 08:00:00'),
  ('S004', 'Mekanik ditugaskan', NULL, '2026-10-03 08:30:00'),
  ('S004', 'Hasil pemeriksaan dicatat', 'Oli mesin melewati batas pemakaian', '2026-10-03 08:40:00'),
  ('S004', 'Persetujuan biaya', 'Setuju', '2026-10-03 08:50:00'),
  ('S004', 'Servis dimulai', NULL, '2026-10-03 09:00:00'),
  ('S004', 'Servis selesai', 'Oli dan filter oli sudah diganti', '2026-10-03 09:45:00'),
  ('S005', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-03 08:00:00'),
  ('S005', 'Mekanik ditugaskan', NULL, '2026-10-03 10:15:00'),
  ('S005', 'Hasil pemeriksaan dicatat', 'V-belt aus dan roller CVT rusak', '2026-10-03 10:30:00'),
  ('S005', 'Persetujuan biaya', 'Setuju', '2026-10-03 10:50:00'),
  ('S005', 'Servis dimulai', NULL, '2026-10-03 11:15:00'),
  ('S005', 'Servis selesai', 'V-belt dan roller sudah diganti', '2026-10-03 13:00:00'),
  ('S006', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-05 08:00:00'),
  ('S006', 'Mekanik ditugaskan', NULL, '2026-10-05 09:00:00'),
  ('S006', 'Hasil pemeriksaan dicatat', 'Aki lemah dan tidak bisa diisi ulang', '2026-10-05 09:15:00'),
  ('S006', 'Servis dibatalkan', 'Sparepart tidak tersedia', '2026-10-05 09:20:00'),
  ('S007', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-05 08:00:00'),
  ('S007', 'Mekanik ditugaskan', NULL, '2026-10-05 10:30:00'),
  ('S007', 'Hasil pemeriksaan dicatat', 'Shockbreaker depan bocor', '2026-10-05 10:45:00'),
  ('S007', 'Persetujuan biaya', 'Tidak setuju', '2026-10-05 11:00:00'),
  ('S007', 'Servis dibatalkan', 'Customer tidak menyetujui biaya servis', '2026-10-05 10:50:00'),
  ('S008', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-06 08:00:00'),
  ('S008', 'Mekanik ditugaskan', NULL, '2026-10-06 10:10:00'),
  ('S008', 'Hasil pemeriksaan dicatat', 'Busi kotor dan aki lemah', '2026-10-06 10:25:00'),
  ('S008', 'Persetujuan biaya', 'Setuju', '2026-10-06 10:40:00'),
  ('S008', 'Servis dimulai', NULL, '2026-10-06 11:00:00'),
  ('S008', 'Servis selesai', 'Busi dan aki sudah diganti', '2026-10-06 12:00:00'),
  ('S009', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-06 08:00:00'),
  ('S009', 'Mekanik ditugaskan', NULL, '2026-10-06 08:30:00'),
  ('S009', 'Hasil pemeriksaan dicatat', 'Radiator bocor, coolant habis', '2026-10-06 08:40:00'),
  ('S009', 'Persetujuan biaya', 'Setuju', '2026-10-06 09:10:00'),
  ('S009', 'Servis dimulai', NULL, '2026-10-08 09:00:00'),
  ('S009', 'Servis selesai', 'Radiator dan coolant sudah diganti', '2026-10-08 15:00:00'),
  ('S010', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-07 08:00:00'),
  ('S010', 'Mekanik ditugaskan', NULL, '2026-10-07 09:00:00'),
  ('S010', 'Hasil pemeriksaan dicatat', 'Bohlam H4 putus', '2026-10-07 09:10:00'),
  ('S010', 'Persetujuan biaya', 'Setuju', '2026-10-07 09:20:00'),
  ('S010', 'Servis dimulai', NULL, '2026-10-07 09:30:00'),
  ('S010', 'Servis selesai', 'Bohlam depan sudah diganti', '2026-10-07 10:00:00'),
  ('S011', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-07 08:00:00'),
  ('S011', 'Mekanik ditugaskan', NULL, '2026-10-07 13:00:00'),
  ('S011', 'Hasil pemeriksaan dicatat', 'Kampas rem belakang habis, minyak rem kurang', '2026-10-07 13:10:00'),
  ('S011', 'Persetujuan biaya', 'Setuju', '2026-10-07 13:25:00'),
  ('S011', 'Servis dimulai', NULL, '2026-10-07 13:40:00'),
  ('S011', 'Servis selesai', 'Kampas rem dan minyak rem sudah diganti', '2026-10-07 14:30:00'),
  ('S012', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-08 08:00:00'),
  ('S012', 'Mekanik ditugaskan', NULL, '2026-10-08 08:45:00'),
  ('S012', 'Hasil pemeriksaan dicatat', 'Oli dan filter perlu diganti', '2026-10-08 09:00:00'),
  ('S012', 'Persetujuan biaya', 'Setuju', '2026-10-08 09:30:00'),
  ('S012', 'Servis dimulai', NULL, '2026-10-08 09:40:00'),
  ('S012', 'Servis selesai', 'Oli dan kedua filter sudah diganti', '2026-10-08 11:30:00'),
  ('S013', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-08 08:00:00'),
  ('S013', 'Mekanik ditugaskan', NULL, '2026-10-08 12:30:00'),
  ('S013', 'Hasil pemeriksaan dicatat', 'Roda tidak seimbang dan sudut roda melenceng', '2026-10-08 12:45:00'),
  ('S013', 'Persetujuan biaya', 'Setuju', '2026-10-08 13:00:00'),
  ('S013', 'Servis dimulai', NULL, '2026-10-08 13:15:00'),
  ('S013', 'Servis selesai', 'Spooring dan balancing selesai', '2026-10-08 14:45:00'),
  ('S014', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-09 08:00:00'),
  ('S014', 'Mekanik ditugaskan', NULL, '2026-10-09 09:20:00'),
  ('S014', 'Hasil pemeriksaan dicatat', 'Klakson rusak', '2026-10-09 09:35:00'),
  ('S014', 'Persetujuan biaya', 'Setuju', '2026-10-09 09:45:00'),
  ('S014', 'Servis dimulai', NULL, '2026-10-09 10:00:00'),
  ('S014', 'Servis selesai', 'Klakson sudah diganti', '2026-10-09 10:30:00'),
  ('S015', 'Pendaftaran diverifikasi', 'Data customer dan kendaraan sesuai', '2026-10-09 08:00:00'),
  ('S015', 'Mekanik ditugaskan', NULL, '2026-10-09 11:00:00'),
  ('S015', 'Hasil pemeriksaan dicatat', 'Injektor kotor dan sebagian rusak', '2026-10-09 11:20:00'),
  ('S015', 'Servis dibatalkan', 'Sparepart tidak tersedia', '2026-10-09 11:25:00');

-- 7. SUPPLIER (nomor kontak contoh)
INSERT INTO supplier (id_supplier, nama_supplier, kontak_supplier) VALUES
  ('SU01', 'CV Dingin Jaya', '0751445001'),
  ('SU02', 'CV Maju Jaya', '0751445002'),
  ('SU03', 'PT Power Baterai', '0751445003'),
  ('SU04', 'PT Sinar Motor', '0751445004');

-- 8. SPAREPART (stok, batas minimum, dan lokasi = nilai contoh)
INSERT INTO sparepart (id_sparepart, nama_sparepart, kategori, satuan, stok, batas_minimum, lokasi_penyimpanan, status_aktif, tanggal_diperbarui, id_supplier) VALUES
  ('SP-001', 'Kampas rem depan', 'Rem', 'set', 12, 4, 'Rak A-01 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-002', 'Oli Shell 10W-40', 'Pelumas', 'liter', 40, 10, 'Rak B-01 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU02'),
  ('SP-003', 'Busi NGK', 'Kelistrikan', 'pcs', 30, 8, 'Rak C-01 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-004', 'Freon R134a', 'AC', 'tabung', 6, 3, 'Rak D-01 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU01'),
  ('SP-005', 'Filter kabin', 'Filter', 'pcs', 10, 3, 'Rak A-02 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-006', 'Filter oli', 'Filter', 'pcs', 20, 5, 'Rak B-02 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU02'),
  ('SP-007', 'V-belt NMAX', 'Transmisi', 'pcs', 5, 2, 'Rak C-02 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-008', 'Roller set', 'Transmisi', 'set', 6, 2, 'Rak D-02 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-009', 'Aki GS 45Ah', 'Kelistrikan', 'pcs', 0, 2, 'Rak A-03 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU03'),
  ('SP-010', 'Shockbreaker depan', 'Suspensi', 'pcs', 4, 2, 'Rak B-03 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-011', 'Busi Iridium', 'Kelistrikan', 'pcs', 16, 6, 'Rak C-03 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-012', 'Aki motor', 'Kelistrikan', 'pcs', 5, 2, 'Rak D-03 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU03'),
  ('SP-013', 'Radiator Innova', 'Pendingin', 'pcs', 1, 1, 'Rak A-04 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU01'),
  ('SP-014', 'Coolant', 'Pendingin', 'liter', 15, 5, 'Rak B-04 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU01'),
  ('SP-015', 'Bohlam H4', 'Kelistrikan', 'pcs', 12, 4, 'Rak C-04 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-016', 'Kampas rem belakang', 'Rem', 'set', 8, 3, 'Rak D-04 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-017', 'Minyak rem DOT 3', 'Rem', 'botol', 14, 4, 'Rak A-05 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU02'),
  ('SP-018', 'Filter udara', 'Filter', 'pcs', 9, 3, 'Rak B-05 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-019', 'Klakson Denso', 'Kelistrikan', 'pcs', 4, 2, 'Rak C-05 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04'),
  ('SP-020', 'Injektor', 'Bahan bakar', 'pcs', 0, 4, 'Rak D-05 - Gudang utama', 'Aktif', '2026-10-01 08:00:00', 'SU04');

-- 9. PEMESANAN SPAREPART (dibuat dari status "Sudah dipesan" pada data penggunaan sparepart)
INSERT INTO pemesanan_sparepart (id_pemesanan, id_sparepart, id_supplier, jumlah, tanggal_pemesanan, estimasi_tiba, status_pemesanan, catatan, dibuat_pada, id_sa) VALUES
  ('PO-001', 'SP-002', 'SU02', 3, '2026-10-01', '2026-10-01', 'Diterima', 'Pesanan untuk servis S001', '2026-10-01 09:55:00', 'SA01'),
  ('PO-002', 'SP-013', 'SU01', 1, '2026-10-06', '2026-10-08', 'Diterima', 'Pesanan untuk servis S009', '2026-10-06 09:20:00', 'SA01');

-- 10. PENGGUNAAN SPAREPART
INSERT INTO penggunaan_sparepart (id_servis, id_sparepart, bagian_diganti, jumlah_sparepart, status_ketersediaan_sparepart, status_pemesanan, id_pemesanan) VALUES
  ('S001', 'SP-001', 'Rem depan', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S001', 'SP-002', 'Oli mesin', 3, 'Tidak tersedia', 'Sudah dipesan', 'PO-001'),
  ('S002', 'SP-003', 'Busi', 4, 'Tersedia', 'Tidak dipesan', NULL),
  ('S003', 'SP-004', 'Sistem AC', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S003', 'SP-005', 'Kabin', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S004', 'SP-002', 'Mesin', 4, 'Tersedia', 'Tidak dipesan', NULL),
  ('S004', 'SP-006', 'Filter oli', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S005', 'SP-007', 'V-belt', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S005', 'SP-008', 'Roller CVT', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S006', 'SP-009', 'Kelistrikan', 1, 'Tidak tersedia', 'Tidak dipesan', NULL),
  ('S007', 'SP-010', 'Suspensi depan', 2, 'Tersedia', 'Tidak dipesan', NULL),
  ('S008', 'SP-011', 'Busi', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S008', 'SP-012', 'Kelistrikan', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S009', 'SP-013', 'Radiator', 1, 'Tidak tersedia', 'Sudah dipesan', 'PO-002'),
  ('S009', 'SP-014', 'Coolant', 2, 'Tersedia', 'Tidak dipesan', NULL),
  ('S010', 'SP-015', 'Lampu depan', 2, 'Tersedia', 'Tidak dipesan', NULL),
  ('S011', 'SP-016', 'Rem belakang', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S011', 'SP-017', 'Minyak rem', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S012', 'SP-002', 'Mesin', 4, 'Tersedia', 'Tidak dipesan', NULL),
  ('S012', 'SP-006', 'Filter oli', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S012', 'SP-018', 'Filter udara', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S014', 'SP-019', 'Klakson', 1, 'Tersedia', 'Tidak dipesan', NULL),
  ('S015', 'SP-020', 'Sistem bahan bakar', 4, 'Tidak tersedia', 'Tidak dipesan', NULL);

-- 11. RINCIAN BIAYA
INSERT INTO rincian_biaya (id_rincian, tanggal_rincian, biaya_jasa, biaya_sparepart, total_biaya, id_servis) VALUES
  ('R001', '2026-10-01', 150000, 300000, 450000, 'S001'),
  ('R002', '2026-10-02', 120000, 200000, 320000, 'S002'),
  ('R003', '2026-10-02', 200000, 235000, 435000, 'S003'),
  ('R004', '2026-10-03', 50000, 285000, 335000, 'S004'),
  ('R005', '2026-10-03', 100000, 350000, 450000, 'S005'),
  ('R006', '2026-10-05', 300000, 1200000, 1500000, 'S007'),
  ('R007', '2026-10-06', 80000, 230000, 310000, 'S008'),
  ('R008', '2026-10-06', 400000, 1220000, 1620000, 'S009'),
  ('R009', '2026-10-07', 30000, 90000, 120000, 'S010'),
  ('R010', '2026-10-07', 60000, 120000, 180000, 'S011'),
  ('R011', '2026-10-08', 150000, 420000, 570000, 'S012'),
  ('R012', '2026-10-08', 150000, 0, 150000, 'S013'),
  ('R013', '2026-10-09', 25000, 65000, 90000, 'S014');

-- 12. PERSETUJUAN BIAYA
INSERT INTO persetujuan_biaya (id_persetujuan, tanggal_persetujuan, status_persetujuan, id_rincian) VALUES
  ('PS01', '2026-10-01 09:50:00', 'Setuju', 'R001'),
  ('PS02', '2026-10-02 10:30:00', 'Setuju', 'R002'),
  ('PS03', '2026-10-02 11:30:00', 'Setuju', 'R003'),
  ('PS04', '2026-10-03 08:50:00', 'Setuju', 'R004'),
  ('PS05', '2026-10-03 10:50:00', 'Setuju', 'R005'),
  ('PS06', '2026-10-05 11:00:00', 'Tidak setuju', 'R006'),
  ('PS07', '2026-10-06 10:40:00', 'Setuju', 'R007'),
  ('PS08', '2026-10-06 09:10:00', 'Setuju', 'R008'),
  ('PS09', '2026-10-07 09:20:00', 'Setuju', 'R009'),
  ('PS10', '2026-10-07 13:25:00', 'Setuju', 'R010'),
  ('PS11', '2026-10-08 09:30:00', 'Setuju', 'R011'),
  ('PS12', '2026-10-08 13:00:00', 'Setuju', 'R012'),
  ('PS13', '2026-10-09 09:45:00', 'Setuju', 'R013');

-- 13. PEMBAYARAN (kasir K002-K012 pada data awal dipetakan ke K001)
INSERT INTO pembayaran (id_pembayaran, tanggal_pembayaran, metode_pembayaran, jumlah_bayar, status_pembayaran, konfirmasi_pembayaran, id_rincian, id_kasir) VALUES
  ('PB01', '2026-10-01 15:45:00', 'Tunai', 450000, 'Lunas', 'Terkonfirmasi', 'R001', 'K001'),
  ('PB02', '2026-10-02 11:40:00', 'Transfer', 320000, 'Lunas', 'Terkonfirmasi', 'R002', 'K001'),
  ('PB03', '2026-10-02 13:25:00', 'QRIS', 435000, 'Lunas', 'Terkonfirmasi', 'R003', 'K001'),
  ('PB04', '2026-10-03 09:55:00', 'Tunai', 335000, 'Lunas', 'Terkonfirmasi', 'R004', 'K001'),
  ('PB05', '2026-10-03 13:10:00', 'Transfer', 450000, 'Lunas', 'Terkonfirmasi', 'R005', 'K001'),
  ('PB06', '2026-10-06 12:10:00', 'Tunai', 310000, 'Lunas', 'Terkonfirmasi', 'R007', 'K001'),
  ('PB07', '2026-10-08 15:20:00', 'Transfer', 1620000, 'Lunas', 'Terkonfirmasi', 'R008', 'K001'),
  ('PB08', '2026-10-07 10:10:00', 'Tunai', 120000, 'Lunas', 'Terkonfirmasi', 'R009', 'K001'),
  ('PB09', '2026-10-07 14:40:00', 'QRIS', 180000, 'Lunas', 'Terkonfirmasi', 'R010', 'K001'),
  ('PB10', '2026-10-08 11:45:00', 'Transfer', 570000, 'Lunas', 'Terkonfirmasi', 'R011', 'K001'),
  ('PB11', '2026-10-08 14:55:00', 'Tunai', 150000, 'Lunas', 'Terkonfirmasi', 'R012', 'K001'),
  ('PB12', '2026-10-09 10:40:00', 'QRIS', 90000, 'Lunas', 'Terkonfirmasi', 'R013', 'K001');

-- 14. LAPORAN DAN TRANSAKSI
INSERT INTO laporan (id_laporan, jenis_laporan, periode_awal, periode_akhir, tanggal_dibuat, total_servis, total_pendapatan, id_owner) VALUES
  ('L001', 'Laporan Bulanan', '2026-10-01', '2026-10-31', '2026-10-31', 12, 5030000, 'O001');
INSERT INTO transaksi (id_transaksi, tanggal_transaksi, id_laporan, id_pembayaran) VALUES
  ('T001', '2026-10-01', 'L001', 'PB01'),
  ('T002', '2026-10-02', 'L001', 'PB02'),
  ('T003', '2026-10-02', 'L001', 'PB03'),
  ('T004', '2026-10-03', 'L001', 'PB04'),
  ('T005', '2026-10-03', 'L001', 'PB05'),
  ('T006', '2026-10-06', 'L001', 'PB06'),
  ('T007', '2026-10-08', 'L001', 'PB07'),
  ('T008', '2026-10-07', 'L001', 'PB08'),
  ('T009', '2026-10-07', 'L001', 'PB09'),
  ('T010', '2026-10-08', 'L001', 'PB10'),
  ('T011', '2026-10-08', 'L001', 'PB11'),
  ('T012', '2026-10-09', 'L001', 'PB12');

COMMIT;

-- AKUN UJI (username / kata sandi)
--   Customer         budi_s         b123456
--   Customer         sari.wul       sari2021
--   Customer         agusp88        motor88
--   Customer         mayaang        maya2017
--   Customer         rizki_h        nmax2022
--   Customer         fitri.hd       12345678
--   Customer         donisptr       doni789
--   Customer         lina_m         lina0809
--   Customer         hasanb15       innova15
--   Customer         wulan.s        wulan2019
--   Customer         bambang_i      satria14
--   Customer         nurul.aini     calya2021
--   Customer         ekow           eko171717
--   Customer         putri.ayu      ayu2023
--   Customer         rudi_h         fortuner16
--   Service Advisor  kalista_sa     sa12345
--   Mekanik          raditya_m      mekanik123
--   Mekanik          elsi_m         mekanik123
--   Kasir            serly_k        kasir12345
--   Owner            divya_o        owner12345
