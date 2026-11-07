import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { TransientNotice } from "@/components/notifications/TransientNotice";

export const saPanel =
  "rounded-[16px] bg-[var(--sa-panel)] p-6";

export const saPrimaryButton =
  "inline-flex min-h-[46px] items-center justify-center rounded-lg bg-[#493cdf] px-[22px] py-2 text-[15px] font-semibold text-white transition hover:bg-[#392bc7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#493cdf] disabled:cursor-not-allowed disabled:opacity-50";

export const saSecondaryButton =
  "inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#b9b6d0] bg-[var(--sa-panel)] px-[22px] py-2 text-[15px] font-semibold text-[#493cdf] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#493cdf] disabled:cursor-not-allowed disabled:opacity-50";

export const saInput =
  "min-h-[46px] w-full rounded-lg border border-[#b9b6d0] bg-white px-[14px] py-2 text-[14px] text-[#090912] outline-none focus:border-[#493cdf] focus:ring-2 focus:ring-[#493cdf]/15 disabled:bg-slate-100";

export function ServiceAdvisorHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-6 flex min-h-[158px] items-center justify-between overflow-hidden rounded-[16px] bg-gradient-to-r from-[#493cdf] via-[#7467cf] to-[#9d9ac2] pl-10 pr-[90px] py-[18px] text-white">
      <div className="max-w-[900px]">
        <h1 className="text-[30px] font-bold leading-[1.35]">
          {title}
        </h1>
        <p className="mt-[10px] text-[16px] leading-6 text-white/90">
          {subtitle}
        </p>
      </div>
      <Image
        alt=""
        aria-hidden="true"
        className="hidden size-[122px] object-cover md:block"
        height={500}
        src="/figma-assets/tools-3d.png"
        width={500}
      />
    </header>
  );
}

export function ServiceAdvisorTabs({
  active,
  links,
}: {
  active: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav
      aria-label="Navigasi halaman service advisor"
      className="mb-[17.536px] flex gap-[10.522px]"
    >
      {links.map((link) => (
        <a
          aria-current={active === link.href ? "page" : undefined}
          className={`inline-flex h-[40.333px] items-center justify-center rounded-[7.014px] border px-[19.289px] py-0 text-[13.152px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#493cdf] ${
            active === link.href
              ? "border-[#493cdf] bg-[#493cdf] text-white hover:bg-[#392bc7]"
              : "border-[#b9b6d0] bg-[#efedf9] text-[#493cdf] hover:bg-white"
          }`}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

export function ServiceAdvisorPanel({
  children,
  className = "",
  title,
  subtitle,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className={`${saPanel} ${className}`}>
      {title ? (
        <div className="sa-verification-panel-heading mb-3">
          <h2 className="text-[21px] font-bold leading-[1.5] text-[#090912]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-[3px] text-[13px] leading-[1.5] text-[#555569]">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ServiceAdvisorStatus({
  value,
  variant = "service-advisor",
}: {
  value: string;
  variant?: "service-advisor" | "mekanik";
}) {
  if (variant === "mekanik") {
    const colors: Record<string, string> = {
      Ditugaskan: "bg-[#f3f4f6] text-[#4b5563]",
      Diperiksa: "bg-[#dbeafe] text-[#2563eb]",
      "Siap Dikerjakan": "bg-[#fef9c3] text-[#ca8a04]",
      Diproses: "bg-[#ffedd5] text-[#ea580c]",
      Selesai: "bg-[#dcfce7] text-[#15803d]",
      Batal: "bg-[#fee2e2] text-[#b91c1c]",
    };

    return (
      <span
        className={`inline-flex rounded-full px-3 pb-[5px] pt-1 text-xs font-medium leading-4 ${colors[value] ?? colors.Ditugaskan}`}
      >
        {value}
      </span>
    );
  }

  const normalized = value.toLocaleLowerCase("id-ID");
  const className =
    normalized.includes("selesai") ||
    normalized.includes("tersedia") ||
    normalized.includes("diterima") ||
    normalized.includes("terverifikasi")
      ? "bg-[#e3f1e9] text-[#236441]"
      : normalized.includes("ditolak") ||
          normalized.includes("batal") ||
          normalized.includes("habis") ||
          normalized.includes("tidak aktif")
        ? "bg-[#fbe6e8] text-[#a82c43]"
        : normalized.includes("menunggu") ||
            normalized.includes("menipis") ||
            normalized.includes("draf")
          ? "bg-[#f8efd8] text-[#795617]"
          : "bg-[#e2e0fb] text-[#493cdf]";

  return (
    <span
      className={`inline-flex rounded-[5px] px-[9px] py-1 text-[11px] font-bold ${className}`}
    >
      {value}
    </span>
  );
}

export function ServiceAdvisorNotice({
  children,
  tone = "success",
  onDismiss,
}: {
  children: ReactNode;
  tone?: "success" | "info" | "error";
  onDismiss?: () => void;
}) {
  const colors = {
    success: "border-[#cce8d8] bg-[#e1f3e8] text-[#216b45]",
    info: "border-[#d9d5fa] bg-[#e5e2fb] text-[#493cdf]",
    error: "border-[#f2c9ce] bg-[#fff0f1] text-[#a82c43]",
  };

  return (
    <TransientNotice
      autoDismiss={tone !== "info"}
      className={`rounded-lg border px-3 py-2.5 text-xs leading-5 ${colors[tone]}`}
      onDismiss={onDismiss}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </TransientNotice>
  );
}

export function ServiceAdvisorModal({
  children,
  className = "",
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  title: string;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#222044]/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="sa-modal-title"
        aria-modal="true"
        className={`my-auto w-full max-w-[560px] rounded-[16px] bg-[var(--sa-panel)] p-5 shadow-[0_16px_48px_rgba(15,13,45,0.22)] ${className}`}
        ref={dialogRef}
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            className="text-xl font-bold leading-7 text-[#171528]"
            id="sa-modal-title"
          >
            {title}
          </h2>
          <button
            aria-label="Tutup dialog"
            className="rounded px-2 text-lg leading-7 text-[#68667a] hover:bg-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ServiceAdvisorEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-10 text-center text-sm text-[#77758a]">
      {children}
    </div>
  );
}

export function formatServiceAdvisorDate(value: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatServiceAdvisorTime(value: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatServiceAdvisorCode(
  value: string,
  prefix: string,
): string {
  const match = value.match(new RegExp(`^${prefix}(\\d{3})$`));
  return match ? `${prefix}-${match[1]}` : value;
}
