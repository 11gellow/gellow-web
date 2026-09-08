import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import katex from 'katex';
import DOMPurify from 'dompurify';
import { createHighlighter } from 'shiki';
import baseStyles from '../css/style.css?inline';
import markdownStyles from '../.vitepress/theme/vitepress-reset.css?inline';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const highlighter = createHighlighter({ themes: ['github-dark'], langs: ['javascript','typescript','python','json','html','css','bash','markdown','sql','rust','yaml'] });
const previewScript = `
document.querySelectorAll('.vp-code-group').forEach(group => {
  const tabs = group.querySelector('.tabs');
  const blocks = [...group.querySelector('.blocks').children];
  blocks.forEach((block, i) => {
    const button = document.createElement('button');
    button.textContent = block.dataset.codeTitle || '代码 ' + (i+1);
    button.onclick = () => blocks.forEach((item, j) => { item.style.display = j === i ? 'block' : 'none'; tabs.children[j].classList.toggle('active',j === i); });
    tabs.append(button);
    block.style.display = i === 0 ? 'block' : 'none'; if (i === 0) button.classList.add('active');
  });
});
const headings = [...document.querySelectorAll('.markdown-body h2[id],.markdown-body h3[id]')];
const panel = document.querySelector('.markdown-outline');
const nav = panel.querySelector('nav');
headings.forEach(heading => {
  const link = document.createElement('a'); link.textContent = heading.textContent;
  link.href = '#' + heading.id; if (heading.tagName === 'H3') link.className = 'nested';
  nav.append(link);
});
if (!headings.length) panel.hidden = true;
document.querySelectorAll('a[href^="#"]').forEach(link => { link.onclick = event => { event.preventDefault(); const id = link.getAttribute('href').slice(1); (document.getElementById(id) || document.getElementById(decodeURIComponent(id)))?.scrollIntoView({behavior:'smooth'}); }; });
let lastY = 0;
function reading() {
  const y = scrollY;
  const max = document.documentElement.scrollHeight-innerHeight;
  const progress = max > 0 ? Math.min(1,y/max) : 1;
  document.querySelector('.reading-progress > div').style.clipPath = 'inset(0 ' + ((1-progress)*100) + '% 0 0)';
  document.querySelector('.reading-header').classList.toggle('is-hidden',y > 60 && y > lastY); lastY = y;
  let index = 0;
  headings.forEach((heading,i) => { if (heading.getBoundingClientRect().top <= innerHeight*.18) index=i; });
  [...nav.children].forEach((link,i) => link.classList.toggle('active',i===index));
  const active = nav.children[index];
  if (active) { const a = active.getBoundingClientRect(), b = nav.getBoundingClientRect(); if(a.top < b.top || a.bottom > b.bottom) nav.scrollTop += a.top-b.top-nav.clientHeight/2; }
}
addEventListener('scroll',reading,{passive:true}); addEventListener('resize',reading); reading();
`;

