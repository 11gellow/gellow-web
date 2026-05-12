import { put } from "@vercel/blob";

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function normalizeUploadFilename(rawName) {
  const source = String(rawName || "").split(/[\\/]/).pop().trim();
  if (!source) {
    return "attachment";
  }

  return source
    .split("")
    .map((char) => ('<>:"/\\|?*'.includes(char) ? "_" : char))
    .join("")
    .trim() || "attachment";
}

function classifyAttachment(mimeType, filename) {
  const type = String(mimeType || "").toLowerCase();
  const lower = String(filename || "").toLowerCase();

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(lower)) {
    return "image";
  }
  if (type.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)$/i.test(lower)) {
    return "video";
  }
  if (type.startsWith("audio/") || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(lower)) {
    return "audio";
  }
  if (type === "application/pdf" || /\.pdf$/i.test(lower)) {
    return "pdf";
  }
  return "file";
}

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "file is required" }, 400);
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return json(
        { error: `file is too large; current limit is ${MAX_ATTACHMENT_SIZE / (1024 * 1024)} MB` },
        413
      );
    }

    const filename = normalizeUploadFilename(file.name);
    const key = `attachments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });

    return json(
      {
        attachment: {
          id: blob.pathname,
          filename,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          kind: classifyAttachment(file.type, filename),
          url: blob.url,
          createdAt: new Date().toISOString(),
        },
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "blob upload failed";
    return json({ error: message }, 500);
  }
}
