"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, X } from "lucide-react";
import { Project } from "@/types";
import { normalizeProject, toStringList } from "@/lib/projectFields";
import ResponsiveImage from "@/components/ui/ResponsiveImage";

const MAX_PROJECT_IMAGE_DIMENSION = 1920;
const PROJECT_IMAGE_QUALITY = 0.9;

async function optimizeProjectImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_PROJECT_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", PROJECT_IMAGE_QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function createStoragePath(file: File, index: number) {
  const safeName = file.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${Date.now()}-${index}-${crypto.randomUUID()}-${safeName}`;
}

export default function AddProjectModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Project) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [live, setLive] = useState("");
  const [github, setGithub] = useState("");
  const [tech, setTech] = useState("");
  const [features, setFeatures] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));

    setPreviews((prev) => {
      const removedPreview = prev[index];

      if (removedPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(removedPreview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const handleImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);

    event.target.value = "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) return showToast("Le titre est obligatoire");
    if (!desc.trim()) return showToast("La description est obligatoire");
    if (!tech.trim()) return showToast("Les technologies sont obligatoires");
    if (!features.trim()) {
      return showToast("Les fonctionnalités sont obligatoires");
    }
    if (images.length === 0) return showToast("Importez au moins 1 image");

    setLoading(true);

    try {
      const optimizedImages = await Promise.all(
        images.map((image) => optimizeProjectImage(image)),
      );

      const uploadResults = await Promise.all(
        optimizedImages.map(async (image, index) => {
          const path = createStoragePath(image, index);

          const { error } = await supabase.storage
            .from("projects")
            .upload(path, image, {
              cacheControl: "31536000",
              upsert: false,
            });

          if (error) {
            return { path, publicUrl: null };
          }

          const { data } = supabase.storage
            .from("projects")
            .getPublicUrl(path);

          return { path, publicUrl: data.publicUrl };
        }),
      );

      const successfulUploads = uploadResults.filter(
        (result) => result.publicUrl !== null,
      );

      if (successfulUploads.length !== images.length) {
        const uploadedPaths = successfulUploads.map((result) => result.path);

        if (uploadedPaths.length > 0) {
          await supabase.storage.from("projects").remove(uploadedPaths);
        }

        showToast("Échec de l'import d'une ou plusieurs images");
        return;
      }

      const uploadedUrls = successfulUploads.map(
        (result) => result.publicUrl as string,
      );

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            title: title.trim(),
            description: desc.trim(),
            live_url: live.trim() || null,
            github_url: github.trim() || null,
            technologies: toStringList(tech),
            key_features: toStringList(features),
            image_url: uploadedUrls[0] || null,
            image_urls: uploadedUrls,
          },
        ])
        .select()
        .single();

      if (error) {
        await supabase.storage
          .from("projects")
          .remove(successfulUploads.map((result) => result.path));

        showToast("Échec de l'enregistrement");
        return;
      }

      onAdd(normalizeProject(data));

      previews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });

      setTitle("");
      setDesc("");
      setLive("");
      setGithub("");
      setTech("");
      setFeatures("");
      setImages([]);
      setPreviews([]);

      onClose();
    } catch {
      showToast("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex items-center justify-center px-3 sm:px-6 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-project-title"
    >
      {toast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="w-full max-w-[820px] bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2
              id="add-project-title"
              className="text-base sm:text-lg font-semibold"
            >
              Ajouter un projet
            </h2>

            <p className="text-[11px] sm:text-xs text-white/40 mt-1">
              Saisie simple du portfolio
            </p>
          </div>

          <button
            type="button"
            aria-label="Fermer la fenêtre d'ajout"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
            <div>
              <label className="text-xs text-white/50">Titre du projet</label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full mt-2 px-4 py-3 bg-[#111] border border-white/10 rounded-2xl outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 block mb-2">Import</label>

              <label className="h-[86px] border border-dashed border-white/15 rounded-2xl bg-[#111] hover:bg-[#151515] transition flex flex-col items-center justify-center cursor-pointer">
                <Upload size={18} className="mb-1 text-white/50" />

                <span className="text-[11px] text-white/60">
                  Importer des images
                </span>

                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleImages}
                />
              </label>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {previews.map((image, index) => (
                <div
                  key={image}
                  className="relative rounded-2xl overflow-hidden border border-white/10"
                >
                  <ResponsiveImage
                    src={image}
                    alt={`Aperçu de l'image ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Retirer l'image ${index + 1}`}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black rounded-full p-1.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs text-white/50">Description</label>

            <textarea
              value={desc}
              onChange={(event) => setDesc(event.target.value)}
              className="w-full mt-2 px-4 py-3 min-h-[110px] bg-[#111] border border-white/10 rounded-2xl outline-none resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="URL de la démo en ligne"
              value={live}
              onChange={(event) => setLive(event.target.value)}
              className="px-4 py-3 bg-[#111] border border-white/10 rounded-2xl outline-none text-sm"
            />

            <input
              placeholder="URL Github"
              value={github}
              onChange={(event) => setGithub(event.target.value)}
              className="px-4 py-3 bg-[#111] border border-white/10 rounded-2xl outline-none text-sm"
            />
          </div>

          <input
            placeholder="Technologies"
            value={tech}
            onChange={(event) => setTech(event.target.value)}
            className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-2xl outline-none text-sm"
          />

          <input
            placeholder="Fonctionnalités clés"
            value={features}
            onChange={(event) => setFeatures(event.target.value)}
            className="w-full px-4 py-3 bg-[#111] border border-white/10 rounded-2xl outline-none text-sm"
          />

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 transition text-sm"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white text-black font-medium hover:opacity-90 transition text-sm disabled:cursor-wait disabled:opacity-65"
            >
              {loading ? "Optimisation et envoi..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
