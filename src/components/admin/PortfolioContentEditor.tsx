"use client";

import useAdminCachedState from "@/hooks/useAdminCachedState";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import useDialogFocus from "@/hooks/useDialogFocus";
import { supabase } from "@/lib/supabase";
import { formatJourneyPeriod } from "@/lib/journey";
import { validateJourneyInput, validateServiceInput } from "@/lib/portfolioContentValidation";
import type { JourneyEntry, JourneyKind, PortfolioService, ServiceAccent, ServiceIcon } from "@/types";

type Item = PortfolioService | JourneyEntry;
type Draft = {
  title: string; summary: string; description: string; bullets: string;
  icon: ServiceIcon; accent: ServiceAccent; display_order: number; published: boolean;
  kind: JourneyKind; organization: string; start_date: string; end_date: string; current: boolean;
  tags: string; logo_url: string; project_id: string; external_url: string;
};
const blankDraft = (order = 0): Draft => ({
  title: "", summary: "", description: "", bullets: "", icon: "code", accent: "blue", display_order: order, published: false,
  kind: "education", organization: "", start_date: "", end_date: "", current: false, tags: "", logo_url: "", project_id: "", external_url: "",
});
const categoryLabels = { education: "Formation", experience: "Expérience", project: "Projet" };
const fieldClass = "mt-2 w-full min-w-0 rounded-xl border border-white/15 bg-[#101010] px-3 py-3 text-sm text-white outline-none focus:border-white/50 disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-sm text-white/75">{label}{children}</label>;
}

async function requestContent(endpoint: string, method: string, values?: unknown, signal?: AbortSignal) {
  const response = await fetch(endpoint, {
    method, credentials: "same-origin", cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    ...(values ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) } : {}),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.message || "Le serveur n'a pas confirmé l'opération. Réessayez.");
  return body;
}

