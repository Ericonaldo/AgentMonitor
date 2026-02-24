import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Agent Monitor',
  description: 'Web-based monitor for managing AI coding agents',
  base: '/docs/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/guide/' },
          { text: 'Configuration', link: '/guide/configuration' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Dashboard', link: '/guide/dashboard' },
          { text: 'Agent Chat', link: '/guide/agent-chat' },
          { text: 'Slash Commands', link: '/guide/slash-commands' },
          { text: 'Pipeline', link: '/guide/pipeline' },
          { text: 'Templates', link: '/guide/templates' },
          { text: 'Notifications', link: '/guide/notifications' },
          { text: 'Remote Access', link: '/guide/remote-access' },
          { text: 'i18n', link: '/guide/i18n' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'REST API', link: '/api/' },
          { text: 'Agents', link: '/api/agents' },
          { text: 'Pipeline Tasks', link: '/api/tasks' },
          { text: 'Templates', link: '/api/templates' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ericonaldo/AgentMonitor' },
    ],
  },
});
