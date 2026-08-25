"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import Sidebar from "@/app/admin/Sidebar";
import { CV_MAX_BYTES, CV_MIME_TYPE } from "@/lib/cvValidation";

type CvInfo = {
  fileName: string;
  fileSize: number | null;
  managed: boolean;
  updatedAt: string;
};

type CvResponse = {
  ok: boolean;
  message?: string;
  cv?: CvInfo | null;
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Taille inconnue";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export default function CvAdminPage() {
  const [cv, setCv] = useState<CvInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCv = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/cv", {
        cache: "no-store",
      });
      const payload = (await response.json()) as CvResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Impossible de charger le CV.");
      }

      setCv(payload.cv ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le CV.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCv();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCv]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setMessage(null);
    setErrorMessage(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== CV_MIME_TYPE || !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setErrorMessage("Sélectionnez uniquement un fichier PDF.");
      event.target.value = "";
      return;
    }

    if (file.size <= 0 || file.size > CV_MAX_BYTES) {
      setSelectedFile(null);
      setErrorMessage("Le CV doit peser au maximum 3 Mo.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile || uploading) return;

    setUploading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/cv", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as CvResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Impossible de mettre à jour le CV.");
      }

      setCv(payload.cv ?? null);
      setSelectedFile(null);
      setMessage(payload.message || "CV mis à jour avec succès.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le CV.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <div className="fixed left-0 top-0 h-screen z-40">
        <Sidebar />
      </div>

      <main className="lg:ml-[250px] pt-[100px] lg:pt-0 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Gestion du CV</h1>
              <p className="text-white/40 text-sm mt-1 max-w-2xl">
                Gérez le document proposé aux recruteurs depuis votre portfolio,
                sans modifier le code ni le lien du bouton public.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadCv()}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 flex items-center gap-2">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-5">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                    CV actuellement publié
                  </p>
                  <h2 className="text-xl font-semibold mt-2">
                    Document accessible aux recruteurs
                  </h2>
                </div>

                <div className="w-11 h-11 rounded-2xl bg-white text-black flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
              </div>

              {loading ? (
                <div className="min-h-[210px] flex items-center justify-center text-sm text-white/40">
                  Chargement du CV...
                </div>
              ) : cv ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium break-all">{cv.fileName}</p>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/45">
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        {formatFileSize(cv.fileSize)}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        {cv.managed ? "Supabase Storage" : "Lien hérité"}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1.5">
                        Mis à jour le{" "}
                        {new Date(cv.updatedAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="/api/cv/download?mode=inline"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition text-sm flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={15} />
                      Aperçu
                    </a>

                    <a
                      href="/api/cv/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 rounded-xl bg-white text-black hover:opacity-90 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Download size={15} />
                      Télécharger
                    </a>
                  </div>
                </div>
              ) : (
                <div className="min-h-[210px] rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-center px-5">
                  <div>
                    <FileText size={28} className="mx-auto text-white/25 mb-3" />
                    <p className="text-sm text-white/50">
                      Aucun CV n&apos;est actuellement publié.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Remplacer le CV
                </p>
                <h2 className="text-xl font-semibold mt-2">
                  Publier une nouvelle version
                </h2>
                <p className="text-sm text-white/40 mt-2">
                  PDF uniquement, 3 Mo maximum. Le nouveau fichier devient actif
                  seulement après un envoi et un enregistrement réussis.
                </p>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <label className="min-h-[190px] border border-dashed border-white/15 rounded-2xl bg-black/20 hover:bg-white/[0.03] transition flex flex-col items-center justify-center cursor-pointer px-5 text-center">
                  <UploadCloud size={28} className="text-white/40 mb-3" />

                  {selectedFile ? (
                    <>
                      <span className="text-sm font-medium break-all">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-white/40 mt-2">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-white/70">
                        Sélectionner un fichier PDF
                      </span>
                      <span className="text-xs text-white/35 mt-2">
                        Cliquez ici pour choisir le nouveau CV
                      </span>
                    </>
                  )}

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                </label>

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="w-full px-5 py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {uploading ? "Mise à jour en cours..." : "Mettre à jour le CV"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
