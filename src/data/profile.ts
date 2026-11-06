const education = '香港中文大学（深圳）计算机科学与技术本科生。'
const interests = ['游戏开发', '图形', 'Agent', 'Web'] as const

/** Public identity shared by the homepage, About, metadata and terminal. */
export const profile = {
  name: 'Aentro',
  alias: '回首空城',
  education,
  interests,
  bio: `${education}关注${interests.join('、')}。`,
  focus: interests.join(' / '),
  social: [
    { icon: 'bilibili', label: 'Bilibili', href: 'https://space.bilibili.com/396797468' },
    { icon: 'github', label: 'GitHub', href: 'https://github.com/entropy622' }
  ] as const
}
