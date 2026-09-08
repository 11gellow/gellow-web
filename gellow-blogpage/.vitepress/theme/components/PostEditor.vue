<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
const props = defineProps<{ online?: boolean }>();
const previewDocument = ref('');
const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const form = reactive({ title: '', description: '', date: today, slug: '', body: '## 第一部分\n\n在这里开始写作。\n\n### 小节标题\n\n正文不需要重复写文章大标题。\n' });
const textarea = ref<HTMLTextAreaElement>();
const hint = ref('草稿仅保存在当前浏览器；导出后放入 site/posts，再通过 Git 发布。');
const previewUrl = ref('');
const busy = ref(false);
const dirty = ref(true);
const showSource = ref(false);
const width = ref('100%');
const errors = computed(() => [
  !form.title.trim() && '请填写文章标题',
  !form.description.trim() && '请填写文章简介',
  !/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0,10) !== form.date ? '请选择有效日期' : '',
  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) && 'slug 请使用小写英文、数字和连字符，例如 my-new-post',
  !form.body.trim() && '请填写正文',
].filter(Boolean));
// JSON quoted strings are valid YAML strings, including punctuation and newlines.
const markdown = computed(() => `---\npageKind: markdown-post\ntitle: ${JSON.stringify(form.title.trim())}\ndescription: ${JSON.stringify(form.description.trim())}\ndate: ${JSON.stringify(form.date)}\nslug: ${JSON.stringify(form.slug)}\noutline: [2, 3]\n---\n\n${form.body.trim()}\n`);
const filename = computed(() => `${form.date}-${form.slug}.md`);
const snippets: Record<string, string> = {
  '二级标题': '## 章节标题\n\n', '三级标题': '### 小节标题\n\n', '粗体': '**重点内容**',
  '引用': '> 引用内容\n\n', '列表': '- 第一项\n- 第二项\n\n',
  '任务列表': '- [x] 已完成\n- [ ] 待完成\n\n',
  '代码块': '```ts {2}\nconst message = "Hello Gellow";\nconsole.log(message);\n```\n\n',
  '代码组': '::: code-group\n\n```js [JavaScript]\nconsole.log("Hello");\n```\n\n```python [Python]\nprint("Hello")\n```\n\n:::\n\n',
  '表格': '| 名称 | 说明 |\n| --- | --- |\n| 示例 | 内容 |\n\n',
  '提示框': '::: tip 提示\n这里是提示内容。\n:::\n\n',
  '警告框': '::: warning 注意\n这里是注意事项。\n:::\n\n',
  '折叠块': '::: details 点击展开\n这里是折叠内容。\n:::\n\n',
  '公式': '$$\nE = mc^2\n$$\n\n',
  '流程图': '```mermaid\nflowchart LR\n  A[开始写作] --> B[预览] --> C[导出 Markdown]\n```\n\n',
  '图片': '![图片说明](../../assets/posts/example.png)\n\n',
  '链接': '[链接文字](https://example.com)',
  '脚注': '正文中的脚注[^note]。\n\n[^note]: 脚注说明。\n\n',
};
async function insert(name: string) {
  const input = textarea.value!;
  const start = input.selectionStart, end = input.selectionEnd;
  const text = (start > 0 && form.body[start-1] !== '\n' ? '\n\n' : '') + snippets[name];
  form.body = form.body.slice(0,start) + text + form.body.slice(end);
  await nextTick(); input.focus(); input.setSelectionRange(start+text.length,start+text.length);
}
function validate() { if (!errors.value.length) return true; hint.value = errors.value.join('；'); return false; }
async function preview() {
  if (!validate() || busy.value) return;
  busy.value = true;
  const snapshot = markdown.value;
  try {
    if (props.online) {
      const { renderPreviewDocument } = await import('../../../note/render-preview');
      const document = await renderPreviewDocument({ ...form });
      if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value);
      previewDocument.value = document;
      previewUrl.value = URL.createObjectURL(new Blob([document], { type: 'text/html;charset=utf-8' }));
      dirty.value = snapshot !== markdown.value;
      hint.value = '主题预览已更新。正文仅在浏览器中处理，不上传、不发布。';
      return;
    }
    const response = await fetch('/__local-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdown: snapshot }) });
    if (!response.ok) throw new Error(await response.text());
    previewUrl.value = `/posts/__local-draft.html?preview=${Date.now()}`;
    dirty.value = snapshot !== markdown.value;
    hint.value = '已更新真实文章预览。未发布、未修改任何正式文章。';
  } catch (error) { hint.value = `预览失败：${error instanceof Error ? error.message : error}`; }
  finally { busy.value = false; }
}
function download() {
  if (!validate()) return;
  const url = URL.createObjectURL(new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename.value; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  hint.value = `已导出 ${filename.value}，请放到 site/posts/。请检查同名文章，避免覆盖。`;
}
async function copy() {
  if (!validate()) return;
  try { await navigator.clipboard.writeText(markdown.value); hint.value = '完整 Markdown 已复制。'; }
  catch { showSource.value = true; hint.value = '剪贴板不可用，请在完整源码框中手动复制。'; }
}
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('gellow-local-markdown-draft') || 'null');
    if (saved) for (const key of Object.keys(form) as (keyof typeof form)[]) if (typeof saved[key] === 'string') form[key] = saved[key];
  } catch { hint.value = '本地草稿无法恢复，请及时导出备份。'; }
});
onBeforeUnmount(() => { if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value); });
watch(form, () => {
  dirty.value = true;
  try { localStorage.setItem('gellow-local-markdown-draft', JSON.stringify(form)); }
  catch { hint.value = '浏览器草稿保存失败，请导出 Markdown 备份。'; }
});
</script>

