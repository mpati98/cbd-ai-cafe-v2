/** Type client-safe cho địa điểm (khớp CachedLocation ở lib/location-cache.ts,
 * tách riêng vì file đó import lib/api.ts — server-only, không được kéo vào
 * Client Component). Dùng bởi TravelQuiz/TravelPassport qua GET /api/locations. */
export type TravelLocation = {
  id: string;
  name: string;
  description: string;
  category: string;
  bestTimeToVisit: string | null;
  relatedLocationIds: string[];
};