export async function renderPreviewDocument(form: { title: string; description: string; slug: string; date: string; body: string }) {
  const syntax = await highlighter;
  const diagrams: string[] = [];
  const md = new MarkdownIt({ html: false, linkify: true });
  md.use(anchor, { level: [2,3], slugify: (text: string) => encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g,'-')) });
  md.use(footnote).use(taskLists, { enabled: true, label: true, labelAfter: true });
  const formula = (source: string, displayMode: boolean) => katex.renderToString(source, { displayMode, output: 'mathml', throwOnError: false, trust: false }).replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/g, '');
  md.inline.ruler.before('escape','note_math',(state: any, silent: boolean) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos+1] === '$') return false;
    const end = state.src.indexOf('$',state.pos+1);
    if (end < 0 || !state.src.slice(state.pos+1,end).trim()) return false;
    if (!silent) { const token = state.push('note_math','math',0); token.content = state.src.slice(state.pos+1,end); }
    state.pos = end+1; return true;
  });
  md.renderer.rules.note_math = (tokens: any[], index: number) => formula(tokens[index].content,false);
  md.block.ruler.before('fence','note_math_block',(state: any, start: number, end: number, silent: boolean) => {
    const first = state.src.slice(state.bMarks[start]+state.tShift[start],state.eMarks[start]).trim();
    if (!first.startsWith('$$')) return false;
    if (silent) return true;
    let content = first.slice(2), next = start+1;
    if (content.endsWith('$$')) content = content.slice(0,-2);
    else {
      let closed = false;
      for (;next<end;next++) {
        const line = state.src.slice(state.bMarks[next]+state.tShift[next],state.eMarks[next]);
        if (line.trim().endsWith('$$')) { content += '\n'+line.trimEnd().slice(0,-2); next++; closed=true; break; }
        content += '\n'+line;
      }
      if (!closed) return false;
    }
    const token = state.push('note_math_block','math',0); token.content = content; state.line=next; return true;
  });
  md.renderer.rules.note_math_block = (tokens: any[], index: number) => formula(tokens[index].content,true);
  for (const name of ['tip','info','warning','danger','details']) {
    md.use(container,name,{ render(tokens: any[], index: number) {
      if (tokens[index].nesting < 0) return name === 'details' ? '</details>\n' : '</div>\n';
      const title = escape(tokens[index].info.trim().slice(name.length).trim() || name.toUpperCase());
      return name === 'details' ? `<details class="custom-block details"><summary>${title}</summary>\n` : `<div class="custom-block ${name}"><p class="custom-block-title">${title}</p>\n`;
    }});
  }
  md.use(container,'code-group',{ render(tokens: any[], index: number) { return tokens[index].nesting > 0 ? '<div class="vp-code-group"><div class="tabs"></div><div class="blocks">\n' : '</div></div>\n'; } });
  md.renderer.rules.fence = (tokens: any[], index: number) => {
    const token = tokens[index], info = token.info.trim();
    if (info === 'mermaid') { diagrams.push(token.content); return `<div data-diagram="${diagrams.length-1}"></div>`; }
    const requested = info.split(/[\s{\[]/)[0] || 'text';
    const aliases: Record<string,string> = { js:'javascript',ts:'typescript',py:'python',sh:'bash',yml:'yaml',vue:'html' };
    const language = aliases[requested] || requested;
    const lang = syntax.getLoadedLanguages().includes(language) ? language : 'text';
    let html = syntax.codeToHtml(token.content.replace(/\n$/,''), { lang, theme:'github-dark' });
    let line = 0;
    const ranges = info.match(/\{([\d,\s-]+)\}/)?.[1].split(',') || [];
    html = html.replace(/class="line"/g, () => {
      line++;
      const highlighted = ranges.some((range: string) => { const [a,b] = range.trim().split('-').map(Number); return line>=a && line<=(b||a); });
      return `class="line${highlighted ? ' highlighted' : ''}"`;
    });
    const numbers = Array.from({length:line},(_,i)=>`<span class="line-number">${i+1}</span><br>`).join('');
    return `<div class="language-${escape(requested)} line-numbers-mode" data-code-title="${escape(info.match(/\[([^\]]+)\]/)?.[1] || requested)}"><span class="lang">${escape(requested)}</span>${html}<div class="line-numbers-wrapper" aria-hidden="true">${numbers}</div></div>\n`;
  };
  let rendered = md.render(form.body);
  if (diagrams.length) {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad:false, theme:'dark', securityLevel:'strict', flowchart: { htmlLabels: false } });
    for (let i=0;i<diagrams.length;i++) {
      try {
        const { svg } = await mermaid.render('note-diagram-'+Date.now()+'-'+i,diagrams[i]);
        rendered = rendered.replace(`<div data-diagram="${i}"></div>`,`<div class="mermaid-diagram">${svg}</div>`);
      } catch { rendered = rendered.replace(`<div data-diagram="${i}"></div>`,'<p class="custom-block danger">流程图语法错误，请检查 Mermaid 内容。</p>'); }
    }
  }
  // Never execute user HTML/Vue. Strip event handlers and unsafe URLs before previewing.
  const safe = DOMPurify.sanitize(rendered, { ADD_TAGS:['mjx-container'], ADD_ATTR:['target'] });
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><base href="https://blog.gellow.top/posts/"><title>${escape(form.title)} · Gellow Preview</title><style>${baseStyles}\n${markdownStyles}\n.vp-code-group .tabs{display:flex;gap:8px;padding:10px}.vp-code-group .tabs button{border:0;background:none;color:#bbb;padding:8px;cursor:pointer}.vp-code-group .tabs button.active{color:#ffe66d;border-bottom:2px solid #ff91d5}.mermaid-diagram svg{max-width:100%;height:auto}body{background-attachment:fixed}.markdown-outline[hidden]{display:none}</style></head><body><header class="fusion-header reading-header"><div class="wrap fusion-nav"><div class="fusion-brand"><div class="fusion-kicker">markdown / preview</div><h1 class="title">${escape(form.title)}</h1></div></div><div class="reading-progress"><div></div></div></header><main class="wrap markdown-post-layout"><article class="post-detail markdown-post pixel"><div class="blog-entry-meta"><span class="tag">${escape(form.slug)}</span><time class="date">${escape(form.date)}</time></div><p class="markdown-summary">${escape(form.description)}</p><div class="post-detail-content markdown-body">${safe}</div></article><aside class="markdown-outline pixel"><div class="notes-panel-kicker">On This Page</div><h2>文章目录</h2><nav></nav></aside></main><footer class="fusion-footer">Gellow Note · 浏览器本地预览</footer><script>${previewScript}</script></body></html>`;
}