<template>
  <main class="local-editor" @click.stop>
    <header class="editor-heading"><div><small>GELLOW / {{ online ? 'NOTE STUDIO' : 'LOCAL STUDIO' }}</small><h1>文章格式生成器</h1><p>填写信息 → 编辑 Markdown → 查看主题效果 → 导出文件</p><p v-if="online" class="muted">无需登录 · 草稿仅保存在当前浏览器 · 不上传正文 · 不直接发布文章</p></div><a class="btn" :href="online ? 'https://blog.gellow.top/' : '/'">返回博客</a></header>
    <div class="editor-grid">
      <section class="editor-input pixel">
        <h2>文章信息</h2>
        <div class="metadata-grid">
          <label>文章标题 · title<input v-model="form.title" placeholder="我的新文章" /></label>
          <label>短名称 · slug<input v-model="form.slug" placeholder="my-new-post" spellcheck="false" /></label>
          <label>发布日期 · date<input v-model="form.date" type="date" /></label>
          <label class="description">列表简介 · description<textarea v-model="form.description" rows="2" placeholder="在文章列表显示的简介" /></label>
        </div>
        <h2>Markdown 正文</h2><p class="muted">使用二级、三级标题生成目录。点击模块，在光标位置插入示例；修改内容后更新预览。</p>
        <div class="module-toolbar"><button v-for="(_, name) in snippets" :key="name" @click="insert(name)">{{ name }}</button></div>
        <textarea ref="textarea" v-model="form.body" class="body-editor" aria-label="Markdown 正文" spellcheck="false" />
        <div class="editor-actions"><button class="primary" :disabled="busy" @click="preview">{{ busy ? '正在生成…' : '更新主题预览' }}</button><button @click="download">下载 .md</button><button @click="copy">复制 Markdown</button><button @click="showSource = !showSource">完整源码</button></div>
        <p role="status" class="muted">{{ hint }}</p>
        <textarea v-if="showSource" class="source-output" :value="markdown" readonly aria-label="完整 Markdown" />
      </section>
      <section class="preview-section">
        <div class="preview-heading"><h2>主题预览 <small>{{ dirty ? '· 有未预览修改' : '· 已更新' }}</small></h2><select v-model="width" aria-label="预览宽度"><option value="100%">自适应</option><option value="390px">手机 390px</option></select><a v-if="previewUrl" :href="previewUrl" target="_blank" rel="noopener">全屏预览 ↗</a></div>
        <div class="list-preview pixel"><small>文章列表卡片 · 信息预览</small><h2>{{ form.title || '文章标题' }}</h2><p>{{ form.description || '文章简介将显示在这里。' }}</p><time>{{ form.date }}</time></div>
        <iframe v-if="previewUrl" :key="previewUrl" :src="online ? undefined : previewUrl" :srcdoc="online ? previewDocument : undefined" :sandbox="online ? 'allow-scripts allow-popups' : undefined" :style="{ width }" title="真实博客文章预览" />
        <div v-else class="preview-empty pixel">填写文章信息后，点击「更新主题预览」。<br />{{ online ? '浏览器内 Markdown 渲染，复用博客主题样式，支持代码组、公式、流程图和目录。为安全起见不执行原始 HTML 或 Vue 组件。' : '使用博客同一套 VitePress 渲染器和文章组件。' }}<br />{{ online ? '相对图片路径预览指向已发布博客；新图片可先使用可信 HTTPS 图片链接。发布前仍请运行博客构建检查。' : '图片先放入 assets/posts，再使用相对路径引用。' }}</div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.local-editor { max-width: 1800px; margin: auto; padding: 36px 24px; color: #f5edff; }
.editor-heading, .preview-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.editor-heading { margin-bottom: 24px; }.editor-heading small { color: #7cffcb; letter-spacing: 3px; }
h1 { color: #ffe66d; font-size: 30px; } h2 { font-size: 19px; color: #ff91d5; margin: 16px 0; }
.editor-grid { display: grid; grid-template-columns: minmax(360px, 1fr) minmax(400px, 1.2fr); gap: 24px; align-items: start; }
.editor-input, .list-preview, .preview-empty { padding: 20px; background: #211733ed; }
.metadata-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } label { display: grid; gap: 8px; font-size: 13px; color: #c7bbdc; }.description { grid-column: 1 / -1; }
input, textarea, select { box-sizing: border-box; width: 100%; border: 1px solid #67507d; border-radius: 6px; background: #130e21; color: #f5edff; padding: 10px; font: inherit; } input:focus, textarea:focus { outline: 2px solid #7cffcb; }
.body-editor, .source-output { min-height: 360px; resize: vertical; font: 14px/1.7 Consolas, monospace; tab-size: 2; }
.module-toolbar, .editor-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
button { border: 1px solid #79608e; border-radius: 6px; background: #30213e; color: #f5edff; padding: 8px 12px; cursor: pointer; }button:hover { border-color: #ff91d5; background: #493051; }button:focus-visible { outline: 2px solid #7cffcb; }.primary { background: #ffe66d; color: #20142c; }button:disabled { opacity: .5; }
.muted, .preview-empty { color: #c1b5d4; font-size: 13px; line-height: 1.8; }.preview-heading h2 { margin-right: auto; }.preview-heading small { font-size: 12px; color: #bdb0cd; }.preview-heading select { width: auto; }.preview-heading a { color: #7cffcb; font-size: 13px; }
.list-preview { margin-bottom: 18px; }.list-preview small, time { color: #bdb0cd; font-size: 12px; }.list-preview h2 { color: #ffe66d; }.preview-empty { min-height: 260px; display: grid; align-content: center; text-align: center; }
iframe { display: block; max-width: 100%; height: 78vh; border: 1px solid #67507d; margin: auto; background: #120d1f; }
@media (max-width: 1000px) { .editor-grid { grid-template-columns: 1fr; }.local-editor { padding: 20px 12px; } }
</style>
