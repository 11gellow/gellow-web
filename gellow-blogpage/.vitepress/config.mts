import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const loadingGateStyle = `
html.gellow-loading,
html.gellow-loading body {
  overflow: hidden;
}
html.gellow-loading body {
  background: #120d1f;
}
html.gellow-loading #app > :not(.page-loader):not(.toast-stack) {
  visibility: hidden !important;
}
html.gellow-loading .page-loader {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 60, 172, 0.2), transparent 24%),
    radial-gradient(circle at 82% 26%, rgba(41, 173, 255, 0.18), transparent 24%),
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    #120d1f;
  background-size: auto, auto, 24px 24px, 24px 24px, auto;
  color: #fff5cc;
}
html.gellow-loading .toast-stack {
  visibility: visible !important;
  z-index: 1200;
}
`;

const legacyEntries = ["assets", "css", "js", "notes/css", "notes/js"];

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function legacyDevServer() {
  return {
    name: "gellow-legacy-static-pages",
    configureServer(server: { middlewares: { use(handler: Function): void } }) {
      server.middlewares.use((request: { url?: string }, response: any, next: () => void) => {
        const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
        const isLegacyPath = [
          "/assets/",
          "/css/",
          "/js/",
          "/notes/css/",
          "/notes/js/",
        ].some((prefix) => pathname.startsWith(prefix));

        if (!isLegacyPath) return next();

        let source = resolve(projectRoot, `.${pathname}`);
        if (pathname.endsWith("/")) source = resolve(source, "index.html");
        if (!source.startsWith(`${projectRoot}${sep}`) || !existsSync(source) || !statSync(source).isFile()) {
          return next();
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", contentTypes[extname(source).toLowerCase()] || "application/octet-stream");
        response.end(readFileSync(source));
      });
    },
  };
}

function copyLegacyPages(outDir: string) {
  mkdirSync(outDir, { recursive: true });

  for (const entry of legacyEntries) {
    const source = resolve(projectRoot, entry);
    if (!existsSync(source)) continue;
    cpSync(source, resolve(outDir, entry), { recursive: true });
  }
}

export default defineConfig({
  lang: "zh-CN",
  title: "Gellow Blog",
  description: "KindGellow 的像素风个人博客",
  srcDir: "site",
  outDir: "dist",
  publicDir: false,
  cleanUrls: false,
  head: [
    ["script", {}, "document.documentElement.classList.add('gellow-loading')"],
    ["style", {}, loadingGateStyle],
    ["link", { rel: "icon", type: "image/png", href: "/assets/favicon.png" }],
  ],
  themeConfig: {},
  vite: {
    plugins: [legacyDevServer()],
  },
  buildEnd(siteConfig) {
    copyLegacyPages(siteConfig.outDir);
  },
});
