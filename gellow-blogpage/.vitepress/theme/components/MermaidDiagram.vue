<script setup lang="ts">
import { onMounted, ref } from "vue";

const props = defineProps<{ code: string }>();
const host = ref<HTMLElement>();

onMounted(async () => {
  if (!host.value) return;
  const source = new TextDecoder().decode(Uint8Array.from(atob(props.code), (character) => character.charCodeAt(0)));
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
  const id = `mermaid-${Math.random().toString(36).slice(2)}`;
  const { svg } = await mermaid.render(id, source);
  host.value.innerHTML = svg;
});
</script>

<template><div ref="host" class="mermaid-diagram" aria-label="Mermaid diagram"></div></template>
