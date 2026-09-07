import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import MermaidDiagram from "./components/MermaidDiagram.vue";
import "../../css/style.css";
import "../../css/arcade.css";
import "./vitepress-reset.css";

export default {
  Layout,
  enhanceApp({ app }) {
    app.component("MermaidDiagram", MermaidDiagram);
  },
} satisfies Theme;
