"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import { useAdminMemoryCache } from "@/components/admin/AdminDataProvider";
import { revalidatePortfolio } from "@/lib/revalidatePortfolio";
import {
  getProjectImageUrls,
  prepareExistingProjectImages,
  replaceProjectImageUrls,
  uploadPreparedProjectImages,
  type PreparedProjectImage,
  type UploadedProjectImage,
} from "@/lib/projectImages";

import {
  Code2,
  Layers,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Project } from "@/types";
import {
  listToInput,
  normalizeProject,
  toStringList,
} from "@/lib/projectFields";

type ProjectForm = Omit<Project, "technologies" | "key_features"> & {
  technologies: string;
  key_features: string;
};

function projectToForm(project: Project): ProjectForm {
  return {
    ...project,
    technologies: listToInput(project.technologies),
    key_features: listToInput(project.key_features),
  };
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectDetailEditor key={id} id={id} />;
}

type PreparedImagePreview = PreparedProjectImage & { previewUrl: string };

function ProjectDetailEditor({ id }: { id: string }) {
  const router = useRouter();
  const cache = useAdminMemoryCache();

  const [project, setProject] = useState<Project | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProjectForm>({
    id: "",
    title: "",
    description: "",
    technologies: "",
    key_features: "",
    image_url: null,
    image_urls: null,
    live_url: null,
    github_url: null,
    created_at: "",
  });
  const [currentImage, setCurrentImage] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [readError, setReadError] = useState("");
  const [imageOperation, setImageOperation] = useState<"preparing" | "saving" | null>(null);
  const [preparedImages, setPreparedImages] = useState<PreparedImagePreview[]>([]);
  const [imageNotice, setImageNotice] = useState("");
  const operationLock = useRef(false);
  const operationController = useRef<AbortController | null>(null);
  const ownedPreviews = useRef(new Set<string>());
  const stagedUploads = useRef(new Map<string, UploadedProjectImage>());

  useEffect(() => {
    const previews = ownedPreviews.current;
    return () => {
      operationController.current?.abort();
      previews.forEach((url) => URL.revokeObjectURL(url));
      previews.clear();
    };
  }, []);

  const clearPreparedImages = () => {
    ownedPreviews.current.forEach((url) => URL.revokeObjectURL(url));
    ownedPreviews.current.clear();
    stagedUploads.current.clear();
    setPreparedImages([]);
    setImageNotice("");
  };

  const handleOptimizeImages = async () => {
    if (operationLock.current || !editMode || preparedImages.length) return;
    operationLock.current = true;
    const controller = new AbortController();
    operationController.current = controller;
    setImageOperation("preparing");
    setImageNotice("");
    try {
      const prepared = await prepareExistingProjectImages(getProjectImageUrls(form), process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", controller.signal);
      controller.signal.throwIfAborted();
      const previews: PreparedImagePreview[] = [];
      try {
        for (const image of prepared) {
          const previewUrl = URL.createObjectURL(image.file);
          ownedPreviews.current.add(previewUrl);
          previews.push({ ...image, previewUrl });
        }
      } catch (error) {
        previews.forEach(({ previewUrl }) => { URL.revokeObjectURL(previewUrl); ownedPreviews.current.delete(previewUrl); });
        throw error;
      }
      setPreparedImages(previews);
      const before = prepared.reduce((total, image) => total + image.originalBytes, 0);
      const after = prepared.reduce((total, image) => total + image.file.size, 0);
      setImageNotice(prepared.length ? `${prepared.length} image(s) préparée(s) : ${(before / 1048576).toFixed(2)} Mio → ${(after / 1048576).toFixed(2)} Mio. Vérifiez l'aperçu, puis Enregistrer pour publier.` : "Ces images sont déjà aussi légères que les versions préparées. Aucun remplacement nécessaire.");
    } catch (error) {
      if (!controller.signal.aborted) setImageNotice(error instanceof Error ? error.message : "La préparation des images a échoué. Réessayez.");
    } finally {
      operationLock.current = false;
      if (!controller.signal.aborted) setImageOperation(null);
    }
  };

    const fetchProject = useCallback(async () => {
    try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (data) {
      setReadError("");
      const normalizedProject = normalizeProject(data);
      setProject(normalizedProject);
      setForm(projectToForm(normalizedProject));
    }
    } catch { setReadError("Le projet ne peut pas être chargé. Réessayez."); }
  }, [id]);

useEffect(() => {
    const timer = setTimeout(() => {
      void fetchProject();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchProject]);


  const handleDelete = async () => {
  const result = await Swal.fire({
    title: "Supprimer le projet ?",
    text: "Un projet supprimé ne peut pas être récupéré.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Oui, supprimer",
    cancelButtonText: "Annuler",
    background: "#101010",
    color: "#fff",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#27272a",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return;

  try {
  const { data: confirmed, error } = await supabase.from("projects").delete().eq("id", id).select("id").single();

  if (!error && confirmed) {
    cache.updateMatching("projects", (value) => (value as Project[]).filter((item) => item.id !== id));
    void revalidatePortfolio();
    await Swal.fire({
      title: "Terminé !",
      text: "Le projet a bien été supprimé.",
      icon: "success",
      timer: 1800,
      showConfirmButton: false,
      background: "#101010",
      color: "#fff",
    });

    router.push("/admin/projects");
  } else {
    Swal.fire({
      title: "Échec",
      text: "Impossible de supprimer le projet.",
      icon: "error",
      background: "#101010",
      color: "#fff",
    });
  }
  } catch { await Swal.fire({ title: "Échec", text: "L’opération n’a pas été confirmée. Réessayez.", icon: "error", background: "#101010", color: "#fff" }); }
};

  const handleUpdate = async () => {
    if (operationLock.current) return;
    operationLock.current = true;
    const controller = new AbortController();
    operationController.current = controller;
    setImageOperation("saving");
    try {
      const uploaded = await uploadPreparedProjectImages(preparedImages, supabase.storage.from("projects"), stagedUploads.current, controller.signal);
      controller.signal.throwIfAborted();
      const imageForm = replaceProjectImageUrls(form, uploaded);
      const technologies = toStringList(form.technologies);
      const keyFeatures = toStringList(form.key_features);
      const updates = {
        title: form.title,
        description: form.description,
        technologies,
        key_features: keyFeatures,
        image_url: imageForm.image_url,
        image_urls: imageForm.image_urls,
        live_url: form.live_url || null,
        github_url: form.github_url || null,
      };
      const { data: confirmed, error } = await supabase.from("projects").update(updates).eq("id", id).select("id").single();
      if (error || !confirmed) throw new Error("L'enregistrement n'a pas été confirmé. Réessayez ; les images d'origine sont conservées.");
      controller.signal.throwIfAborted();
      const updatedProject = normalizeProject({ id: form.id, created_at: form.created_at, ...updates });
      setProject(updatedProject);
      cache.updateMatching("projects", (value) => (value as Project[]).map((item) => item.id === id ? updatedProject : item));
      setForm((current) => ({ ...current, ...updates, technologies: listToInput(technologies), key_features: listToInput(keyFeatures) }));
      clearPreparedImages();
      setEditMode(false);
      void revalidatePortfolio();
      if (controller.signal.aborted) return;
      await Swal.fire({
        title: "Terminé",
        text: "Le projet est enregistré. Le portfolio public est en cours d’actualisation.",
        icon: "success", timer: 1800, showConfirmButton: false, background: "#101010", color: "#fff",
      });
    } catch (error) {
      if (!controller.signal.aborted) await Swal.fire({ title: "Échec", text: error instanceof Error ? error.message : "L’opération n’a pas été confirmée. Réessayez.", icon: "error", background: "#101010", color: "#fff" });
    } finally {
      operationLock.current = false;
      if (!controller.signal.aborted) setImageOperation(null);
    }
  };
  if (readError && !project) return <div className="min-h-screen bg-black text-white p-8"><p role="alert">{readError}</p><button type="button" onClick={() => void fetchProject()} className="mt-4 underline">Réessayer</button></div>;

  if (!project)
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white pt-[95px] lg:ml-[250px] lg:pt-8">
        Chargement...
      </div>
    );

  const tech = toStringList(form.technologies);
  const features = toStringList(form.key_features);

  const previewBySource = new Map(preparedImages.map((image) => [image.sourceUrl, image.previewUrl]));
  const galleryImages = getProjectImageUrls(editMode ? form : project).map((url) => previewBySource.get(url) ?? url);

  const nextImage = () => {
    if (currentImage < galleryImages.length - 1) {
      setCurrentImage((prev) => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentImage > 0) {
      setCurrentImage((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 md:px-8 lg:ml-[250px] lg:px-12 pt-[95px] lg:pt-8 pb-5 md:pb-8">
      {/* LIGHTBOX */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex items-center justify-center px-4"
          >
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X size={18} />
            </button>

            {currentImage > 0 && (
              <button
                onClick={prevImage}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <motion.img
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
              src={galleryImages[currentImage]}
              alt={`${project.title} — image ${currentImage + 1}`}
              className="max-w-[92vw] max-h-[78vh] rounded-2xl object-contain"
            />

            {currentImage < galleryImages.length - 1 && (
              <button
                onClick={nextImage}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACK */}
      <motion.button
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => router.back()}
        disabled={imageOperation !== null}
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6"
      >
        <ArrowLeft size={14} />
        Retour
      </motion.button>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.92fr] gap-8 xl:gap-10 items-start">
        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          {editMode ? (
            <input
              value={form.title}
              disabled={imageOperation === "saving"}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-2xl md:text-4xl font-bold bg-transparent border-b border-white/15 w-full outline-none mb-3"
            />
          ) : (
            <h1 className="text-[28px] sm:text-[34px] md:text-[42px] font-bold leading-tight tracking-tight mb-3">
              {project.title}
            </h1>
          )}

          <div className="w-16 h-[2px] rounded-full bg-white/20 mb-5" />

          {editMode ? (
            <textarea
              value={form.description}
              disabled={imageOperation === "saving"}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="w-full min-h-[120px] bg-[#111] border border-white/10 rounded-2xl p-4 text-sm outline-none mb-6"
            />
          ) : (
            <p className="text-sm md:text-[13px] leading-7 text-white/60 text-justify mb-6">
              {project.description}
            </p>
          )}

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <motion.div
              whileHover={{ y: -2 }}
              className="bg-[#101010] border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Code2 size={16} />
              </div>

              <div>
                <p className="text-lg font-semibold">{tech.length}</p>

                <p className="text-[11px] text-white/40">Technologies au total</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-[#101010] border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Layers size={16} />
              </div>

              <div>
                <p className="text-lg font-semibold">{features.length}</p>

                <p className="text-[11px] text-white/40">Fonctionnalités principales</p>
              </div>
            </motion.div>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
            {editMode ? (
              <input
                value={form.live_url || ""}
                disabled={imageOperation === "saving"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    live_url: e.target.value,
                  })
                }
                placeholder="URL de la démo en ligne"
                className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 w-full sm:w-[260px] outline-none text-sm"
              />
            ) : project.live_url ? (
              <a
                href={project.live_url}
                target="_blank"
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-xl bg-[#101010] border border-white/10 hover:bg-white/5 transition"
              >
                <ExternalLink size={15} />
                <span className="text-sm">Démo en ligne</span>
              </a>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-xl bg-[#101010] border border-white/10 text-white/45">
                <ExternalLink size={15} />
                <span className="text-sm">Aucun lien</span>
              </div>
            )}

            {editMode ? (
              <input
                value={form.github_url || ""}
                disabled={imageOperation === "saving"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    github_url: e.target.value,
                  })
                }
                placeholder="URL Github"
                className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 w-full sm:w-[260px] outline-none text-sm"
              />
            ) : project.github_url ? (
              <a
                href={project.github_url}
                target="_blank"
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-xl bg-[#101010] border border-white/10 hover:bg-white/5 transition"
              >
                <GitBranch size={15} />
                <span className="text-sm">Github</span>
              </a>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-xl bg-[#101010] border border-white/10 text-white/45">
                <GitBranch size={15} />
                <span className="text-sm">Aucun lien</span>
              </div>
            )}
          </div>

          {/* TECH STACK */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Code2 size={15} className="text-white/70" />
              <p className="text-sm font-semibold">Technologies utilisées</p>
            </div>

            {editMode ? (
              <input
                value={form.technologies}
                disabled={imageOperation === "saving"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    technologies: e.target.value,
                  })
                }
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 outline-none"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {tech.map((t: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-2 rounded-xl bg-[#101010] border border-white/10 text-[11px] text-white/75"
                  >
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full"
        >
          {/* GALLERY */}
          {editMode && getProjectImageUrls(form).length > 0 && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-[#101010] p-4 xl:max-w-[520px] xl:ml-auto">
              <button
                type="button"
                onClick={() => void handleOptimizeImages()}
                disabled={imageOperation !== null || preparedImages.length > 0}
                className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
              >
                {imageOperation === "preparing" ? "Préparation des images…" : "Optimiser les images enregistrées"}
              </button>
              <p className="mt-2 text-xs leading-relaxed text-white/60">Prépare des versions plus légères à vérifier dans l&apos;aperçu. Enregistrer publie les nouvelles images ; les originaux restent conservés.</p>
              {preparedImages.length > 0 && (
                <button type="button" onClick={clearPreparedImages} disabled={imageOperation !== null} className="mt-3 text-xs text-white/70 underline disabled:opacity-60">Annuler l&apos;optimisation des images</button>
              )}
              {imageNotice && <p role="status" className="mt-3 text-xs leading-relaxed text-white/80">{imageNotice}</p>}
            </div>
          )}
          {galleryImages.length > 0 && (
            <div className="mb-6 xl:max-w-[520px] xl:ml-auto">
              <div className="relative rounded-[28px] overflow-hidden border border-white/10 bg-[#101010] shadow-[0_0_40px_rgba(255,255,255,0.03)]">
                <motion.img
                  key={currentImage}
                  initial={{
                    opacity: 0.5,
                    scale: 1.02,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                  src={galleryImages[currentImage]}
                  alt={`${project.title} — image ${currentImage + 1}`}
                  onClick={() => setPreviewOpen(true)}
                  className="w-full h-[200px] sm:h-[240px] md:h-[270px] xl:h-[280px] 2xl:h-[300px] object-cover cursor-pointer"
                />

                {currentImage > 0 && (
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center"
                  >
                    <ChevronLeft size={17} />
                  </button>
                )}

                {currentImage < galleryImages.length - 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center"
                  >
                    <ChevronRight size={17} />
                  </button>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {galleryImages.map((_: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`transition-all rounded-full ${
                        currentImage === i
                          ? "w-7 h-2 bg-white"
                          : "w-2 h-2 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FEATURES */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#101010] border border-white/10 rounded-3xl p-5 md:p-6 xl:max-w-[520px] xl:ml-auto"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-white/70" />
              <p className="text-sm font-semibold">Fonctionnalités clés</p>
            </div>

            {editMode ? (
              <textarea
                value={form.key_features}
                disabled={imageOperation === "saving"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    key_features: e.target.value,
                  })
                }
                className="w-full min-h-[160px] bg-[#0f0f0f] border border-white/10 rounded-xl p-4 outline-none"
              />
            ) : (
              <ul className="space-y-3 text-sm text-white/65 leading-6">
                {features.map((f: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-white/35 mt-[2px]">•</span>

                    <span>{f.trim()}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-10">
        {editMode ? (
          <>
            <button
              onClick={handleUpdate}
              disabled={imageOperation !== null}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-black font-medium hover:opacity-90 transition"
            >
              {imageOperation === "saving" ? "Enregistrement…" : "Enregistrer"}
            </button>

            <button
              onClick={() => {
                clearPreparedImages();
                setForm(projectToForm(project));
                setEditMode(false);
              }}
              disabled={imageOperation !== null}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 transition"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditMode(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 transition"
            >
              Modifier
            </button>

            <button
              onClick={handleDelete}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 transition"
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
