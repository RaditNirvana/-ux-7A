"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { TransientNotice } from "@/components/notifications/TransientNotice";
import OwnerIcon from "@/components/owner/OwnerIcon";

type Account = { id: string; name: string; username: string; phone: string; role: string; login: string; registered: string; isSelf?: boolean };
type Form = { nama: string; username: string; password: string; passwordConfirmation: string; role: string };
const roles = ["Owner", "Service Advisor", "Mekanik", "Kasir"];
const empty: Form = { nama: "", username: "", password: "", passwordConfirmation: "", role: "" };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();

export default function OwnerAccountsScreen() {
  const router = useRouter(); const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.indexOf("kelola-akun") >= 0 ? parts.indexOf("kelola-akun") : parts.indexOf("akun");
  const tail = parts.slice(index + 1); const id = tail[0] && tail[0] !== "tambah" ? tail[0] : "";
  const isAdd = tail[0] === "tambah"; const isEdit = tail[1] === "edit"; const isForm = isAdd || isEdit; const isDetail = !!id && !isEdit;
  const [items, setItems] = useState<Account[]>([]); const [selected, setSelected] = useState<Account | null>(null); const [currentUserId, setCurrentUserId] = useState("");
  const [form, setForm] = useState<Form>(empty); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [deleteTarget, setDeleteTarget] = useState<Account | null>(null); const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false); const [confirmationVisible, setConfirmationVisible] = useState(false);
  const loadList = useCallback(async () => { const response = await fetch("/api/owner/akun"); if (response.ok) { const data: Account[] = await response.json(); setItems(data); setCurrentUserId(data.find((item) => item.isSelf)?.id ?? ""); } }, []);
  const loadDetail = useCallback(async () => { if (!id) return; const response = await fetch(`/api/owner/akun/${id}`); const data = await response.json(); if (response.ok) { const account: Account = { id: data.id_pengguna, name: data.nama, username: data.username, phone: data.no_hp, role: data.role, login: data.login, registered: data.tanggal_registrasi }; setSelected(account); setForm({ ...empty, nama: account.name, username: account.username, role: account.role }); } else setError(data.error); }, [id]);
  useEffect(() => { if (!isForm && !isDetail) void loadList(); }, [isForm, isDetail, loadList]);
  useEffect(() => { if (isDetail) void loadDetail(); }, [isDetail, loadDetail]);
  const listHref = "/owner/kelola-akun";
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    if (form.username.length < 4 || form.username.length > 20 || !/^[a-z0-9._]+$/.test(form.username)) { setError("Username harus 4–20 karakter: huruf kecil, angka, titik, atau garis bawah."); return; }
    if (!isEdit && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) { setError("Kata sandi minimal 8 karakter dan harus mengandung huruf dan angka."); return; }
    if ((form.password || form.passwordConfirmation) && form.password !== form.passwordConfirmation) { setError("Konfirmasi kata sandi tidak sama."); return; }
    setBusy(true);
    try {
      const response = await fetch(isAdd ? "/api/owner/akun" : `/api/owner/akun/${id}`, { method: isAdd ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setSuccess(isAdd ? "Akun berhasil ditambahkan." : "Perubahan berhasil disimpan.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Data akun belum dapat disimpan."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleteTarget) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/owner/akun/${deleteTarget.id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSuccess("Akun berhasil dihapus."); setDeleteTarget(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Akun belum dapat dihapus."); }
    finally { setBusy(false); }
  }
  function SuccessNotice() { return success ? <div className="owner-notice-backdrop"><TransientNotice className="owner-success-dialog" onDismiss={() => { setSuccess(""); router.push(listHref); }}><div className="owner-success-icon"><OwnerIcon name="check" size={28}/></div><div><h2>{success === "Perubahan berhasil disimpan." ? "Perubahan berhasil disimpan" : success === "Akun berhasil dihapus." ? "Akun berhasil dihapus" : "Akun berhasil ditambahkan"}</h2><p>{success === "Perubahan berhasil disimpan." ? `Informasi akun ${selected?.name ?? form.nama} (${selected?.username ?? form.username}) telah diperbarui di sistem Bengkel Mitra Jaya Service.` : success === "Akun berhasil dihapus." ? "Akun telah dihapus dari sistem Bengkel Mitra Jaya Service." : `Akun ${form.nama} telah ditambahkan ke sistem Bengkel Mitra Jaya Service.`}</p></div><button onClick={() => { setSuccess(""); router.push(listHref); }}>Kembali ke Kelola Akun</button></TransientNotice></div> : null; }
  const footer = (text = "© Mitra Jaya Service — Sistem Manajemen Bengkel") => <footer className="owner-content-footer">{text}</footer>;

  if (isForm) return <main className={`owner-page owner-account-page ${isAdd ? "owner-account-add" : "owner-account-edit"}`}>
    <h1>{isAdd ? "Tambah Akun" : "Edit Akun"}</h1><div className="owner-account-form-content">
      <Link className="owner-account-back" href={listHref}><OwnerIcon name="arrow-left" size={20}/> Kembali ke Kelola Akun</Link>
      <section className="owner-account-form-banner"><h2>{isAdd ? "Tambah Akun" : "Edit Akun"}</h2><p>{isAdd ? "Buat akun baru dan tentukan role sesuai tanggung jawab pengguna." : `Perbarui informasi akun ${selected?.name ?? ""} sesuai kebutuhan.`}</p></section>
      <form className="owner-account-form-panel" onSubmit={save}>
        <header><b>Informasi Akun</b><span><em>*</em> Wajib diisi</span></header>
        <div className="owner-account-input-grid">
          <label>Nama Pengguna <em>*</em><input required maxLength={100} placeholder="Masukkan nama lengkap" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}/></label>
          <label>Username <em>*</em><input required minLength={4} maxLength={20} pattern="[a-z0-9._]+" placeholder="Contoh: rizky.sa" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}/><small>Gunakan 4–20 karakter: huruf kecil, angka, titik, atau garis bawah.</small></label>
          <label className="full">Role <em>*</em><div className="owner-select-with-icon"><select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="">Pilih role akun</option>{roles.map((role) => <option key={role}>{role}</option>)}</select><OwnerIcon name="chevron-down" size={17}/></div><small>Pilihan role: Owner, Service Advisor, Mekanik, dan Kasir.</small></label>
          <label>Kata Sandi {isAdd && <em>*</em>}<div className="owner-input-with-icon"><input required={isAdd} minLength={isAdd ? 8 : undefined} type={passwordVisible ? "text" : "password"} placeholder={isAdd ? "Masukkan kata sandi" : "Masukkan kata sandi baru (opsional)"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/><button type="button" aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setPasswordVisible(!passwordVisible)}><OwnerIcon name={passwordVisible ? "eye" : "eye-off"} size={17}/></button></div><small>{isAdd ? "Minimal 8 karakter, gunakan kombinasi huruf dan angka." : "Kosongkan untuk mempertahankan kata sandi saat ini."}</small></label>
          <label>Konfirmasi Kata Sandi {isAdd && <em>*</em>}<div className="owner-input-with-icon"><input required={isAdd} type={confirmationVisible ? "text" : "password"} placeholder={isAdd ? "Ulangi kata sandi" : "Ulangi kata sandi baru"} value={form.passwordConfirmation} onChange={(e) => setForm({ ...form, passwordConfirmation: e.target.value })}/><button type="button" aria-label={confirmationVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setConfirmationVisible(!confirmationVisible)}><OwnerIcon name={confirmationVisible ? "eye" : "eye-off"} size={17}/></button></div><small>{isAdd ? "Pastikan sama dengan kata sandi yang dimasukkan." : "Isi hanya jika Anda mengganti kata sandi."}</small></label>
        </div>
        {error && <div className="owner-account-error" role="alert">{error}</div>}
        <footer><Link href={listHref}>Batal</Link><button disabled={busy} type="submit"><OwnerIcon name="save" size={18}/>{busy ? "Menyimpan…" : isAdd ? "Simpan Akun" : "Simpan Perubahan"}</button></footer>
      </form>
    </div><SuccessNotice/>{isEdit && footer()}</main>;

  if (isDetail) return <main className="owner-page owner-account-page owner-account-detail-page"><h1>Detail Akun</h1><section className="owner-account-detail-banner"><b>Detail Akun</b><span>Lihat informasi identitas dan role pengguna yang terdaftar.</span></section><Link className="owner-account-back" href={listHref}><OwnerIcon name="arrow" size={16}/> Kembali ke Kelola Akun</Link><section className="owner-account-detail-panel"><h2>Informasi Akun</h2>{selected ? <div className="owner-account-detail-body"><div className="owner-account-profile"><i>{initials(selected.name)}</i><b>{selected.name}</b><span>{selected.role}</span></div><div className="owner-account-detail-fields"><div><label>Nama Pengguna</label><b>{selected.name}</b></div><div><label>Username</label><b>{selected.username}</b></div><div><label>Role</label><b>{selected.role}</b></div><section><i>🔒</i><span><b>Kata Sandi</b><small>Kata sandi tidak ditampilkan demi keamanan akun.</small></span></section></div></div> : <p>Memuat informasi akun…</p>}<footer><Link href={listHref}>Kembali</Link><Link className="primary" href={`${listHref}/${id}/edit`}>✏️&nbsp; Edit Akun</Link></footer></section>{footer()}</main>;

  return <main className="owner-page owner-account-page owner-account-list-page">
    <h1>Kelola Akun</h1><section className="owner-account-list-banner"><div><b>Kelola Akun</b><span>Atur akun dan hak akses pengguna Bengkel Mitra Jaya Service.</span></div><Link href={`${listHref}/tambah`}>+ Tambah Akun</Link></section>
    <section className="owner-account-list-card"><header><b>Daftar Akun</b><span>{items.length} akun terdaftar • {new Set(items.map((item) => item.role)).size} role</span></header><div className="owner-account-list-scroll"><div className="owner-account-list-head"><b>Nama Pengguna</b><b>Username</b><b>Role</b><b>Aksi</b></div>{items.map((item) => <div className={`owner-account-list-row ${item.id === currentUserId ? "is-self" : ""}`} key={item.id}><div className="owner-account-identity"><i className={item.id === currentUserId ? "self" : ""}>{initials(item.name)}</i><span><b>{item.name}</b>{item.id === currentUserId && <small>Akun Anda</small>}</span></div><span>{item.username}</span><span><i className="owner-role-chip">{item.role}</i></span><div className="owner-account-actions"><Link href={`${listHref}/${item.id}/edit`}>Edit</Link><Link href={`${listHref}/${item.id}`}>Detail</Link><button onClick={() => { setDeleteTarget(item); setError(""); }}>Hapus</button></div></div>)}</div><footer><span>Menampilkan 1–{items.length} dari {items.length} akun</span><span>Pilih Detail untuk melihat informasi akun.</span></footer></section>
    {deleteTarget && <div className="owner-account-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDeleteTarget(null); setError(""); } }}><section className="owner-account-delete-dialog"><i className="owner-delete-icon"><OwnerIcon name="alert" size={26}/></i><h2>Hapus Akun?</h2><p>Anda akan menghapus akun berikut dari sistem Bengkel Mitra Jaya Service.</p><div className="owner-delete-identity"><i>{initials(deleteTarget.name)}</i><span><b>{deleteTarget.name}</b><small>{deleteTarget.username}</small></span><strong>{deleteTarget.role}</strong></div><div className="owner-delete-warning"><OwnerIcon name="alert" size={20}/><span>Penghapusan bersifat permanen dan tidak dapat dibatalkan. Pengguna tidak lagi dapat masuk ke sistem.</span></div>{error && <div className="owner-account-error" role="alert">{error}</div>}<footer><button onClick={() => setDeleteTarget(null)}>Batal</button><button disabled={busy} onClick={remove}>{busy ? "Menghapus…" : "Hapus Akun"}</button></footer></section></div>}
    <SuccessNotice/>{footer()}</main>;
}
