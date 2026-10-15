import { revalidatePath, revalidateTag } from "next/cache";
import { adminErrorResponse, requireAdminUser } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin) {
      // Next peut reconstruire une URL interne (localhost) derrière le proxy.
      // Host est celui de la requête navigateur ; ne pas confondre les deux.
      let sameHost = false;
      try {
        const source = new URL(origin);
        const host = request.headers.get("host") || new URL(request.url).host;
        sameHost = ["http:", "https:"].includes(source.protocol) &&
          source.host === new URL(`${source.protocol}//${host}`).host;
      } catch { /* Origin invalide : refus avant tout effet. */ }
      if (!sameHost) {
        return Response.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
      }
    }
    await requireAdminUser();
    revalidateTag("public-portfolio", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/portfolio/[id]", "page");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
