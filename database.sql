CREATE TABLE users (
    id_user SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL
);

CREATE TABLE transaksi (
    id_transaksi SERIAL PRIMARY KEY,
    id_user INTEGER NOT NULL,
    nama_barang VARCHAR(100) NOT NULL,
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    harga_satuan NUMERIC(12,2) NOT NULL CHECK (harga_satuan >= 0),
    tanggal TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_user)
        REFERENCES users(id_user)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

SELECT * FROM transaksi;