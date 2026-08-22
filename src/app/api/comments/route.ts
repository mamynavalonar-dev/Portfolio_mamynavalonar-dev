import { randomUUID } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requestIpHash, visitorIdentity } from "@/lib/requestIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 2_000_000;
const ALLOWED_IMAGES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const PUBLIC_COLUMNS =
  "id,name,comment,image_url,likes,is_pinned,replies,created_at,liked_by_admin";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function hasValidImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }

  if (mimeType === "image/webp") {
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const identity = visitorIdentity(request);
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("comments")
      .select(PUBLIC_COLUMNS)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    const response = json({ ok: true, comments: data ?? [] });
    if (identity.cookie) response.headers.append("Set-Cookie", identity.cookie);
    return response;
  } catch (error) {
    console.error("Comments API read error:", error);
    return json(
      { ok: false, message: "Impossible de charger les commentaires." },
      500,
    );
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, message: "Fichier ou requête trop volumineux." }, 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json({ ok: false, message: "Requête invalide." }, 400);
  }

  const name = String(formData.get("name") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  const imageEntry = formData.get("image");
  const image = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

  if (name.length < 2 || name.length > 80) {
    return json({ ok: false, message: "Le nom doit contenir entre 2 et 80 caractères." }, 400);
  }

  if (comment.length < 3 || comment.length > 1000) {
    return json({ ok: false, message: "Le commentaire doit contenir entre 3 et 1000 caractères." }, 400);
  }

  if (image && (!ALLOWED_IMAGES.has(image.type) || image.size > MAX_IMAGE_BYTES)) {
    return json(
      { ok: false, message: "L'image doit être un JPEG, PNG ou WebP de 2 Mo maximum." },
      400,
    );
  }

  if (image) {
    const signature = new Uint8Array(await image.slice(0, 12).arrayBuffer());

    if (!hasValidImageSignature(signature, image.type)) {
      return json({ ok: false, message: "Le contenu du fichier image est invalide." }, 400);
    }
  }

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdmin();
  } catch (error) {
    console.error("Comments API configuration error:", error);
    return json({ ok: false, message: "Service non configuré." }, 503);
  }

  let imageUrl: string | null = null;
  let imagePath: string | null = null;

  if (image) {
    const extension = ALLOWED_IMAGES.get(image.type)!;
    imagePath = `public/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("comments")
      .upload(imagePath, image, { contentType: image.type, upsert: false });

    if (uploadError) {
      console.error("Comment image upload error:", uploadError.message);
      return json({ ok: false, message: "Impossible d'envoyer l'image." }, 500);
    }

    imageUrl = supabaseAdmin.storage.from("comments").getPublicUrl(imagePath).data.publicUrl;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("submit_comment", {
      p_comment: comment,
      p_image_url: imageUrl,
      p_ip_hash: requestIpHash(request),
      p_name: name,
    });

    if (error) {
      if (error.message.includes("COMMENT_RATE_LIMIT")) {
        if (imagePath) await supabaseAdmin.storage.from("comments").remove([imagePath]);
        return json(
          { ok: false, message: "Trop de commentaires envoyés. Réessayez plus tard." },
          429,
        );
      }

      throw error;
    }

    const created = Array.isArray(data) ? data[0] : data;
    return json({ ok: true, comment: created }, 201);
  } catch (error) {
    if (imagePath) await supabaseAdmin.storage.from("comments").remove([imagePath]);
    console.error("Comment creation error:", error);
    return json({ ok: false, message: "Impossible de publier le commentaire." }, 500);
  }
}
