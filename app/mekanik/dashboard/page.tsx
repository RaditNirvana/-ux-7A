import Image from "next/image";
import { redirect } from "next/navigation";
import { getRoleDashboardPath } from "@/lib/role-routing";
import { getSessionUser } from "@/lib/session-user";
import { prisma } from "@/lib/prisma";
import MekanikPageHeader from "@/components/MekanikPageHeader";

export const instant = false;

const statusStyle: Record<string, string> = {
  Ditugaskan: "bg-[#f3f4f6] text-[#4b5563]",
  Diperiksa: "bg-[#dbeafe] text-[#2563eb]",
  "Siap Dikerjakan": "bg-[#fef9c3] text-[#ca8a04]",
  Diproses: "bg-[#ffedd5] text-[#ea580c]",
  Selesai: "bg-[#dcfce7] text-[#15803d]",
  Batal: "bg-[#fee2e2] text-[#b91c1c]",
};

function getDisplayServiceId(id: string, registeredAt: Date) {
  const sequence = id.match(/\d+/)?.[0] ?? id;
  return `SRV-${registeredAt.getFullYear()}-${sequence.padStart(4, "0")}`;
}

function cleanComplaint(complaint: string) {
  return complaint.replace(/[\[\]]/g, "").trim();
}

export default async function MechanicDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  if (user.role !== "Mekanik") redirect(getRoleDashboardPath(user.role));

  const mechanic = await prisma.mekanik.findUnique({
    where: { id_pengguna: user.id_pengguna },
    select: { id_mekanik: true, status_ketersediaan: true },
  });
  if (!mechanic) redirect(getRoleDashboardPath(user.role));

  const jobs = await prisma.penugasan_mekanik.findMany({
    where: { id_mekanik: mechanic.id_mekanik },
    orderBy: [{ tanggal_penugasan: "desc" }, { id_data_mekanik: "desc" }],
    include: {
      servis: {
        include: {
          kendaraan: {
            include: { customer: { include: { pengguna: { select: { nama: true } } } } },
          },
        },
      },
    },
  });

  const counts = jobs.reduce((result, job) => {
    result[job.servis.status_servis] = (result[job.servis.status_servis] ?? 0) + 1;
    return result;
  }, {} as Record<string, number>);
  const activeJobs = jobs.filter((job) => job.servis.status_servis !== "Batal");
  const completed = counts.Selesai ?? 0;
  const progress = activeJobs.length ? Math.round((completed / activeJobs.length) * 100) : 0;
  const nextJob = jobs.find((job) => ["Ditugaskan", "Diperiksa", "Siap Dikerjakan", "Diproses"].includes(job.servis.status_servis));
  const today = new Date();
  const jakartaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
  const todayKey = jakartaDay.format(today);
  const completedToday = jobs.filter((job) => job.servis.status_servis === "Selesai" && job.servis.tanggal_selesai && jakartaDay.format(job.servis.tanggal_selesai) === todayKey).length;

  return (
    <div className="min-h-screen bg-[#eef0ff] font-[var(--font-poppins)]">
      <MekanikPageHeader
        title="Dashboard"
        name={user.nama}
        availability={mechanic.status_ketersediaan}
      />

      <div className="mx-auto max-w-[1440px] space-y-6 p-8 max-md:p-4">
        <div className="grid h-44 grid-cols-[888fr_464fr] gap-6 max-xl:h-auto max-xl:grid-cols-1">
          <section className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0ad8] via-[#3b4bff] to-[#8f9bff] px-8 py-6 text-white max-xl:h-auto max-xl:min-h-44">
            <span aria-hidden="true" className="absolute -right-12 -top-20 size-[280px] rounded-full bg-white/10" /><span aria-hidden="true" className="absolute -bottom-28 right-28 size-[200px] rounded-full bg-white/[0.08]" />
            {nextJob ? <>
              <div className="relative flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-white/75">Selamat datang, {user.nama.split(" ")[0]} - Tugas berikutnya</p><h2 className="mt-1 truncate text-xl font-bold leading-6">{getDisplayServiceId(nextJob.servis.id_servis, nextJob.servis.tanggal_daftar)} - {nextJob.servis.kendaraan.merek} {nextJob.servis.kendaraan.tipe_kendaraan}</h2><p className="mt-1 truncate text-xs text-white/85">{nextJob.servis.kendaraan.nomor_plat} - {cleanComplaint(nextJob.servis.keluhan)}</p></div><span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs">{nextJob.servis.status_servis}</span></div>
              <div className="relative mt-3 flex items-center justify-between gap-4"><p className="truncate text-xs text-white/80">Pemilik: {nextJob.servis.kendaraan.customer.pengguna.nama}{nextJob.servis.kendaraan.kilometer != null ? ` - ${nextJob.servis.kendaraan.kilometer.toLocaleString("id-ID")} km` : ""}</p><span className="shrink-0 rounded-[10px] bg-white px-5 py-2 text-xs font-semibold text-[#0f14f0]">Mulai Pemeriksaan</span></div>
            </> : <div className="relative flex h-full min-h-32 flex-col justify-center"><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-white/75">Selamat datang, {user.nama.split(" ")[0]}</p><h2 className="mt-2 text-2xl font-bold">Tidak ada tugas aktif</h2><p className="mt-1 text-sm text-white/85">Tugas servis yang diberikan kepadamu akan tampil di sini.</p></div>}
          </section>
          <section className="flex h-44 items-center gap-6 rounded-2xl bg-white p-6 shadow-[0_8px_12px_rgba(16,24,40,.06)] max-xl:h-auto max-xl:min-h-44">
            <div className="relative grid size-[104px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0f14f0 ${progress}%, #e5e7eb ${progress}% 100%)` }}><div className="grid size-[78px] place-items-center rounded-full bg-white"><div className="text-center"><p className="text-2xl font-bold">{completed}</p><p className="text-[11px] text-[#6b7280]">dari {activeJobs.length}</p></div></div></div>
            <div><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#6b7280]">Progres keseluruhan</p><p className="mt-1 text-lg font-semibold">{progress}% selesai</p><p className="mt-1 text-xs text-[#6b7280]">{(counts.Ditugaskan ?? 0) + (counts.Diproses ?? 0)} tugas tersisa, {counts.Diproses ?? 0} diproses</p></div>
          </section>
        </div>

        <section className="relative grid h-28 grid-cols-5 overflow-hidden rounded-2xl bg-white px-4 py-4 shadow-[0_8px_12px_rgba(16,24,40,.06)] max-md:h-auto max-md:grid-cols-2 max-md:gap-y-5">
          <span aria-hidden="true" className="pointer-events-none absolute left-[11.5%] right-[11.5%] top-[35px] h-px bg-[#e5e7eb] max-md:hidden" />
          {[
            ["Ditugaskan", counts.Ditugaskan ?? 0, "bg-[#f3f4f6]", "/figma-assets/mekanik-status-assigned.svg"],
            ["Diperiksa", counts.Diperiksa ?? 0, "bg-[#dbeafe]", "/figma-assets/mekanik-status-inspected.svg"],
            ["Siap Dikerjakan", counts["Siap Dikerjakan"] ?? 0, "bg-[#fef9c3]", "/figma-assets/mekanik-status-ready.svg"],
            ["Diproses", counts.Diproses ?? 0, "bg-[#ffedd5]", "/figma-assets/mekanik-status-progress.svg"],
            ["Selesai Hari Ini", completedToday, "bg-[#dcfce7]", "/figma-assets/mekanik-status-done.svg"],
          ].map(([label, count, color, icon]) => <div key={String(label)} className="relative flex flex-col items-center gap-1 text-center"><div className={`grid size-10 place-items-center rounded-full ${color}`}><Image alt="" src={String(icon)} width={20} height={20} /></div><p className="text-lg font-bold leading-[18px]">{count}</p><p className="text-xs text-[#6b7280]">{label}</p></div>)}
        </section>

        <div className="grid h-[428px] grid-cols-[888fr_464fr] gap-6 max-xl:h-auto max-xl:grid-cols-1">
          <section className="h-[428px] min-w-0 rounded-2xl bg-white px-6 py-5 shadow-[0_8px_12px_rgba(16,24,40,.06)] max-xl:h-auto">
            <div className="mb-2 flex h-7 items-center justify-between"><h2 className="text-lg font-semibold">Tugas Terbaru</h2><span className="text-xs text-[#0f14f0]">Lihat semua</span></div>
            <div className="overflow-x-auto"><div className="min-w-[760px]">
              <div className="grid h-9 grid-cols-[270fr_150fr_150fr_140fr_110fr] items-center rounded-lg bg-[#f3f4f6] text-[10px] font-medium uppercase tracking-wide text-[#6b7280]"><span className="px-2">Kendaraan</span><span className="px-2">No. Pendaftaran</span><span className="px-2">Status</span><span className="px-2">Progres</span><span className="px-2">Aksi</span></div>
              {jobs.slice(0, 5).map((job) => {
                const percent = job.servis.status_servis === "Selesai" ? 100 : job.servis.status_servis === "Diproses" ? 45 : job.servis.status_servis === "Batal" ? 0 : ["Diperiksa", "Siap Dikerjakan"].includes(job.servis.status_servis) ? 65 : 10;
                return <div key={job.id_data_mekanik} className="grid h-[55.47px] grid-cols-[270fr_150fr_150fr_140fr_110fr] items-center border-b border-[#e5e7eb] text-[10px]">
                  <div className="flex min-w-0 items-center gap-3 px-2"><div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#eef0ff]"><Image alt="" src="/figma-assets/mekanik-vehicle.svg" width={20} height={20} /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{job.servis.kendaraan.tipe_kendaraan}</p><p className="truncate text-[10px] text-[#6b7280]">{job.servis.kendaraan.nomor_plat} - {cleanComplaint(job.servis.keluhan)}</p></div></div>
                  <span className="truncate px-2">{getDisplayServiceId(job.servis.id_servis, job.servis.tanggal_daftar)}</span><span className="px-2"><span className={`inline-flex rounded-full px-2.5 py-1 ${statusStyle[job.servis.status_servis] ?? statusStyle.Ditugaskan}`}>{job.servis.status_servis}</span></span><span className="px-2"><span className="block h-1.5 w-[72px] overflow-hidden rounded-full bg-[#e5e7eb]"><span className="block h-full rounded-full bg-[#0f14f0]" style={{ width: `${percent}%` }} /></span></span><span className="px-2"><button type="button" aria-label={`Lihat tugas ${getDisplayServiceId(job.servis.id_servis, job.servis.tanggal_daftar)}`} className="rounded-md border border-[#0f14f0] px-3 py-1 text-[10px] text-[#0f14f0]">Lihat</button></span>
                </div>;
              })}
              {jobs.length === 0 && <p className="py-10 text-center text-sm text-[#6b7280]">Belum ada tugas yang ditugaskan kepadamu.</p>}
            </div></div>
          </section>

          <section className="h-[428px] rounded-2xl bg-white px-6 py-5 shadow-[0_8px_12px_rgba(16,24,40,.06)] max-xl:h-auto">
            <h2 className="mb-3 h-7 text-lg font-semibold">Akses Cepat</h2>
            <div className="space-y-2">
              {[
                ["Penugasan", "Lihat keluhan pelanggan", "/figma-assets/mekanik-quick-assignment.svg", "bg-[#f3f4f6]"],
                ["Pemeriksaan", "Periksa kendaraan dan input hasil", "/figma-assets/mekanik-quick-inspection.svg", "bg-[#dbeafe]"],
                ["Konfirmasi Servis", "Terima konfirmasi mulai servis", "/figma-assets/mekanik-quick-confirm.svg", "bg-[#fef9c3]"],
                ["Pelaksanaan Servis", "Kerjakan dan perbarui progres", "/figma-assets/mekanik-quick-execution.svg", "bg-[#ffedd5]"],
              ].map(([title, description, icon, tint]) => <div key={title} className="flex h-[64px] items-center gap-3 rounded-[10px] border border-[#e5e7eb] px-2.5"><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tint}`}><Image alt="" src={icon} width={20} height={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{title}</p><p className="truncate text-xs text-[#6b7280]">{description}</p></div><Image alt="" src="/figma-assets/sa-arrow-right.svg" width={16} height={16} /></div>)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
