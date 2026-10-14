export type OnboardStep = "setup" | "biometric" | "permissions" | "done";

export type Profile = {
  id: string;
  phone: string;
  email: string;
  full_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  color: string;
  lat: number | null;
  lon: number | null;
  accuracy: number;
  place_name: string;
  battery_level: number;
  battery_charging: boolean;
  last_seen: number;
  invites: number;
  is_premium: boolean;
  is_gold: boolean;
  is_owner: boolean;
  is_verified: boolean;
  lifetime_owner: boolean;
  role: "user" | "owner";
  is_ghost: boolean;
  ghost_expires_at: number | null;
  fake_lat: number | null;
  fake_lon: number | null;
  fake_enabled: boolean;
  share_battery: boolean;
  mood_auto: boolean;
  mood_text: string;
  fingerprint_id: string | null;
  face_descriptor: number[] | null;
  face_cipher: string | null;
  pin_hash: string | null;
  chat_lock: boolean;
  fingerprint_login: boolean;
  face_unlock: boolean;
  notifications: boolean;
  privacy_hide: boolean;
  data_saver: boolean;
  perm_location: boolean;
  perm_battery: boolean;
  perm_camera: boolean;
  onboard_step: OnboardStep;
  created_at: string;
  cloud_id: string | null;
  demo?: boolean;
  anchored?: boolean;
  speed: number;
};

export type FeedType = "post" | "reel" | "story" | "repost";

export type FeedItem = {
  id: string;
  userId: string;
  type: FeedType;
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "voice" | "none";
  place: string;
  lat: number | null;
  lon: number | null;
  audio: string;
  createdAt: number;
  expiresAt: number | null;
  likes: string[];
  shares: number;
  viewers: string[];
  originalId?: string;
};

export type Conversation = {
  id: string;
  isGroup: boolean;
  name: string;
  participantIds: string[];
  lastMessage: string;
  updatedAt: number;
  unread: number;
  createdBy: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: "text" | "image" | "video" | "voice" | "location" | "sos";
  mediaUrl: string;
  lat: number | null;
  lon: number | null;
  placeName: string;
  batteryLevel: number | null;
  accuracy: number | null;
  createdAt: number;
};

export type Comment = {
  id: string;
  userId: string;
  postId: string;
  text: string;
  createdAt: number;
};

export type LaundryOrder = {
  id: string;
  userId: string;
  location: string;
  clothesCount: number;
  price: number;
  ownerProfit: number;
  status: "pending" | "picked" | "done";
  pickupAt: string;
  timestamp: number;
};

export type Transaction = {
  id: string;
  userId: string;
  phone: string;
  place: string;
  refCode: string;
  amount: number;
  type: "Premium" | "Gold" | "Laundry" | "Ads";
  status: "success" | "pending";
  timestamp: number;
};

export type SosRequest = {
  id: string;
  from: string;
  to: string;
  lat: number | null;
  lon: number | null;
  placeName: string;
  batteryLevel: number;
  timestamp: number;
  status: "emergency";
};

export type HistoryPoint = {
  id: string;
  userId: string;
  lat: number;
  lon: number;
  place: string;
  timestamp: number;
};

export type AiTurn = { id: string; role: "user" | "assistant"; content: string; at: number };

export type OtpRecord = { phone: string; hash: string; exp: number; attempts: number };

export type DB = {
  meId: string | null;
  profiles: Profile[];
  posts: FeedItem[];
  conversations: Conversation[];
  messages: Message[];
  comments: Comment[];
  favorites: string[];
  laundry: LaundryOrder[];
  transactions: Transaction[];
  sos: SosRequest[];
  history: HistoryPoint[];
  ai: AiTurn[];
  creditedRefs: string[];
  trackCount: number;
  adImpressions: number;
  otp: OtpRecord | null;
  refPhone: string | null;
  lastUserId: string | null;
};

export type Phase =
  | "welcome"
  | "phone"
  | "otp"
  | "setup"
  | "biometric"
  | "permissions"
  | "returning"
  | "main";

export type TabId = "home" | "chat" | "feed" | "menu";

export type MenuId =
  | "hub"
  | "profile"
  | "battery"
  | "history"
  | "ghost"
  | "fake"
  | "shake"
  | "mood"
  | "sos"
  | "goldface"
  | "biometrics"
  | "laundry"
  | "premium"
  | "invite"
  | "ai"
  | "settings"
  | "about";

export const META_MARK = "\n\u2063radius:";

export function blankProfile(partial: Partial<Profile> & Pick<Profile, "id" | "phone">): Profile {
  return {
    email: "",
    full_name: "",
    username: "",
    bio: "",
    avatar_url: "",
    color: "#7B5AFF",
    lat: null,
    lon: null,
    accuracy: 12,
    place_name: "",
    battery_level: 100,
    battery_charging: false,
    last_seen: Date.now(),
    invites: 0,
    is_premium: false,
    is_gold: false,
    is_owner: false,
    is_verified: false,
    lifetime_owner: false,
    role: "user",
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
    onboard_step: "setup",
    created_at: new Date().toISOString(),
    cloud_id: null,
    speed: 0,
    ...partial,
  };
}
