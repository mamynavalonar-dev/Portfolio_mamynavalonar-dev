import { createAdminContentHandlers } from "@/lib/adminPortfolioContent";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createAdminContentHandlers("services");
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
