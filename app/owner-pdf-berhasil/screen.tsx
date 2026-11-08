"use client";

export default function OwnerPdfSuccess({ query }: { query: string }) {
  const destination = `/owner/buat-laporan${query ? `?${query}` : ""}`;
  return <main className="owner-full-page pdf-success"><header>Mitra Jaya Service</header><h1>Unduh Laporan</h1><section><div className="pdf-check">✓</div><h2>PDF berhasil diunduh!</h2><p>Laporan berhasil disimpan sebagai PDF ke perangkat Anda.</p><a href={destination}>Selesai</a></section></main>;
}
