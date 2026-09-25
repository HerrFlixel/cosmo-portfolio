import { adminApiGuard } from "@/lib/auth/admin";
import { getDb, getEnv } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import { PortfolioError, createImage, listByCategory } from "@/lib/portfolio/repo";
import { categorySchema, createImageSchema } from "@/lib/portfolio/validation";

export async function GET(request: Request) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const category = categorySchema.safeParse(new URL(request.url).searchParams.get("category"));
  if (!category.success) return jsonError("Unbekannte Kategorie.", 400);
  return Response.json(await listByCategory(getDb(), category.data));
}

export async function POST(request: Request) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const input = await readJson(request, createImageSchema);
  if ("response" in input) return input.response;
  try {
    return Response.json(await createImage(getDb(), getEnv().MEDIA, input.data), { status: 201 });
  } catch (error) {
    if (error instanceof PortfolioError) return jsonError(error.message, error.status);
    throw error;
  }
}
