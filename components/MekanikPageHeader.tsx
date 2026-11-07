import Image from "next/image";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export default function MekanikPageHeader({
  title,
  name,
  availability,
}: {
  title: string;
  name: string;
  availability: string;
}) {
  const available = availability === "Tersedia";

  return (
    <header className="h-[72px] border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-8 max-md:px-4">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="size-10 shrink-0" />
          <div className="h-[44.39px]">
            <h1 className="text-[22px] font-semibold leading-[26.4px]">{title}</h1>
            <p className="text-xs capitalize leading-[18px] text-[#6b7280]">
              {formatDate(new Date())}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div
            className={`flex h-8 items-center gap-2 rounded-full px-3.5 text-xs font-medium ${available ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#ffedd5] text-[#ea580c]"}`}
          >
            <span
              className={`size-2 rounded-[4px] ${available ? "bg-[#16a34a]" : "bg-[#ea580c]"}`}
            />
            {availability}
          </div>

          <button
            aria-label="Notifikasi"
            className="relative grid size-10 place-items-center rounded-[20px] border border-[#e5e7eb] bg-white"
            type="button"
          >
            <Image alt="" height={20} src="/figma-assets/mekanik-bell.svg" width={20} />
            <span
              aria-hidden="true"
              className="absolute right-[10px] top-[8px] size-2 rounded-[4px] border-2 border-white bg-[#dc2626]"
            />
          </button>

          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#8f9bff] to-[#0f14f0] text-sm font-semibold text-white">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="max-sm:hidden">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-[#6b7280]">Mekanik</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
