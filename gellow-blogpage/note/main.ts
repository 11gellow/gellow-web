import { createApp, h } from 'vue';
import PostEditor from '../.vitepress/theme/components/PostEditor.vue';
import AmbientBackground from '../.vitepress/theme/components/AmbientBackground.vue';
import '../css/style.css';
import '../.vitepress/theme/vitepress-reset.css';

createApp({ render: () => [h(AmbientBackground), h(PostEditor, { online: true })] }).mount('#app');
