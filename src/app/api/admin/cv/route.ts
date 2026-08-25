import { adminErrorResponse, requireAdminUser } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CV_BUCKET,
  CV_MAX_BYTES,
  CV_MIME_TYPE,
  hasPdfSignature,
  sanitizeCvFileName,
} from "@/lib/cvValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function toPublicCv(data: {
  file_name: string;
  file_size: number | null;
  storage_path: string | null;
  updated_at: string;
} | null) {
  if (!data) return null;

  return {
    fileName: data.file_name,
    fileSize: data.file_size,
    managed: Boolean(data.storage_path),
    updatedAt: data.updated_at,
  };
}

export async function GET() {
  try {
    await requireAdminUser();

    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("portfolio_cv")
      .select("file_name,file_size,storage_path,updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Admin CV read error:", error.message);
      return noStoreJson(
        { ok: false, message: "Impossible de charger le CV." },
        500,
      );
    }

    return noStoreJson({ ok: true, cv: toPublicCv(data) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return noStoreJson(
        { ok: false, message: "Sélectionnez un fichier PDF." },
        400,
      );
    }

    if (
      file.type !== CV_MIME_TYPE ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return noStoreJson(
        { ok: false, message: "Seuls les fichiers PDF sont acceptés." },
        400,
      );
    }

    if (file.size <= 0 || file.size > CV_MAX_BYTES) {
      return noStoreJson(
        { ok: false, message: "Le CV doit peser au maximum 3 Mo." },
        400,
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    if (!hasPdfSignature(bytes)) {
      return noStoreJson(
        { ok: false, message: "Le contenu du fichier n'est pas un PDF valide." },
        400,
      );
    }

    const supabaseAdmin = createSupabaseAdmin();

    const storagePath = `versions/${Date.now()}-${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(CV_BUCKET)
      .upload(storagePath, bytes, {
        cacheControl: "3600",
        contentType: CV_MIME_TYPE,
        upsert: false,
      });

    if (uploadError) {
      console.error("Admin CV upload error:", uploadError.message);
      return noStoreJson(
        { ok: false, message: "Impossible d'importer le nouveau CV." },
        500,
      );
    }

    const nextCv = {
      id: 1,
      storage_path: storagePath,
      external_url: null,
      file_name: sanitizeCvFileName(file.name),
      file_size: file.size,
      mime_type: CV_MIME_TYPE,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabaseAdmin
      .from("portfolio_cv")
      .upsert(nextCv, { onConflict: "id" })
      .select("file_name,file_size,storage_path,updated_at")
      .single();

    if (updateError) {
      console.error("Admin CV metadata update error:", updateError.message);
      await supabaseAdmin.storage.from(CV_BUCKET).remove([storagePath]);

      return noStoreJson(
        { ok: false, message: "Impossible d'activer le nouveau CV." },
        500,
      );
    }

    return noStoreJson({
      ok: true,
      message: "CV mis à jour avec succès.",
      cv: toPublicCv(data),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
