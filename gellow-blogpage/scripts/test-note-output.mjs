import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = path => fs.readFileSync(new URL('../dist/' + path, import.meta.url), 'utf8');
const note = read('note.html');
const blog = read('index.html');
const cards = html => [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(match => match[1]).join('\n');
for (const file of ['2026-09-07-MeowMeowLOL', '2026-09-05-ai小文章', '2026-09-05-记录一下']) {
  const article = read('posts/' + file + '.html');
  assert(article.includes('Back To Note'));
}
assert.equal((note.match(/class="blog-entry pixel"/g) || []).length, 3);
for (const title of ['LangChain', 'PROMPT', '>LLM<']) {
  assert(cards(note).toLowerCase().includes(title.toLowerCase()));
  assert(!cards(blog).toLowerCase().includes(title.toLowerCase()));
}
console.log('PASS: three notes migrated, absent from blog, old URLs render with Note return links.');
