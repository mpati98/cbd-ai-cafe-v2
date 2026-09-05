export function imageUrl(id: string | null | undefined): string | undefined {
  return id ? `/api/images/${id}` : undefined;
}
