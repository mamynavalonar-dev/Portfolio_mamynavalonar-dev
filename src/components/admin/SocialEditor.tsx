"use client";
import useAdminCachedState from "@/hooks/useAdminCachedState";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import useDialogFocus from "@/hooks/useDialogFocus";
import { DEFAULT_SOCIAL_CONTENT, SOCIAL_PLATFORMS } from "@/lib/socialDefaults";
import { validateSocialLink, validateSocialSettings, type SocialLinkInput } from "@/lib/socialValidation";
import type { SocialLink, SocialPlatform, SocialSettings } from "@/types";
const fieldClass = "mt-2 w-full min-w-0 rounded-xl border border-white/15 bg-[#101010] px-3 py-3 text-sm outline-none focus:border-white/50 disabled:opacity-50";
const blank = (order = 0): SocialLinkInput => ({ platform: "linkedin", title: "LinkedIn", display_name: "", url: "", featured: false, published: false, display_order: order });
async function request(path: string, method = "GET", values?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/${path}`, { method, credentials: "same-origin", cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000), ...(values ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) } : {}) });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.message || "L’opération n’a pas été confirmée. Réessayez.");
  return body;
}
export default function SocialEditor() {
  const [savedSettings, setSavedSettings, hasSettings] = useAdminCachedState<SocialSettings>("social:settings", DEFAULT_SOCIAL_CONTENT.settings);
  const [settings, setSettings] = useState<SocialSettings>(() => savedSettings);
  const [links, setLinks, hasLinks] = useAdminCachedState<SocialLink[]>("social:links", []);
  const [loading, setLoading] = useState(() => !hasSettings() || !hasLinks());
  const [settingsLoaded, setSettingsLoaded] = useState(() => hasSettings());
  const [readError, setReadError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const settingsBusyRef = useRef(false);
  const settingsDirtyRef = useRef(false);
  const readVersion = useRef(0);
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<SocialLink | null>(null);
  const creationId = useRef<string | null>(null);
  const [draft, setDraft] = useState<SocialLinkInput>(() => blank());
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [formError, setFormError] = useState("");
  const close = () => { if (!busyRef.current) setMode(null); };
  const dialogRef = useDialogFocus(mode !== null, close);

  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++readVersion.current;
    setLoading(!hasSettings() || !hasLinks());
    try {
      const [settingsResult, linksResult] = await Promise.allSettled([request("social-settings", "GET", undefined, signal), request("social-links", "GET", undefined, signal)]);
      if (signal?.aborted || version !== readVersion.current) return;
      if (settingsResult.status === "fulfilled") {
        setSavedSettings(settingsResult.value.settings);
        if (!settingsDirtyRef.current) setSettings(settingsResult.value.settings);
        setSettingsLoaded(true);
      }
      if (linksResult.status === "fulfilled") setLinks(linksResult.value.items);
      const failures = [settingsResult, linksResult].filter((result) => result.status === "rejected");
      setReadError(failures.map((result) => result.reason instanceof Error ? result.reason.message : "Lecture indisponible. Les dernières valeurs sont conservées.").join(" "));
    } catch (error) { if (!signal?.aborted && version === readVersion.current) setReadError(error instanceof Error ? error.message : "Lecture indisponible. Les dernières valeurs sont conservées."); }
    finally { if (!signal?.aborted && version === readVersion.current) setLoading(false); }
  }, [hasSettings, hasLinks, setSavedSettings, setLinks]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); if (settingsBusyRef.current || !settingsLoaded) return;
    settingsBusyRef.current = true; setSettingsSaving(true); setSettingsError("");
    try {
      const values = validateSocialSettings(settings);
      const result = await request("social-settings", "PATCH", values);
      readVersion.current += 1; setLoading(false); settingsDirtyRef.current = false; setSettings(result.settings); setSavedSettings(result.settings);
      setNotice(result.revalidationScheduled ? "Présentation enregistrée. Le site public est en cours d’actualisation." : result.revalidated === false ? "Présentation enregistrée. La page publique sera actualisée sous cinq minutes." : "Présentation enregistrée et page publique actualisée.");
    } catch (error) { setSettingsError(error instanceof Error ? error.message : "Enregistrement indisponible. Votre texte est conservé."); }
    finally { settingsBusyRef.current = false; setSettingsSaving(false); }
  }
  function open(link: SocialLink | null) {
    creationId.current = link ? null : crypto.randomUUID();
    setSelected(link); setDraft(link ? { platform: link.platform, title: link.title, display_name: link.display_name, url: link.url, featured: link.featured, published: link.published, display_order: link.display_order } : blank(Math.min(9999, links.reduce((max, item) => Math.max(max, item.display_order + 1), 0))));
    setFormError(""); setMode("edit");
  }
  async function saveLink(event: FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setFormError("");
    try {
      const values = validateSocialLink(draft);
      const id = selected?.id ?? (creationId.current ??= crypto.randomUUID());
      const result = await request("social-links", selected ? "PATCH" : "POST", { ...values, id });
      readVersion.current += 1; setLoading(false);
      setLinks((previous) => [...previous.filter((link) => link.id !== result.item.id), result.item].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id)));
      setMode(null); setNotice(values.published ? (result.revalidationScheduled ? "Lien enregistré. Le site public est en cours d’actualisation." : result.revalidated === false ? "Lien enregistré. L’affichage public sera actualisé sous cinq minutes." : "Lien enregistré et publié.") : "Brouillon enregistré : le lien reste masqué sur le site.");
    } catch (error) { setFormError(error instanceof Error ? error.message : "Le formulaire est conservé. Réessayez."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function removeLink() {
    if (!selected || busyRef.current) return;
    busyRef.current = true; setBusy(true); setFormError("");
    try {
      const result = await request("social-links", "DELETE", { id: selected.id });
      readVersion.current += 1; setLoading(false); setLinks((previous) => previous.filter((link) => link.id !== selected.id)); setMode(null);
      setNotice(result.revalidationScheduled ? "Lien supprimé. Le site public est en cours d’actualisation." : result.revalidated === false ? "Lien supprimé. L’affichage public sera actualisé sous cinq minutes." : "Lien supprimé et page publique actualisée.");
    } catch (error) { setFormError(error instanceof Error ? error.message : "La suppression n’a pas été confirmée."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const update = <K extends keyof SocialLinkInput>(key: K, value: SocialLinkInput[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  return <div className="min-h-screen bg-[#0a0a0a] text-white">
    <main className="min-h-screen px-4 pb-10 pt-28 sm:px-6 lg:ml-[250px] lg:px-8 lg:pt-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold sm:text-3xl">Réseaux sociaux</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">Gérez l’introduction, les liens, leurs libellés et leur ordre dans la section Contact.</p></div><button type="button" disabled={loading || settingsSaving} onClick={() => open(null)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-black disabled:opacity-50"><Plus size={17} />Ajouter un réseau</button></div>
      {notice && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-200"><Check size={18} className="shrink-0" />{notice}</p>}
      {readError && <p role="alert" className="mb-5 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm text-amber-200">{readError} <button type="button" onClick={() => void load()} className="min-h-11 underline">Réessayer</button></p>}
      <form onSubmit={saveSettings} className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold">Présentation des réseaux</h2>
        {settingsError && <p role="alert" className="mb-4 text-sm text-red-200">{settingsError}</p>}
        <fieldset disabled={loading || settingsSaving || !settingsLoaded} className="grid gap-5"><label className="text-sm text-white/75">Titre du bloc<input required minLength={2} maxLength={100} className={fieldClass} value={settings.heading} onChange={(event) => { settingsDirtyRef.current = true; setSettings((previous) => ({ ...previous, heading: event.target.value })); }} /></label><label className="text-sm text-white/75">Introduction (facultative)<textarea maxLength={600} rows={3} className={fieldClass} value={settings.introduction} onChange={(event) => { settingsDirtyRef.current = true; setSettings((previous) => ({ ...previous, introduction: event.target.value })); }} placeholder="Une phrase pour inviter les visiteurs à vous retrouver sur vos réseaux." /></label></fieldset>
        <button type="submit" disabled={loading || settingsSaving || !settingsLoaded} className="mt-5 min-h-11 rounded-xl bg-white px-4 text-sm text-black disabled:opacity-50">{settingsSaving ? "Enregistrement…" : "Enregistrer la présentation"}</button>
      </form>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Mes liens</h2><button type="button" disabled={settingsSaving} onClick={() => void load()} className="flex min-h-11 items-center gap-2 text-sm text-white/70"><RefreshCw size={15} />Actualiser</button></div>
      {loading ? <p className="text-sm text-white/65">Chargement…</p> : links.length ? <div className="grid gap-4 xl:grid-cols-2">{links.map((link) => <article key={link.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className={`rounded-md px-2 py-1 font-mono text-[11px] ${link.published ? "bg-emerald-300/10 text-emerald-200" : "bg-white/10 text-white/70"}`}>{link.published ? "Publié" : "Brouillon"}</span><span className="text-xs text-white/65">{SOCIAL_PLATFORMS[link.platform]} · ordre {link.display_order}</span></div>
        <h3 className="break-words text-lg font-semibold">{link.title}</h3>{link.display_name && <p className="mt-1 break-words text-sm text-white/65">{link.display_name}</p>}<p className="mt-3 break-all font-mono text-xs leading-relaxed text-white/60">{link.url}</p>{link.featured && <p className="mt-2 text-xs text-emerald-200">Carte en pleine largeur</p>}
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" aria-label={`Modifier : ${link.title}`} onClick={() => open(link)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><Pencil size={15} />Modifier</button><button type="button" aria-label={`Supprimer : ${link.title}`} onClick={() => { setSelected(link); setFormError(""); setMode("delete"); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-red-300/20 px-3 text-sm text-red-200"><Trash2 size={15} />Supprimer</button></div>
      </article>)}</div> : !readError && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/65">Aucun lien. Ajoutez un réseau, puis activez sa publication.</p>}
    </main>
    {mode && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={(event) => { if (event.target === event.currentTarget) close(); }}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="social-dialog-title" tabIndex={-1} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#151515] p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between gap-4"><h2 id="social-dialog-title" className="text-xl font-semibold">{mode === "delete" ? "Supprimer ce lien ?" : selected ? "Modifier le réseau" : "Ajouter un réseau"}</h2><button type="button" disabled={busy} onClick={close} aria-label="Fermer le formulaire" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 disabled:opacity-40"><X size={18} /></button></div>
      {formError && <p role="alert" className="mb-5 rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm text-red-200">{formError}</p>}
      {mode === "delete" ? <><p className="text-sm leading-relaxed text-white/75">« {selected?.title} » sera retiré du site et de cette liste. Votre compte sur ce réseau reste inchangé.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-white/15 px-4">Annuler</button><button type="button" disabled={busy} onClick={() => void removeLink()} className="min-h-11 rounded-xl bg-red-400 px-4 text-black disabled:opacity-50">{busy ? "Suppression…" : "Supprimer"}</button></div></> : <form onSubmit={saveLink}>
        <fieldset disabled={busy} className="grid min-w-0 gap-5">
          <label className="text-sm text-white/75">Réseau / icône<select className={fieldClass} value={draft.platform} onChange={(event) => { const platform = event.target.value as SocialPlatform; setDraft((previous) => ({ ...previous, platform, title: previous.title === SOCIAL_PLATFORMS[previous.platform] ? SOCIAL_PLATFORMS[platform] : previous.title })); }}>{Object.entries(SOCIAL_PLATFORMS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-2 block text-xs leading-relaxed text-white/60">La plateforme choisie définit l’icône. Le nom affiché et le lien restent personnalisables.</span></label>
          <label className="text-sm text-white/75">Nom affiché<input required minLength={2} maxLength={80} className={fieldClass} value={draft.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label className="text-sm text-white/75">Sous-titre / identifiant (facultatif)<input maxLength={120} className={fieldClass} value={draft.display_name} onChange={(event) => update("display_name", event.target.value)} placeholder="Votre nom ou @votre_identifiant" /></label>
          <label className="text-sm text-white/75">{draft.platform === "email" ? "Lien mailto:" : "Lien HTTPS"}<input required type="url" maxLength={1000} className={fieldClass} value={draft.url} onChange={(event) => update("url", event.target.value)} placeholder={draft.platform === "email" ? "mailto:vous@example.com" : "https://…"} /></label>
          <label className="text-sm text-white/75">Ordre d’affichage<input required type="number" min={0} max={9999} step={1} className={fieldClass} value={draft.display_order} onChange={(event) => update("display_order", Number(event.target.value))} /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-white/80"><input type="checkbox" checked={draft.featured} onChange={(event) => update("featured", event.target.checked)} className="h-4 w-4 accent-emerald-300" />Carte en pleine largeur</label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-white/80"><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-emerald-300" />Publier sur le site</label>
        </fieldset><div className="mt-7 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-white/15 px-4">Annuler</button><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-white px-5 text-black disabled:opacity-50">{busy ? "Enregistrement…" : "Enregistrer"}</button></div>
      </form>}
    </div></div>}
  </div>;
}
