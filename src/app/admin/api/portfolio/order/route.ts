import { adminApiGuard } from "@/lib/auth/admin";
import { getDb } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import { PortfolioError, reorder } from "@/lib/portfolio/repo";
import { orderSchema } from "@/lib/portfolio/validation";

export async function PUT(request: Request) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const input = await readJson(request, orderSchema);
  if ("response" in input) return input.response;
  try {
    await reorder(getDb(), input.data.category, input.data.ids);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof PortfolioError) return jsonError(error.message, error.status);
    throw error;
  }
}
