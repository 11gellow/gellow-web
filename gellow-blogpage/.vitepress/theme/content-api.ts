export interface BlogPostRecord {
  id: number | null;
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  publishedAt?: string;
  updatedAt?: string;
}

export interface ContentSettings {
  featured_latest: string[];
  featured_home: string[];
  mission_notes_title: string;
  mission_notes_items: unknown[];
}

export interface AttachmentRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: "image" | "video" | "audio" | "pdf" | "office" | "file";
  url: string;
  downloadUrl: string;
  createdAt: string;
}

export interface PublicContent {
  posts: BlogPostRecord[];
  settings?: Partial<ContentSettings>;
}

const LOCAL_API_BASE = "http://127.0.0.1:5000";
const PROD_API_BASE = "https://warp.gellow.top";
const PUBLIC_CACHE_KEY = "__gellow_public_content_cache_v1";
const ADMIN_CACHE_KEY = "__gellow_admin_content_cache_v1";

function apiBase() {
  if (typeof window.GELLOW_CONTENT_API_BASE === "string" && window.GELLOW_CONTENT_API_BASE.trim()) {
    return window.GELLOW_CONTENT_API_BASE.trim().replace(/\/$/, "");
  }

  return ["", "127.0.0.1", "localhost"].includes(window.location.hostname)
    ? LOCAL_API_BASE
    : PROD_API_BASE;
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...options?.headers },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Request failed: ${response.status}`);
  return payload as T;
}

function readCache(key: string): PublicContent | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed?.data && typeof parsed.data === "object" ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: PublicContent) {
  try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* optional cache */ }
}

export function getCachedPublicContent(): PublicContent | null {
  return readCache(PUBLIC_CACHE_KEY);
}

export function getCachedAdminContent() { return readCache(ADMIN_CACHE_KEY); }

export function normalizeSettings(settings: Partial<ContentSettings> = {}): ContentSettings {
  return {
    featured_latest: Array.isArray(settings.featured_latest) ? settings.featured_latest : [],
    featured_home: Array.isArray(settings.featured_home) ? settings.featured_home : [],
    mission_notes_title: typeof settings.mission_notes_title === "string" && settings.mission_notes_title.trim() ? settings.mission_notes_title.trim() : "Mission Notes",
    mission_notes_items: Array.isArray(settings.mission_notes_items) ? settings.mission_notes_items : [],
  };
}

export function sortPosts(posts: BlogPostRecord[]) {
  return [...posts].sort((left, right) => {
    const leftTime = Date.parse(left.publishedAt || left.updatedAt || "") || 0;
    const rightTime = Date.parse(right.publishedAt || right.updatedAt || "") || 0;
    return rightTime - leftTime;
  });
}

export async function refreshPublicContent(): Promise<PublicContent> {
  const payload = await requestJson<PublicContent>("/api/content/public");
  writeCache(PUBLIC_CACHE_KEY, payload);
  return payload;
}

export async function refreshAdminContent(): Promise<PublicContent> {
  const payload = await requestJson<PublicContent>("/api/content/admin");
  writeCache(ADMIN_CACHE_KEY, payload);
  return payload;
}

function updateCaches(update: (content: PublicContent) => PublicContent) {
  for (const key of [PUBLIC_CACHE_KEY, ADMIN_CACHE_KEY]) {
    const cached = readCache(key);
    if (cached) writeCache(key, update(cached));
  }
}

export async function savePost(post: BlogPostRecord) {
  const payload = await requestJson<{ post: BlogPostRecord }>("/api/content/posts", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(post),
  });
  updateCaches((content) => ({ ...content, posts: sortPosts([payload.post, ...content.posts.filter((item) => item.id !== payload.post.id)]) }));
  return payload;
}

export async function deletePost(postId: number) {
  const payload = await requestJson<unknown>(`/api/content/posts/${postId}`, { method: "DELETE" });
  updateCaches((content) => ({ ...content, posts: content.posts.filter((item) => item.id !== postId) }));
  return payload;
}

export async function saveSettings(settings: ContentSettings) {
  const payload = await requestJson<{ settings: ContentSettings }>("/api/content/settings", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
  });
  updateCaches((content) => ({ ...content, settings: payload.settings }));
  return payload;
}

function classifyAttachment(type: string, name: string): AttachmentRecord["kind"] {
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name)) return "image";
  if (type.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)$/i.test(name)) return "video";
  if (type.startsWith("audio/") || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(name)) return "audio";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/\.(docx?|pptx?|xlsx?)$/i.test(name)) return "office";
  return "file";
}

export async function uploadAttachment(file: File): Promise<{ attachment: AttachmentRecord }> {
  const local = ["", "127.0.0.1", "localhost"].includes(location.hostname);
  if (local) {
    const body = new FormData(); body.append("file", file);
    const response = await fetch(`${apiBase()}/api/attachments`, { method: "POST", headers: { Accept: "application/json" }, body });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `Request failed: ${response.status}`);
    return payload;
  }
  const { upload } = await import("@vercel/blob/client");
  const filename = file.name.split(/[\\/]/).pop()?.replace(/[<>:"/\\|?*]/g, "_").trim() || "attachment";
  const pathname = `attachments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
  const blob = await upload(pathname, file, { access: "public", handleUploadUrl: "/api/blob-upload", multipart: file.size > 4 * 1024 * 1024, clientPayload: JSON.stringify({ filename, mimeType: file.type, size: file.size }) });
  return { attachment: { id: blob.pathname || pathname, filename, mimeType: file.type || "application/octet-stream", size: file.size, kind: classifyAttachment(file.type, filename), url: blob.url, downloadUrl: blob.downloadUrl || blob.url, createdAt: new Date().toISOString() } };
}

declare global {
  interface Window {
    GELLOW_CONTENT_API_BASE?: string;
    GellowFeedback?: {
      showToast(message: string, title?: string, variant?: string): void;
      showPendingToast?(message: string, title?: string): HTMLElement | null;
      resolvePendingToast?(toast: HTMLElement | null, message: string, title?: string, variant?: string): void;
      failPendingToast?(toast: HTMLElement | null, message: string, title?: string): void;
    };
  }
}
