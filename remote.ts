import { getSupabase, isOwnerEmail } from "./supabase";
import { META_MARK, type Comment, type DB, type FeedItem, type Profile } from "./types";

export type RemoteMeta = Partial<Profile> & { phone?: string };

export function packBio(bio: string, meta: RemoteMeta) {
  const clean = bio.split(META_MARK)[0] ?? "";
  return `${clean}${META_MARK}${JSON.stringify(meta)}`;
}

export function unpackBio(raw: string | null | undefined): { bio: string; meta: RemoteMeta } {
  const text = raw || "";
  const i = text.indexOf(META_MARK);
  if (i < 0) return { bio: text, meta: {} };
  try {
    return { bio: text.slice(0, i), meta: JSON.parse(text.slice(i + META_MARK.length)) as RemoteMeta };
  } catch {
    return { bio: text.slice(0, i), meta: {} };
  }
}

type Row = Record<string, unknown>;

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function pullRemote(db: DB): Promise<DB> {
  const sb = getSupabase();
  const next: DB = {
    ...db,
    profiles: [...db.profiles],
    posts: [...db.posts],
    comments: [...db.comments],
  };
  const { data: people, error: pErr } = await sb
    .from("profiles")
    .select("id,username,full_name,avatar_url,bio,created_at");
  if (pErr || !people) return db;
  for (const row of people as Row[]) {
    const id = asString(row.id);
    if (!id) continue;
    const unpacked = unpackBio(asString(row.bio));
    const meta = unpacked.meta;
    const email = asString(meta.email);
    const existing = next.profiles.find((p) => p.cloud_id === id || p.id === id);
    const merged: Profile = {
      ...(existing || {
        id,
        phone: asString(meta.phone),
        email,
        full_name: asString(row.full_name),
        username: asString(row.username),
        bio: unpacked.bio,
        avatar_url: asString(row.avatar_url),
        color: "#7B5AFF",
        lat: null,
        lon: null,
        accuracy: 20,
        place_name: "",
        battery_level: 0,
        battery_charging: false,
        last_seen: Date.now(),
        invites: 0,
        is_premium: false,
        is_gold: false,
        is_owner: isOwnerEmail(email),
        is_verified: isOwnerEmail(email),
        lifetime_owner: isOwnerEmail(email),
        role: isOwnerEmail(email) ? "owner" : "user",
        is_ghost: false,
        ghost_expires_at: null,
        fake_lat: null,
        fake_lon: null,
        fake_enabled: false,
        share_battery: true,
        mood_auto: true,
        mood_text: "",
        fingerprint_id: null,
        face_descriptor: null,
        face_cipher: null,
        pin_hash: null,
        chat_lock: false,
        fingerprint_login: false,
        face_unlock: false,
        notifications: false,
        privacy_hide: false,
        data_saver: false,
        perm_location: false,
        perm_battery: false,
        perm_camera: false,
        onboard_step: "done",
        created_at: asString(row.created_at) || new Date().toISOString(),
        cloud_id: id,
        speed: 0,
      }),
      full_name: asString(row.full_name) || existing?.full_name || "RADIUS",
      username: asString(row.username) || existing?.username || "user",
      bio: unpacked.bio,
      avatar_url: asString(row.avatar_url) || existing?.avatar_url || "",
      cloud_id: id,
    };
    if (meta.phone) merged.phone = meta.phone;
    if (typeof meta.lat === "number") merged.lat = meta.lat;
    if (typeof meta.lon === "number") merged.lon = meta.lon;
    if (typeof meta.battery_level === "number") merged.battery_level = meta.battery_level;
    if (typeof meta.battery_charging === "boolean") merged.battery_charging = meta.battery_charging;
    if (typeof meta.place_name === "string") merged.place_name = meta.place_name;
    if (typeof meta.is_ghost === "boolean") merged.is_ghost = meta.is_ghost;
    if (typeof meta.fake_enabled === "boolean") merged.fake_enabled = meta.fake_enabled;
    if (typeof meta.fake_lat === "number") merged.fake_lat = meta.fake_lat;
    if (typeof meta.fake_lon === "number") merged.fake_lon = meta.fake_lon;
    if (typeof meta.invites === "number") merged.invites = meta.invites;
    if (meta.is_gold) merged.is_gold = true;
    if (meta.is_premium) merged.is_premium = true;
    if (meta.is_owner || isOwnerEmail(email)) {
      merged.is_owner = true;
      merged.lifetime_owner = true;
      merged.is_verified = true;
      merged.role = "owner";
    }
    if (existing) Object.assign(existing, merged);
    else next.profiles.push(merged);
  }

  const { data: posts } = await sb
    .from("posts")
    .select("id,user_id,caption,image_url,created_at")
    .order("created_at", { ascending: false });
  for (const row of (posts || []) as Row[]) {
    const id = asString(row.id);
    if (!id || next.posts.some((p) => p.id === id)) continue;
    next.posts.push({
      id,
      userId: asString(row.user_id),
      type: "post",
      caption: asString(row.caption),
      mediaUrl: asString(row.image_url),
      mediaType: asString(row.image_url) ? "image" : "none",
      place: "",
      lat: null,
      lon: null,
      audio: "",
      createdAt: Date.parse(asString(row.created_at)) || Date.now(),
      expiresAt: null,
      likes: [],
      shares: 0,
      viewers: [],
    });
  }
  const { data: reels } = await sb.from("reels").select("id,user_id,video_url,caption,created_at");
  for (const row of (reels || []) as Row[]) {
    const id = asString(row.id);
    if (!id || next.posts.some((p) => p.id === id)) continue;
    next.posts.push({
      id,
      userId: asString(row.user_id),
      type: "reel",
      caption: asString(row.caption),
      mediaUrl: asString(row.video_url),
      mediaType: "video",
      place: "",
      lat: null,
      lon: null,
      audio: "Original audio",
      createdAt: Date.parse(asString(row.created_at)) || Date.now(),
      expiresAt: null,
      likes: [],
      shares: 0,
      viewers: [],
    });
  }
  const { data: stories } = await sb
    .from("stories")
    .select("id,user_id,image_url,video_url,created_at,expires_at");
  for (const row of (stories || []) as Row[]) {
    const id = asString(row.id);
    if (!id || next.posts.some((p) => p.id === id)) continue;
    const video = asString(row.video_url);
    const image = asString(row.image_url);
    next.posts.push({
      id,
      userId: asString(row.user_id),
      type: "story",
      caption: "",
      mediaUrl: video || image,
      mediaType: video ? "video" : "image",
      place: "",
      lat: null,
      lon: null,
      audio: "",
      createdAt: Date.parse(asString(row.created_at)) || Date.now(),
      expiresAt: Date.parse(asString(row.expires_at)) || Date.now() + 86400000,
      likes: [],
      shares: 0,
      viewers: [],
    });
  }
  const { data: likes } = await sb.from("likes").select("user_id,post_id,reel_id");
  for (const row of (likes || []) as Row[]) {
    const pid = asString(row.post_id) || asString(row.reel_id);
    const uid = asString(row.user_id);
    const post = next.posts.find((p) => p.id === pid);
    if (post && uid && !post.likes.includes(uid)) post.likes.push(uid);
  }
  const { data: comments } = await sb.from("comments").select("id,user_id,post_id,reel_id,comment,created_at");
  for (const row of (comments || []) as Row[]) {
    const id = asString(row.id);
    if (!id || next.comments.some((c) => c.id === id)) continue;
    const comment: Comment = {
      id,
      userId: asString(row.user_id),
      postId: asString(row.post_id) || asString(row.reel_id),
      text: asString(row.comment),
      createdAt: Date.parse(asString(row.created_at)) || Date.now(),
    };
    next.comments.push(comment);
  }
  return next;
}

