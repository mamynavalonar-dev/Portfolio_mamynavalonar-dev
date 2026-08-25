import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CV_BUCKET } from "@/lib/cvValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function redirectNoStore(location: string) {
  return new Response(null, {
    status: 307,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { data: cv, error } = await supabaseAdmin
      .from("portfolio_cv")
      .select("storage_path,external_url,file_name")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Public CV lookup error:", error.message);
      return noStoreJson(
        { ok: false, message: "Le CV est temporairement indisponible." },
        503,
      );
    }

    if (!cv) {
      return noStoreJson(
        { ok: false, message: "Aucun CV n'est actuellement publié." },
        404,
      );
    }

    if (cv.storage_path) {
      const mode = new URL(request.url).searchParams.get("mode");
      const bucket = supabaseAdmin.storage.from(CV_BUCKET);

      const signedResult =
        mode === "inline"
          ? await bucket.createSignedUrl(cv.storage_path, 60)
          : await bucket.createSignedUrl(cv.storage_path, 60, {
              download: cv.file_name,
            });

      if (signedResult.error || !signedResult.data?.signedUrl) {
        console.error(
          "Public CV signed URL error:",
          signedResult.error?.message ?? "signed URL missing",
        );
        return noStoreJson(
          { ok: false, message: "Le CV est temporairement indisponible." },
          503,
        );
      }

      return redirectNoStore(signedResult.data.signedUrl);
    }

    if (cv.external_url?.startsWith("https://")) {
      return redirectNoStore(cv.external_url);
    }

    return noStoreJson(
      { ok: false, message: "Aucun CV n'est actuellement publié." },
      404,
    );
  } catch (error) {
    console.error("Public CV download error:", error);

    return noStoreJson(
      { ok: false, message: "Le CV est temporairement indisponible." },
      503,
    );
  }
}
