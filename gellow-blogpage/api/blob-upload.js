import { handleUpload } from "@vercel/blob/client";

const DEFAULT_MAX_ATTACHMENT_MB = 100;
const MAX_ATTACHMENT_SIZE =
  Number(process.env.BLOB_MAX_ATTACHMENT_MB || DEFAULT_MAX_ATTACHMENT_MB) *
  1024 *
  1024;

function sendJson(response, payload, status = 200) {
  if (response && typeof response.status === "function") {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return response.status(status).json(payload);
  }

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

  return (
    source
      .split("")
      .map((char) => ('<>:"/\\|?*'.includes(char) ? "_" : char))
      .join("")
      .trim() || "attachment"
  );
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
  if (/\.(docx?|pptx?|xlsx?)$/i.test(lower)) {
    return "office";
  }
  return "file";
}

async function readJsonBody(request) {
  if (request && typeof request.json === "function") {
    return request.json();
  }

  if (request?.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    if (response && typeof response.status === "function") {
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      return response.status(204).end();
    }
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
    return sendJson(response, { error: "method not allowed" }, 405);
  }

  try {
    const body = await readJsonBody(request);
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const filename = normalizeUploadFilename(payload.filename || pathname);
        const mimeType = String(payload.mimeType || "application/octet-stream");
        const size = Number(payload.size || 0);

        if (size > MAX_ATTACHMENT_SIZE) {
          throw new Error(
            `file is too large; current limit is ${Math.round(
              MAX_ATTACHMENT_SIZE / (1024 * 1024)
            )} MB`
          );
        }

        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_ATTACHMENT_SIZE,
          tokenPayload: JSON.stringify({
            filename,
            mimeType,
            size,
            kind: classifyAttachment(mimeType, filename),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("blob upload completed", blob.pathname, tokenPayload || "");
      },
    });

    return sendJson(response, jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "blob upload failed";
    return sendJson(response, { error: message }, 400);
  }
}
