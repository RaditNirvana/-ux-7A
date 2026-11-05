import Link from "next/link";

export default function CustomerEmptyState({
  eyebrow = "AREA CUSTOMER",
  title,
  message,
  actionHref = "/customer/dashboard",
  actionLabel = "Kembali ke Dashboard",
}: {
  eyebrow?: string;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="customer-page-content">
      <p className="customer-eyebrow">{eyebrow}</p>
      <h1 className="customer-page-title">{title}</h1>
      <section className="customer-empty-panel">
        <div aria-hidden="true" className="customer-empty-mark">
          —
        </div>
        <h2>Belum ada data</h2>
        <p>{message}</p>
        <Link className="customer-primary-button" href={actionHref}>
          {actionLabel}
        </Link>
      </section>
    </div>
  );
}
