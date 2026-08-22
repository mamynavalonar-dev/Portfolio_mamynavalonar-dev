import { adminErrorResponse, requireAdminUser } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAdminUser();

    return Response.json(
      { ok: true, user: { id: user.id, email: user.email ?? null } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
