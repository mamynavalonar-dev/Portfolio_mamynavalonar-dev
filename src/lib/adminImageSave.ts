import { supabase } from "@/lib/supabase";
import { validateDisplayOrder } from "@/lib/portfolioContentValidation";

type ImageRecordInput = {
  table: "certificates" | "tech_stack";
  bucket: "certificates" | "tech-stack";
  imageField: "image_url" | "logo_url";
  labelField: "title" | "name";
  label: string;
  id: number | null;
  file: File | null;
  storedUrl: string;
  heroVisible?: boolean;
  heroOrder?: number;
  onConfirmed?: (record: Record<string, unknown>) => void;
};

export async function saveAdminImageRecord(input: ImageRecordInput) {
  const label = input.label.trim();
  if (!label) throw new Error("Le nom est obligatoire.");
  // Les champs du bandeau sont validés avant l'import du fichier.
  const heroFields = input.table === "tech_stack" && input.heroVisible !== undefined
    ? { hero_visible: input.heroVisible, hero_order: validateDisplayOrder(input.heroOrder ?? 0) }
    : {};
  let imageUrl = input.storedUrl;

  if (input.file) {
    const maxBytes = input.bucket === "tech-stack" ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (input.bucket === "tech-stack") allowedTypes.push("image/svg+xml");
    if (!allowedTypes.includes(input.file.type) || input.file.size > maxBytes) {
      throw new Error(`Image non autorisée ou trop volumineuse (${maxBytes / 1024 / 1024} Mio maximum).`);
    }

    const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const bucket = supabase.storage.from(input.bucket);
    const { error } = await bucket.upload(path, input.file, {
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) throw new Error("L'import de l'image a échoué. Le formulaire est conservé.");
    imageUrl = bucket.getPublicUrl(path).data.publicUrl;
  }

  if (!/^https?:\/\//i.test(imageUrl) && !/^\/(?!\/)/.test(imageUrl)) {
    throw new Error("Importez une image avant d'enregistrer.");
  }

  const values = { [input.labelField]: label, [input.imageField]: imageUrl, ...heroFields };
  const table = supabase.from(input.table);
  const result = input.id !== null
    ? await table.update(values).eq("id", input.id).select("*").single()
    : await table.insert([values]).select("*").single();

  if (result.error || !result.data) {
    // Supabase peut renvoyer une erreur de transport dans result.error, sans
    // lever d'exception. L'INSERT/UPDATE peut pourtant avoir été validé : ne
    // jamais supprimer le fichier après une écriture non confirmée.
    throw new Error("L'enregistrement n'a pas été confirmé. Le formulaire est conservé. Actualisez la liste avant de créer une nouvelle entrée.");
  }

  input.onConfirmed?.(result.data);
  return imageUrl;
}
