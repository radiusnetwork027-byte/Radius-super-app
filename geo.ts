import type { Profile } from "./types";

export const ABUJA = { lat: 9.0765, lon: 7.3986 };

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number) {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))}m away`;
  return `${km.toFixed(km < 10 ? 1 : 0)}km away`;
}

export function formatAgo(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d`;
}

export function normalizeNgPhone(input: string): string | null {
  let n = input.replace(/\D/g, "");
  if (n.startsWith("234")) n = n.slice(3);
  if (n.startsWith("0")) n = n.slice(1);
  if (!/^[7-9]\d{9}$/.test(n)) return null;
  return `+234${n}`;
}

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function publicPoint(p: Profile, now = Date.now()) {
  const ghost = p.is_ghost && !!p.ghost_expires_at && p.ghost_expires_at > now;
  if (ghost) return null;
  if (p.fake_enabled && p.fake_lat != null && p.fake_lon != null) {
    return { lat: p.fake_lat, lon: p.fake_lon, accuracy: 30, fake: true };
  }
  if (p.lat == null || p.lon == null) return null;
  return { lat: p.lat, lon: p.lon, accuracy: p.accuracy || 20, fake: false };
}

const placeCache = new Map<string, string>();

export async function getPlaceName(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = placeCache.get(key);
  if (hit) return hit;
  try {
    const nom = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { Accept: "application/json" } },
    );
    if (nom.ok) {
      const data = (await nom.json()) as { display_name?: string; address?: Record<string, string> };
      const addr = data.address || {};
      const short = [addr.suburb, addr.neighbourhood, addr.city || addr.town || addr.state]
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      const name = short || data.display_name?.split(",").slice(0, 2).join(", ") || "";
      if (name) {
        placeCache.set(key, name);
        return name;
      }
    }
  } catch {
    /* CORS or network — fall through */
  }
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (res.ok) {
      const data = (await res.json()) as {
        locality?: string;
        city?: string;
        principalSubdivision?: string;
        countryName?: string;
      };
      const name = [data.locality || data.city, data.principalSubdivision || data.countryName]
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      if (name) {
        placeCache.set(key, name);
        return name;
      }
    }
  } catch {
    /* ignore */
  }
  return "Nearby";
}

export function batteryTone(level: number): "ok" | "warn" | "danger" {
  if (level < 20) return "danger";
  if (level < 50) return "warn";
  return "ok";
}

export function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Script failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.setAttribute("data-loaded", "1");
      resolve();
    };
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(s);
  });
}

export async function fileToDataUrl(file: Blob, max = 1080, quality = 0.72) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export function uid() {
  return crypto.randomUUID();
}

export function moodLine(p: {
  battery_charging: boolean;
  battery_level: number;
  speed: number;
  place_name: string;
  share_battery: boolean;
}) {
  const hour = new Date().getHours();
  let activity = "😊 Happy";
  if (p.battery_charging) activity = "⚡ Charging";
  else if (p.battery_level < 15) activity = "🔋 Low battery";
  else if (p.speed > 15) activity = "🚗 Driving";
  else if ((hour >= 23 || hour < 5) && p.speed < 1) activity = "😴 Sleeping";
  else if (/gym/i.test(p.place_name)) activity = "💪 Gym";
  else if (/church|mosque|masjid/i.test(p.place_name)) activity = "🙏 Worship";
  const place = (p.place_name || "Nearby").split(",")[0]?.trim() || "Nearby";
  const bat = p.share_battery ? `Battery ${Math.round(p.battery_level)}%` : "Battery private";
  return `${activity} · ${bat} · ${place}`;
}
