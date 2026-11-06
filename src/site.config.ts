import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'
import { profile } from './data/profile'

/** Personal site configuration. Keep template integrations opt-in. */
export const theme: ThemeUserConfig = {
  title: profile.name,
  author: profile.name,
  description: profile.bio,
  favicon: '/images/avatar.png',
  socialCard: '/images/social-card.png',
  locale: {
    lang: 'zh-CN',
    attrs: 'zh_CN',
    dateLocale: 'zh-CN',
    dateOptions: { year: 'numeric', month: 'short', day: 'numeric' }
  },
  logo: { src: '/images/avatar.png', alt: 'Aentro' },
  titleDelimiter: '·',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',
  head: [],
  customCss: [],
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Projects', link: '/projects' },
      { title: 'Links', link: '/links' },
      { title: 'About', link: '/about' }
    ]
  },
  footer: {
    year: `© ${new Date().getFullYear()} Aentro`,
    links: [],
    credits: false,
    social: [
      ...profile.social.map((social) => ({ ...social })),
      { icon: 'rss', label: 'RSS', href: '/rss.xml' }
    ]
  },
  content: {
    externalLinks: {
      content: ' ↗',
      properties: { style: 'user-select:none' }
    },
    blogPageSize: 8,
    share: []
  }
}

export const integ: IntegrationUserConfig = {
  links: {
    logbook: [],
    applyTip: [
      { name: '名称', val: profile.name },
      { name: '简介', val: profile.bio },
      { name: '链接', val: 'https://entropy622.github.io/' },
      { name: '头像', val: 'https://entropy622.github.io/images/avatar.png' }
    ],
    cacheAvatar: false
  },
  pagefind: false,
  quote: {
    server: 'https://dummyjson.com/quotes/random',
    target: `(data) => data.quote || ''`
  },
  typography: {
    class: 'prose text-base',
    blockquoteStyle: 'italic',
    inlineCodeBlockStyle: 'modern'
  },
  mediumZoom: {
    enable: true,
    selector: '.prose img',
    options: { className: 'zoomable' }
  },
  waline: {
    enable: false,
    showMeta: false,
    additionalConfigs: {}
  }
}

const config = { ...theme, integ } as Config
export default config
