import type { Category } from "@/lib/categories";
import { httpErrorFrom } from "@/lib/http-error";
import type { PortfolioImage, PortfolioRole } from "@/lib/portfolio/repo";

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  if (!response.ok) throw await httpErrorFrom(response, "Fehler");
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export type CardPatch = { visible?: boolean; altDe?: string | null; altEn?: string | null; role?: PortfolioRole | null };

export const portfolioApi = {
  list: (category: Category) => call<PortfolioImage[]>(`/admin/api/portfolio?category=${category}`),
  create: (input: { id: string; category: Category; width: number; height: number; color: string }) =>
    call<PortfolioImage>("/admin/api/portfolio", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, patch: CardPatch) =>
    call<PortfolioImage>(`/admin/api/portfolio/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => call<void>(`/admin/api/portfolio/${id}`, { method: "DELETE" }),
  reorder: (category: Category, ids: string[]) =>
    call<void>("/admin/api/portfolio/order", { method: "PUT", body: JSON.stringify({ category, ids }) }),
};