export async function pushProfile(p: Profile) {
  if (!p.cloud_id) return { ok: false as const, error: "No cloud session" };
  const sb = getSupabase();
  const meta: RemoteMeta = {
    phone: p.phone,
    email: p.email,
    lat: p.is_ghost ? null : p.fake_enabled ? p.fake_lat : p.lat,
    lon: p.is_ghost ? null : p.fake_enabled ? p.fake_lon : p.lon,
    accuracy: p.accuracy,
    place_name: p.place_name,
    battery_level: p.share_battery ? p.battery_level : undefined,
    battery_charging: p.share_battery ? p.battery_charging : undefined,
    is_ghost: p.is_ghost,
    ghost_expires_at: p.ghost_expires_at,
    fake_enabled: p.fake_enabled,
    fake_lat: p.fake_lat,
    fake_lon: p.fake_lon,
    invites: p.invites,
    is_premium: p.is_premium,
    is_gold: p.is_gold,
    is_owner: p.is_owner,
    is_verified: p.is_verified || p.is_owner,
    lifetime_owner: p.lifetime_owner,
    role: p.role,
    last_seen: p.privacy_hide ? undefined : p.last_seen,
  };
  const avatar = p.avatar_url.startsWith("data:") ? p.avatar_url.slice(0, 160000) : p.avatar_url;
  const { error } = await sb.from("profiles").upsert({
    id: p.cloud_id,
    username: p.username || p.phone.replace("+", ""),
    full_name: p.full_name || p.username || "RADIUS",
    avatar_url: avatar || null,
    bio: packBio(p.bio || "", meta),
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function pushFeedItem(item: FeedItem, cloudId: string) {
  const sb = getSupabase();
  if (item.type === "reel") {
    const { error } = await sb.from("reels").insert({
      id: item.id,
      user_id: cloudId,
      video_url: item.mediaUrl.startsWith("data:") ? null : item.mediaUrl,
      caption: item.caption,
    });
    return error ? error.message : null;
  }
  if (item.type === "story") {
    const { error } = await sb.from("stories").insert({
      id: item.id,
      user_id: cloudId,
      image_url: item.mediaType === "image" ? item.mediaUrl : null,
      video_url: item.mediaType === "video" ? item.mediaUrl : null,
      expires_at: new Date(item.expiresAt || Date.now() + 86400000).toISOString(),
    });
    return error ? error.message : null;
  }
  const { error } = await sb.from("posts").insert({
    id: item.id,
    user_id: cloudId,
    caption: item.caption,
    image_url: item.mediaUrl || null,
  });
  return error ? error.message : null;
}

export async function pushLike(post: FeedItem, userId: string, add: boolean) {
  const sb = getSupabase();
  const col = post.type === "reel" ? "reel_id" : "post_id";
  if (!add) {
    await sb.from("likes").delete().eq("user_id", userId).eq(col, post.id);
    return;
  }
  await sb.from("likes").insert({ user_id: userId, [col]: post.id });
}

export async function pushComment(post: FeedItem, userId: string, id: string, text: string) {
  const sb = getSupabase();
  const col = post.type === "reel" ? "reel_id" : "post_id";
  await sb.from("comments").insert({ id, user_id: userId, [col]: post.id, comment: text });
}

export async function deleteRemotePost(id: string) {
  const sb = getSupabase();
  await sb.from("posts").delete().eq("id", id);
  await sb.from("reels").delete().eq("id", id);
  await sb.from("stories").delete().eq("id", id);
}

export async function deleteRemoteProfile(id: string) {
  const sb = getSupabase();
  await sb.from("profiles").delete().eq("id", id);
}
