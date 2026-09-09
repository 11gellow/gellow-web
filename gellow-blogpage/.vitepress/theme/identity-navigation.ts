export interface IdentityEntry {
  id: string;
  label: string;
  description: string;
  action?: 'home' | 'blog';
  href?: string;
}

// Add an entry with href for future pages, or add a handled action for local views.
export const identityEntries: IdentityEntry[] = [
  { id: 'home', label: 'HOME', description: '返回欢迎首页', action: 'home' },
  { id: 'blog', label: 'BLOG', description: '浏览文章列表', action: 'blog' },
  { id: 'note', label: 'NOTE', description: '浏览学习笔记', href: '/note.html' },
  { id: 'links', label: 'LINKS', description: '浏览链接收藏', href: '/links.html' },
];
