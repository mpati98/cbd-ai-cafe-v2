/** Ảnh phục vụ qua GET /api/images/:id local (cache-through từ dashboard — xem lib/sync.ts). */
export function imageUrl(id: string | null | undefined): string | undefined {
  return id ? `/api/images/${id}` : undefined;
}
