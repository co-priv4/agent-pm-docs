// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  // GitHub Pages の URL 構造（https://<org>.github.io/<repo>/）に合わせる
  site: 'https://co-priv4.github.io',
  base: '/agent-pm-docs/',

  integrations: [
    starlight({
      title: 'agent-pm',
      defaultLocale: 'root',
      locales: {
        root: { label: '日本語', lang: 'ja' },
      },
      social: [
        {
          icon: 'rocket',
          label: 'agent-pm 製品ページ',
          href: 'https://agent-pm-cli.lovable.app/',
        },
      ],
      sidebar: [
        {
          label: 'はじめに',
          items: [{ label: 'クイックスタート', slug: 'getting-started' }],
        },
        {
          label: 'ガイド',
          items: [
            { label: '機能ガイドブック', slug: 'guides/guide' },
            { label: '認証と権限', slug: 'guides/auth' },
            { label: 'ガント可視化', slug: 'guides/gantt-visual' },
            { label: '設定パターン', slug: 'guides/config-patterns' },
            { label: 'LLMバックエンド', slug: 'guides/llm-backend' },
            { label: 'システム設計', slug: 'guides/architecture' },
          ],
        },
      ],
    }),
  ],
});
