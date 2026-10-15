"use client";

import useAdminCachedState from "@/hooks/useAdminCachedState";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Pencil, X, Upload } from "lucide-react";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { saveAdminImageRecord } from "@/lib/adminImageSave";
import { revalidatePortfolio } from "@/lib/revalidatePortfolio";
import { Certificate } from "@/types";

export default function CertificatesPage() {
  const [certificates, setCertificates, hasSnapshot] = useAdminCachedState<Certificate[]>("certificates", []);
  const [loading, setLoading] = useState(() => !hasSnapshot());

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [storedUrl, setStoredUrl] = useState("");
  const [readError, setReadError] = useState("");
  const readRequest = useRef(0);

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const fetchCertificates = useCallback(async () => {
    const requestId = ++readRequest.current;
    try {
      const { data, error } = await supabase.from("certificates")
        .select("*").order("created_at", { ascending: true });
      if (error) throw error;
      if (requestId !== readRequest.current) return;
      setCertificates(data || []);
      setReadError("");
    } catch {
      if (requestId === readRequest.current) setReadError("Lecture indisponible. Les données déjà chargées sont conservées.");
    } finally {
      if (requestId === readRequest.current) setLoading(false);
    }
  }, [setCertificates]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchCertificates(), 0);

    const channel = supabase
      .channel("certificates-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "certificates",
        },
        () => {
          fetchCertificates();
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      readRequest.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [fetchCertificates]);



  const resetForm = () => {
    setTitle("");
    setImage(null);
    setPreview("");
    setStoredUrl("");
    setEditId(null);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await saveAdminImageRecord({
        table: "certificates", bucket: "certificates", imageField: "image_url",
        labelField: "title", label: title, id: editId,
        file: image, storedUrl,
        onConfirmed: (record) => {
          const confirmed = record as unknown as Certificate;
          readRequest.current += 1;
          setLoading(false);
          setCertificates((previous) => [...previous.filter((item) => item.id !== confirmed.id), confirmed].sort((a, b) => a.created_at.localeCompare(b.created_at)));
        },
      });
      void revalidatePortfolio();
      setOpen(false);
      resetForm();
      void fetchCertificates();
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
      title: "Supprimer le certificat ?",
      text: "Un certificat supprimé ne peut pas être récupéré.",
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
      const result = await supabase.from("certificates").delete().eq("id", id).select("id").single();
      error = result.error || (!result.data ? new Error("Élément introuvable") : null);
    } catch (caught) { error = caught; }

    if (!error) {
      readRequest.current += 1;
      void revalidatePortfolio();
      setCertificates((prev) => prev.filter((item) => item.id !== id));

      Swal.fire({
        title: "Supprimé !",
        text: "Le certificat a bien été supprimé.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#111",
        color: "#fff",
      });
    } else {
      Swal.fire({
        title: "Échec",
        text: "Impossible de supprimer le certificat.",
        icon: "error",
        background: "#111",
        color: "#fff",
      });
    }
  };

  const handleEdit = (item: Certificate) => {
    setTitle(item.title);
    setPreview(item.image_url);
    setStoredUrl(item.image_url);
    setImage(null);
    setEditId(item.id);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* SIDEBAR */}

      {/* MAIN */}
      <main className="lg:ml-[250px] min-h-screen px-4 sm:px-6 lg:px-8 pt-[90px] lg:pt-6 pb-6">
        <div className="py-6 lg:py-8">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Certificats</h1>

              <p className="text-sm text-white/40 mt-1">
                Gérez vos certificats
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-black hover:scale-[1.02] transition"
            >
              <Plus size={16} />
              Ajouter un certificat
            </button>
          </div>

          {/* CONTENT */}
          {readError && <p role="alert" className="mb-4 text-sm text-amber-200">{readError} <button type="button" className="underline" onClick={() => void fetchCertificates()}>Réessayer</button></p>}
          {loading ? (
            <div className="text-white/50 text-sm">Chargement des certificats...</div>
          ) : certificates.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] h-[240px] flex items-center justify-center text-white/35">
              Aucun certificat trouvé
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-6">
              {certificates.map((item) => (
                <div
                  key={item.id}
                  className="border border-white/10 bg-white/[0.03] rounded-2xl p-4 hover:border-white/25 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* IMAGE */}
                  <div className="w-full h-[150px] rounded-xl overflow-hidden bg-white/[0.03] mb-4">
                    {item.image_url ? (
                      <ResponsiveImage
                        src={item.image_url}
                        alt={`Certificat : ${item.title}`}
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/[0.03]" />
                    )}
                  </div>

                  {/* TITLE */}
                  <h2 className="font-semibold text-[15px] mb-3 line-clamp-2 min-h-[42px]">
                    {item.title}
                  </h2>

                  {/* DATE */}
                  <span className="text-[11px] text-white/30 mb-4">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : "Aucune date"}
                  </span>

                  {/* ACTION */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition flex items-center justify-center text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center px-3 sm:px-4 py-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111] border border-white/10 p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-semibold">
                {editId ? "Modifier le certificat" : "Ajouter un certificat"}
              </h2>

              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* IMAGE */}
            <label className="border border-dashed border-white/10 rounded-2xl bg-[#0f0f0f] h-44 sm:h-52 flex flex-col items-center justify-center cursor-pointer overflow-hidden mb-4">
              {preview ? (
                <ResponsiveImage src={preview} alt="Aperçu du certificat à importer" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={24} className="text-white/50 mb-2" />

                  <p className="text-sm text-white/60">
                    Importer l&apos;image du certificat
                  </p>
                </>
              )}

              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImage}
              />
            </label>

            {/* TITLE */}
            <input
              placeholder="Titre du certificat"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#0f0f0f] border border-white/10 outline-none mb-5 text-sm"
            />

            {/* BUTTON */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5"
              >
                Annuler
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-black font-medium"
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
