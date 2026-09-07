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
html.gellow-loading #app > :not(.page-loader) {
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
  background: #120d1f;
  color: #fff5cc;
}
`;

const legacyEntries = ["assets", "css", "js", "notes", "arcade.html"];

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
        const isLegacyPath =
          pathname === "/arcade.html" ||
          ["/assets/", "/css/", "/js/", "/notes/"].some((prefix) => pathname.startsWith(prefix));

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
