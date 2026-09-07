<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, watch } from "vue";
import arcadeDocument from "../../../arcade.html?raw";
import notesDocument from "../../../notes/index.html?raw";
import editorDocument from "../../../notes/editor.html?raw";
import displayDocument from "../../../notes/display.html?raw";

type LegacyPageKind = "notes" | "editor" | "display" | "arcade";

const props = defineProps<{ kind: LegacyPageKind }>();

const documents: Record<LegacyPageKind, string> = {
  notes: notesDocument,
  editor: editorDocument,
  display: displayDocument,
  arcade: arcadeDocument,
};

const titles: Record<LegacyPageKind, string> = {
  notes: "Gellow Notes Console",
  editor: "Gellow Post Editor",
  display: "Gellow Display Console",
  arcade: "Gellow Arcade",
};

function extractPageBody(documentSource: string, kind: LegacyPageKind) {
  if (kind === "arcade") {
    const start = documentSource.indexOf('<main class="arcade-app">');
    const end = documentSource.indexOf("</main>", start);
    return start >= 0 && end >= 0 ? documentSource.slice(start, end + "</main>".length) : "";
  }

  const start = documentSource.indexOf("<header");
  if (start < 0) return "";

  const pageBody = documentSource.slice(start);
  const toastStart = pageBody.search(/<div\s+class=["']toast-stack["']/i);
  const scriptStart = pageBody.search(/<script\s+src=/i);
  const end = toastStart >= 0 ? toastStart : scriptStart;
  return end >= 0 ? pageBody.slice(0, end) : pageBody;
}

const pageMarkup = computed(() => extractPageBody(documents[props.kind], props.kind));

let stylesheet: HTMLLinkElement | null = null;

function attachStylesheet() {
  stylesheet?.remove();
  stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = props.kind === "arcade" ? "/css/arcade.css" : "/notes/css/style.css";
  stylesheet.dataset.gellowPageStyle = props.kind;
  document.head.appendChild(stylesheet);
}

async function startLegacyPage() {
  document.title = titles[props.kind];
  attachStylesheet();
  await nextTick();

  if (props.kind === "arcade") {
    await import("../../../js/arcade.js");
    return;
  }

  await import("../../../js/content-api.js");
  if (props.kind === "notes") await import("../../../notes/js/main.js");
  if (props.kind === "editor") await import("../../../notes/js/editor.js");
  if (props.kind === "display") await import("../../../notes/js/display.js");
}

onMounted(() => void startLegacyPage());

watch(
  () => props.kind,
  () => void startLegacyPage(),
);

onUnmounted(() => {
  stylesheet?.remove();
  stylesheet = null;
  document.documentElement.style.removeProperty("overflow");
  document.body.style.removeProperty("overflow");
});
</script>

<template>
  <div class="legacy-vitepress-page" v-html="pageMarkup"></div>
</template>