export default function PortfolioContentEditor({ kind }: { kind: "services" | "journey" }) {
  const isService = kind === "services";
  const endpoint = `/api/admin/${kind}`;
  const [items, setItems, hasSnapshot] = useAdminCachedState<Item[]>(`content:${kind}`, []);
  const [loading, setLoading] = useState(() => !hasSnapshot());
  const [readError, setReadError] = useState("");
  const readVersion = useRef(0);
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<"form" | "delete" | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const creationId = useRef<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [formError, setFormError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const uploadedLogo = useRef<{ file: File; url: string } | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [projectError, setProjectError] = useState("");

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    const version = ++readVersion.current;
    try {
      const response = await requestContent(endpoint, "GET", undefined, signal);
      if (signal?.aborted || version !== readVersion.current) return;
      setItems(response.items); setReadError("");
    } catch (error) {
      if (signal?.aborted || version !== readVersion.current) return;
      setReadError(error instanceof Error ? error.message : "Lecture indisponible. La liste déjà chargée est conservée.");
    } finally { if (!signal?.aborted && version === readVersion.current) setLoading(false); }
  }, [endpoint, setItems]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadItems(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadItems]);
  useEffect(() => () => { if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  useEffect(() => {
    if (isService || dialog !== "form" || draft.kind !== "project") return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data, error } = await supabase.from("projects").select("id,title").order("created_at", { ascending: false }).abortSignal(controller.signal);
        if (error) throw error;
        if (!controller.signal.aborted) { setProjects(data ?? []); setProjectError(""); }
      } catch { if (!controller.signal.aborted) setProjectError("Les projets ne sont pas disponibles. Réouvrez ce formulaire pour réessayer."); }
    })();
    return () => controller.abort();
  }, [isService, dialog, draft.kind]);

  const closeDialog = () => { if (!busyRef.current) { setDialog(null); setLogoFile(null); setLogoPreview(""); uploadedLogo.current = null; } };
  const dialogRef = useDialogFocus(dialog !== null, closeDialog);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));

  function openForm(item: Item | null) {
    creationId.current = item ? null : crypto.randomUUID();
    setSelected(item); setFormError(""); setLogoFile(null); uploadedLogo.current = null;
    if (!item) { setDraft(blankDraft(Math.min(9999, items.reduce((max, entry) => Math.max(max, entry.display_order + 1), 0)))); setLogoPreview(""); }
    else if ("bullet_points" in item) setDraft({ ...blankDraft(), ...item, bullets: item.bullet_points.join("\n") });
    else {
      setDraft({ ...blankDraft(), ...item, start_date: item.start_date.slice(0, 7), end_date: item.end_date?.slice(0, 7) ?? "", tags: item.tags.join(", "), logo_url: item.logo_url ?? "", project_id: item.project_id ?? "", external_url: item.external_url ?? "" });
      setLogoPreview(item.logo_url ?? "");
    }
    setDialog("form");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setFormError("");
    try {
      const common = { title: draft.title, description: draft.description, display_order: draft.display_order, published: draft.published };
      const values = isService ? validateServiceInput({ ...common, summary: draft.summary, bullet_points: draft.bullets.split("\n").map((point) => point.trim()).filter(Boolean), icon: draft.icon, accent: draft.accent }) : validateJourneyInput({
        ...common, kind: draft.kind, organization: draft.organization, start_date: draft.start_date, end_date: draft.current ? null : draft.end_date || null, current: draft.current,
        tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean), logo_url: draft.logo_url || null,
        project_id: draft.kind === "project" ? draft.project_id || null : null, external_url: draft.external_url || null,
      });
      if (!isService && logoFile) {
        if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(logoFile.type) || logoFile.size > 2 * 1024 * 1024) throw new Error("Logo : PNG, JPEG, WebP ou SVG, 2 Mio maximum.");
        if (uploadedLogo.current?.file !== logoFile) {
          const path = `journey-${crypto.randomUUID()}-${logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
          const bucket = supabase.storage.from("tech-stack");
          const { error } = await bucket.upload(path, logoFile, { upsert: false, cacheControl: "31536000" });
          if (error) throw new Error("L'import du logo a échoué. Votre formulaire est conservé.");
          uploadedLogo.current = { file: logoFile, url: bucket.getPublicUrl(path).data.publicUrl };
        }
        // Une nouvelle tentative réutilise le logo importé ; aucune suppression après une réponse réseau ambiguë.
        (values as ReturnType<typeof validateJourneyInput>).logo_url = uploadedLogo.current.url;
      }
      const id = selected?.id ?? (creationId.current ??= crypto.randomUUID());
      const response = await requestContent(endpoint, selected ? "PATCH" : "POST", { ...values, id });
      readVersion.current += 1; setLoading(false);
      setItems((previous) => [...previous.filter((item) => item.id !== response.item.id), response.item].sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at)));
      setDialog(null); setLogoFile(null); setLogoPreview(""); uploadedLogo.current = null;
      setNotice(draft.published ? (response.revalidationScheduled ? "Enregistré et publié. L’affichage public est en cours d’actualisation." : response.revalidated === false ? "Enregistré et publié. L’affichage public sera actualisé sous cinq minutes." : "Enregistré et publié. La page publique a été actualisée.") : "Brouillon enregistré. Il reste visible uniquement dans l’administration.");
    } catch (error) { setFormError(error instanceof Error ? error.message : "Impossible d'enregistrer. Votre formulaire est conservé."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function handleDelete() {
    if (!selected || busyRef.current) return;
    busyRef.current = true; setBusy(true); setFormError("");
    try {
      const response = await requestContent(endpoint, "DELETE", { id: selected.id });
      readVersion.current += 1; setLoading(false);
      setItems((previous) => previous.filter((item) => item.id !== selected.id));
      setDialog(null); setNotice(response.revalidationScheduled ? "L’entrée a été supprimée. L’affichage public est en cours d’actualisation." : response.revalidated === false ? "L’entrée a été supprimée. L’affichage public sera actualisé sous cinq minutes." : "L’entrée a été supprimée et la page publique a été actualisée.");
    } catch (error) { setFormError(error instanceof Error ? error.message : "La suppression n'a pas été confirmée."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="min-h-screen px-4 pb-10 pt-28 sm:px-6 lg:ml-[250px] lg:px-8 lg:pt-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h1 className="text-2xl font-bold sm:text-3xl">{isService ? "Services" : "Parcours & qualifications"}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{isService ? "Gérez les cartes, leurs détails et leur publication." : "Renseignez vos formations, expériences et projets. Seules les étapes publiées apparaissent sur le site."}</p></div>
          <button type="button" onClick={() => openForm(null)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-black"><Plus size={17} />{isService ? "Ajouter un service" : "Ajouter une étape"}</button>
        </div>
        {notice && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200"><Check size={18} className="shrink-0" />{notice}</p>}
        {readError && <p role="alert" className="mb-5 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm text-amber-200">{readError} <button type="button" onClick={() => void loadItems()} className="min-h-11 underline">Réessayer</button></p>}
        {loading ? <p className="text-sm text-white/65">Chargement…</p> : items.length ? <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => <article key={item.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className={`rounded-md px-2 py-1 font-mono text-[11px] ${item.published ? "bg-emerald-300/10 text-emerald-200" : "bg-white/10 text-white/70"}`}>{item.published ? "Publié" : "Brouillon"}</span><span className="font-mono text-xs text-white/60">Ordre {item.display_order}{"kind" in item && ` · ${categoryLabels[item.kind]}`}</span></div>
            <h2 className="break-words text-xl font-semibold">{item.title}</h2>
            {"summary" in item ? <p className="mt-2 text-sm leading-relaxed text-white/65">{item.summary}</p> : <><p className="mt-2 text-sm text-emerald-200">{item.organization}</p><p className="mt-2 font-mono text-xs text-white/65">{formatJourneyPeriod(item)}</p></>}
            <div className="mt-5 flex flex-wrap gap-3"><button type="button" aria-label={`Modifier : ${item.title}`} onClick={() => openForm(item)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><Pencil size={15} />Modifier</button><button type="button" aria-label={`Supprimer : ${item.title}`} onClick={() => { setSelected(item); setFormError(""); setDialog("delete"); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300/20 px-3 text-sm text-red-200"><Trash2 size={15} />Supprimer</button></div>
          </article>)}
        </div> : !readError && <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm leading-relaxed text-white/65">{isService ? "Aucun service. Ajoutez votre première prestation." : "Votre parcours est vide. Ajoutez vos véritables formations, expériences et projets, puis activez leur publication."}</div>}
      </main>
      {dialog && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="content-editor-title" tabIndex={-1} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#151515] p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4"><h2 id="content-editor-title" className="text-xl font-semibold">{dialog === "delete" ? "Supprimer cette entrée ?" : `${selected ? "Modifier" : "Ajouter"} ${isService ? "un service" : "une étape"}`}</h2><button type="button" disabled={busy} onClick={closeDialog} aria-label="Fermer le formulaire" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 disabled:opacity-40"><X size={18} /></button></div>
          {formError && <p role="alert" className="mb-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm text-red-200">{formError}</p>}
          {dialog === "delete" ? <><p className="text-sm leading-relaxed text-white/75">« {selected?.title} » sera retiré de l’administration et du site. Cette suppression ne peut pas être annulée.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={closeDialog} className="min-h-11 rounded-xl border border-white/15 px-4">Annuler</button><button type="button" disabled={busy} onClick={() => void handleDelete()} className="min-h-11 rounded-xl bg-red-400 px-4 text-black disabled:opacity-50">{busy ? "Suppression…" : "Supprimer"}</button></div></> : <form onSubmit={handleSave}>
            <fieldset disabled={busy} className="grid min-w-0 gap-5">
              {!isService && <Field label="Catégorie"><select className={fieldClass} value={draft.kind} onChange={(event) => update("kind", event.target.value as JourneyKind)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}
              <Field label={isService ? "Titre du service" : "Diplôme, poste ou projet"}><input required minLength={2} maxLength={isService ? 100 : 140} className={fieldClass} value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field>
              {isService ? <>
                <Field label="Résumé de la carte"><textarea required minLength={3} maxLength={260} rows={2} className={fieldClass} value={draft.summary} onChange={(event) => update("summary", event.target.value)} /></Field>
                <div className="grid gap-5 sm:grid-cols-2"><Field label="Icône"><select className={fieldClass} value={draft.icon} onChange={(event) => update("icon", event.target.value as ServiceIcon)}>{Object.entries({ code: "Code", database: "Base de données", layers: "Full Stack", design: "Design", shield: "Sécurité", cloud: "Cloud" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Couleur"><select className={fieldClass} value={draft.accent} onChange={(event) => update("accent", event.target.value as ServiceAccent)}><option value="blue">Bleu</option><option value="emerald">Émeraude</option><option value="rose">Rose</option></select></Field></div>
              </> : <>
                <Field label="Établissement, entreprise ou contexte"><input required minLength={2} maxLength={140} className={fieldClass} value={draft.organization} onChange={(event) => update("organization", event.target.value)} /></Field>
                <div className="grid gap-5 sm:grid-cols-2"><Field label="Début"><input required type="month" min="1900-01" max="2199-12" className={fieldClass} value={draft.start_date} onChange={(event) => update("start_date", event.target.value)} /></Field><Field label="Fin (facultative)"><input type="month" min={draft.start_date || "1900-01"} max="2199-12" disabled={draft.current || busy} className={fieldClass} value={draft.end_date} onChange={(event) => update("end_date", event.target.value)} /></Field></div>
                <label className="flex min-h-11 items-center gap-3 text-sm text-white/80"><input type="checkbox" checked={draft.current} onChange={(event) => setDraft((previous) => ({ ...previous, current: event.target.checked, end_date: event.target.checked ? "" : previous.end_date }))} className="h-4 w-4 accent-emerald-300" />En cours actuellement</label>
                <Field label="Compétences (séparées par des virgules)"><input className={fieldClass} maxLength={784} value={draft.tags} onChange={(event) => update("tags", event.target.value)} placeholder="React, TypeScript, PostgreSQL" /></Field>
                <div><p className="text-sm text-white/75">Logo de l’établissement ou de l’entreprise (facultatif)</p><div className="mt-3 flex flex-wrap items-center gap-4">{logoPreview && <ResponsiveImage src={logoPreview} alt="Aperçu du logo" width={56} height={56} sizes="56px" className="h-14 w-14 rounded-lg bg-white p-1 object-contain" />}<label className="flex min-h-11 cursor-pointer items-center rounded-xl border border-white/15 px-3 text-sm">Importer un logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); uploadedLogo.current = null; } }} /></label>{(logoPreview || draft.logo_url) && <button type="button" className="min-h-11 text-sm text-red-200" onClick={() => { setLogoFile(null); setLogoPreview(""); uploadedLogo.current = null; update("logo_url", ""); }}>Retirer le logo</button>}</div><p className="mt-2 text-xs text-white/60">PNG, JPEG, WebP ou SVG · 2 Mio maximum</p></div>
                {draft.kind === "project" && <Field label="Projet du portfolio à relier (facultatif)"><select className={fieldClass} value={draft.project_id} onChange={(event) => update("project_id", event.target.value)}><option value="">Aucun projet lié</option>{draft.project_id && !projects.some((project) => project.id === draft.project_id) && <option value={draft.project_id}>Projet lié actuel</option>}{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>{projectError && <span className="mt-2 block text-xs text-amber-200">{projectError}</span>}</Field>}
                <Field label="Lien externe (HTTPS, facultatif)"><input type="url" maxLength={1000} className={fieldClass} value={draft.external_url} onChange={(event) => update("external_url", event.target.value)} placeholder="https://…" /></Field>
              </>}
              <Field label={isService ? "Description dans la fenêtre de détails" : "Description (facultative)"}><textarea required={isService} minLength={isService ? 3 : undefined} maxLength={2000} rows={4} className={fieldClass} value={draft.description} onChange={(event) => update("description", event.target.value)} /></Field>
              {isService && <Field label="Prestations (une par ligne, 12 maximum)"><textarea required maxLength={2903} rows={5} className={fieldClass} value={draft.bullets} onChange={(event) => update("bullets", event.target.value)} /></Field>}
              <div className="grid items-end gap-4 sm:grid-cols-2"><Field label="Ordre d’affichage (le plus petit en premier)"><input required type="number" min={0} max={9999} step={1} className={fieldClass} value={draft.display_order} onChange={(event) => update("display_order", Number(event.target.value))} /></Field><label className="flex min-h-11 items-center gap-3 pb-2 text-sm text-white/80"><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-emerald-300" />Publier sur le site</label></div>
            </fieldset>
            <div className="mt-7 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={closeDialog} className="min-h-11 rounded-xl border border-white/15 px-4 disabled:opacity-50">Annuler</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-white px-5 text-black disabled:opacity-50">{busy ? "Enregistrement…" : "Enregistrer"}</button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}
