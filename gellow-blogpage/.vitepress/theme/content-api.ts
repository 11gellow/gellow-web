export interface BlogPostRecord {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  publishedAt?: string;
  updatedAt?: string;
}

interface PublicContent {
  posts: BlogPostRecord[];
  settings?: Record<string, unknown>;
}

const LOCAL_API_BASE = "http://127.0.0.1:5000";
const PROD_API_BASE = "https://warp.gellow.top";
const PUBLIC_CACHE_KEY = "__gellow_public_content_cache_v1";

function apiBase() {
  if (typeof window.GELLOW_CONTENT_API_BASE === "string" && window.GELLOW_CONTENT_API_BASE.trim()) {
    return window.GELLOW_CONTENT_API_BASE.trim().replace(/\/$/, "");
  }

  return ["", "127.0.0.1", "localhost"].includes(window.location.hostname)
    ? LOCAL_API_BASE
    : PROD_API_BASE;
}

export function getCachedPublicContent(): PublicContent | null {
  try {
    const raw = localStorage.getItem(PUBLIC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data && typeof parsed.data === "object" ? parsed.data : null;
  } catch {
    return null;
  }
}

export function sortPosts(posts: BlogPostRecord[]) {
  return [...posts].sort((left, right) => {
    const leftTime = Date.parse(left.publishedAt || left.updatedAt || "") || 0;
    const rightTime = Date.parse(right.publishedAt || right.updatedAt || "") || 0;
    return rightTime - leftTime;
  });
}

export async function refreshPublicContent(): Promise<PublicContent> {
  const response = await fetch(`${apiBase()}/api/content/public`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  try {
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: payload }));
  } catch {
    // The page can continue without a local cache.
  }

  return payload;
}

declare global {
  interface Window {
    GELLOW_CONTENT_API_BASE?: string;
    GellowFeedback?: {
      showToast(message: string, title?: string, variant?: string): void;
    };
  }
}
