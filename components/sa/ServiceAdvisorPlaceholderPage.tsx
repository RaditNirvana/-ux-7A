import type { ReactNode } from "react";

type ServiceAdvisorPlaceholderPageProps = {
  description: string;
  title: string;
  icon?: ReactNode;
};

export default function ServiceAdvisorPlaceholderPage({
  description,
  title,
  icon,
}: ServiceAdvisorPlaceholderPageProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        {icon ? <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-[#0b218e]">{icon}</div> : null}
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">AREA SERVICE ADVISOR</p>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
    </section>
  );
}
