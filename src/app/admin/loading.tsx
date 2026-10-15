export default function AdminLoading() {
  return <main aria-busy="true" className="min-h-screen bg-[#0a0a0a] px-5 pb-10 pt-28 text-white lg:ml-[250px] lg:px-8 lg:pt-8">
    <p role="status" className="text-sm text-white/65">Ouverture de la rubrique…</p>
    <div aria-hidden="true" className="mt-6 space-y-4"><div className="h-9 w-52 rounded-xl bg-white/10" /><div className="h-36 rounded-2xl border border-white/10 bg-white/[0.03]" /></div>
  </main>;
}
