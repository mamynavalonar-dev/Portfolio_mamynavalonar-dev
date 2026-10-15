"use client";

import useAdminCachedState from "@/hooks/useAdminCachedState";

import { useCallback, useEffect, useRef, useState } from "react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Pencil, X, Upload } from "lucide-react";
import Swal from "sweetalert2";
import { saveAdminImageRecord } from "@/lib/adminImageSave";
import { revalidatePortfolio } from "@/lib/revalidatePortfolio";
import { TechStack } from "@/types";
import useDialogFocus from "@/hooks/useDialogFocus";
import { selectHeroTechnologies } from "@/lib/journey";

export default function TechStackPage() {
  const [techStacks, setTechStacks, hasSnapshot] = useAdminCachedState<TechStack[]>("tech", []);
  const [loading, setLoading] = useState(() => !hasSnapshot());

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [heroVisible, setHeroVisible] = useState(true);
  const [heroOrder, setHeroOrder] = useState(0);

  const [saving, setSaving] = useState(false);
  const [storedUrl, setStoredUrl] = useState("");
  const [readError, setReadError] = useState("");
  const readRequest = useRef(0);
  const dialogRef = useDialogFocus(open, () => { if (!saving) setOpen(false); });

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const fetchTechStacks = useCallback(async () => {
    const requestId = ++readRequest.current;
    try {
      const { data, error } = await supabase.from("tech_stack")
        .select("*").order("created_at", { ascending: true });
      if (error) throw error;
      if (requestId !== readRequest.current) return;
      setTechStacks([...(data || [])].sort((a, b) => (a.hero_order ?? 0) - (b.hero_order ?? 0) || a.created_at.localeCompare(b.created_at)));
      setReadError("");
    } catch {
      if (requestId === readRequest.current) setReadError("Lecture indisponible. Les données déjà chargées sont conservées.");
    } finally {
      if (requestId === readRequest.current) setLoading(false);
    }
  }, [setTechStacks]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchTechStacks(), 0);

    const channel = supabase
      .channel("techstack-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tech_stack",
        },
        () => {
          fetchTechStacks();
        }
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      readRequest.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [fetchTechStacks]);



  const resetForm = () => {
    setName("");
    setLogo(null);
    setPreview("");
    setStoredUrl("");
    setEditId(null);
    setHeroVisible(true);
    setHeroOrder(0);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setLogo(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await saveAdminImageRecord({
        table: "tech_stack", bucket: "tech-stack", imageField: "logo_url",
        labelField: "name", label: name, id: editId,
        file: logo, storedUrl,
        heroVisible, heroOrder,
        onConfirmed: (record) => {
          const confirmed = record as unknown as TechStack;
          readRequest.current += 1;
          setLoading(false);
          setTechStacks((previous) => [...previous.filter((item) => item.id !== confirmed.id), confirmed].sort((a, b) => (a.hero_order ?? 0) - (b.hero_order ?? 0) || a.created_at.localeCompare(b.created_at)));
        },
      });
      void revalidatePortfolio();
      setOpen(false);
      resetForm();
      void fetchTechStacks();
    } catch (error) {
      await Swal.fire({
        title: "Échec", text: error instanceof Error ? error.message : "Impossible d'enregistrer.",
        icon: "error", background: "#111", color: "#fff",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Supprimer cette technologie ?",
      text: "Une donnée supprimée ne peut pas être récupérée.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      background: "#111",
      color: "#fff",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#27272a",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    let error: unknown;
    try {
      const result = await supabase.from("tech_stack").delete().eq("id", id).select("id").single();
      error = result.error || (!result.data ? new Error("Élément introuvable") : null);
    } catch (caught) { error = caught; }

    if (!error) {
      readRequest.current += 1;
      void revalidatePortfolio();
      setTechStacks((prev) =>
        prev.filter((item) => item.id !== id)
      );

      Swal.fire({
        title: "Supprimé !",
        text: "La technologie a bien été supprimée.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#111",
        color: "#fff",
      });
    } else {
      Swal.fire({
        title: "Échec",
        text: "Impossible de supprimer cette technologie.",
        icon: "error",
        background: "#111",
        color: "#fff",
      });
    }
  };

  const handleEdit = (item: TechStack) => {
    setEditId(item.id);
    setName(item.name);
    setPreview(item.logo_url);
    setStoredUrl(item.logo_url);
    setLogo(null);
    setHeroVisible(item.hero_visible !== false);
    setHeroOrder(item.hero_order ?? 0);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* MAIN */}
      <main className="ml-0 lg:ml-[250px] min-h-screen">
        <div className="px-4 sm:px-6 md:px-8 pt-28 lg:pt-8 pb-8">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Technologies
              </h1>

              <p className="text-sm text-white/40 mt-1">
                Gérez les logos et leur défilement sur l’accueil · {selectHeroTechnologies(techStacks).length} affichées
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black hover:scale-[1.02] transition"
            >
              <Plus size={16} />
              Ajouter une technologie
            </button>
          </div>

          {/* GRID */}
          {readError && <p role="alert" className="mb-4 text-sm text-amber-200">{readError} <button type="button" className="underline" onClick={() => void fetchTechStacks()}>Réessayer</button></p>}
          {loading ? (
            <div className="text-white/40 text-sm">
              Chargement...
            </div>
          ) : techStacks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] h-[220px] flex items-center justify-center text-white/35 text-sm">
              Aucune technologie
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {techStacks.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 hover:border-white/20 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {item.logo_url ? (
                        <ResponsiveImage
                          sizes="64px"
                          src={item.logo_url}
                          alt={`Logo de ${item.name}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/[0.03]" />
                      )}
                    </div>

                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleEdit(item)}
                        aria-label={`Modifier ${item.name}`}
                        className="w-9 h-9 rounded-xl border border-white/10 hover:bg-white/10 flex items-center justify-center transition"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Supprimer ${item.name}`}
                        className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center justify-center hover:bg-red-500/20 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h2 className="text-[14px] sm:text-[15px] font-medium break-words leading-relaxed">
                    {item.name}
                  </h2>
                  <p className="mt-2 text-xs text-white/65">{item.hero_visible === false ? "Masquée sur l’accueil" : `Bandeau de l’accueil · ordre ${item.hero_order ?? 0}`}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="tech-dialog-title" tabIndex={-1} className="w-full max-w-md rounded-3xl bg-[#111] border border-white/10 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
              <h2 id="tech-dialog-title" className="text-lg sm:text-xl font-semibold">
                {editId ? "Modifier la technologie" : "Ajouter une technologie"}
              </h2>

              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                type="button"
                disabled={saving}
                aria-label="Fermer le formulaire de technologie"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* IMAGE */}
            <label className="border border-dashed border-white/10 rounded-2xl bg-[#0f0f0f] h-40 sm:h-44 flex flex-col items-center justify-center cursor-pointer overflow-hidden mb-4">
              {preview ? (
                <ResponsiveImage
                          sizes="64px"
                  src={preview}
                  alt="Aperçu du logo à importer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <Upload
                    size={22}
                    className="text-white/50 mb-2"
                  />

                  <p className="text-sm text-white/50">
                    Importer le logo
                  </p>
                </>
              )}

              <input
                type="file"
                hidden
                disabled={saving}
                accept="image/*"
                onChange={handleImage}
              />
            </label>

            {/* INPUT */}
            <input
              placeholder="Nom de la technologie"
              aria-label="Nom de la technologie"
              disabled={saving}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#0f0f0f] border border-white/10 outline-none mb-5 text-sm"
            />
            <label className="mb-4 flex min-h-11 items-center gap-3 text-sm text-white/80"><input type="checkbox" disabled={saving} checked={heroVisible} onChange={(event) => setHeroVisible(event.target.checked)} className="h-4 w-4 accent-emerald-300" />Afficher dans le bandeau de l’accueil</label>
            <label className="mb-5 block text-sm text-white/80">Ordre dans le bandeau<input type="number" min={0} max={9999} step={1} disabled={saving} value={heroOrder} onChange={(event) => setHeroOrder(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-3" /></label>

            {/* BUTTONS */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition"
              >
                Annuler
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-black hover:opacity-90 transition"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
