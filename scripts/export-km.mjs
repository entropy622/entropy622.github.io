#!/usr/bin/env node
/**
 * Export a built Astro blog post (`dist/blog/<slug>/index.html`) into a
 * self-contained, offline-ready HTML folder and ZIP archive suitable for
 * Tencent KM HTML upload (root `index.html`, pure-ASCII filenames,
 * single file <= 20 MB, total ZIP <= 50 MB, zero root-absolute paths).
 *
 * Usage:
 *   npm run export:km -- <slug> [--out <dir>] [--brand <text>] [--sub <text>] [--build] [--max-mb <n>] [--max-single-mb <n>]
 */

import { execFileSync, execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'
import { deflateRawSync } from 'node:zlib'

const SITE_ROOT = process.cwd()
const DIST_DIR = join(SITE_ROOT, 'dist')

function parseArgs(argv) {
  const opts = {
    slug: '',
    outDir: join(SITE_ROOT, 'exports'),
    brand: 'TECH REPORT',
    sub: 'TECHNICAL<br>ARTICLE',
    hudLabel: '技术分享',
    hudCode: 'TECH-REPORT',
    maxMb: 50,
    maxSingleMb: 20,
    build: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--build') opts.build = true
    else if (arg === '--out' && argv[i + 1]) opts.outDir = resolve(argv[++i])
    else if (arg === '--brand' && argv[i + 1]) opts.brand = argv[++i]
    else if (arg === '--sub' && argv[i + 1]) opts.sub = argv[++i]
    else if (arg === '--hud-label' && argv[i + 1]) opts.hudLabel = argv[++i]
    else if (arg === '--hud-code' && argv[i + 1]) opts.hudCode = argv[++i]
    else if (arg === '--max-mb' && argv[i + 1]) opts.maxMb = Number(argv[++i])
    else if (arg === '--max-single-mb' && argv[i + 1]) opts.maxSingleMb = Number(argv[++i])
    else if (arg === '-h' || arg === '--help') {
      console.log(
        [
          'Usage: npm run export:km -- <slug> [options]',
          '',
          'Options:',
          '  --build               Run `npm run build` before exporting',
          '  --out <dir>           Output directory (default: ./exports)',
          '  --brand <text>        Top-left header brand text (default: TECH REPORT)',
          '  --sub <text>          Top-left header subtitle (default: TECHNICAL<br>ARTICLE)',
          '  --hud-label <text>    Top-left HUD label (default: 技术分享)',
          '  --hud-code <text>     Top-right HUD code (default: TECH-REPORT)',
          '  --max-mb <n>          Max allowed total ZIP size in MB (default: 50)',
          '  --max-single-mb <n>   Max allowed single file size in MB (default: 20)'
        ].join('\n')
      )
      process.exit(0)
    } else if (!arg.startsWith('-') && !opts.slug) {
      opts.slug = arg.replace(/^\/+|\/+$/g, '').replace(/^blog\//, '')
    }
  }
  return opts
}

function ensureAsciiName(rawName, used) {
  const ext = extname(rawName).toLowerCase()
  const stem = basename(rawName, extname(rawName))
  const clean = stem.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+|[._-]+$/g, '') || 'file'
  let cand = `${clean}${ext}`
  let idx = 2
  while (used.has(cand.toLowerCase())) {
    cand = `${clean}_${idx++}${ext}`
  }
  used.add(cand.toLowerCase())
  return cand
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function compressVideoToLimit(srcPath, dstPath, maxBytes) {
  // Probe duration to pick a safe target bitrate (~88% of maxBytes)
  const targetBytes = Math.floor(maxBytes * 0.85)
  let durationSec = 15
  try {
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', srcPath],
      { encoding: 'utf8' }
    ).trim()
    const parsed = Number(out)
    if (Number.isFinite(parsed) && parsed > 0.5) durationSec = parsed
  } catch {
    // Fallback to CRF encoding if ffprobe unavailable
  }
  const targetKbps = Math.max(1500, Math.floor((targetBytes * 8) / durationSec / 1000))
  const maxRateKbps = Math.floor(targetKbps * 1.15)
  const bufSizeKbps = maxRateKbps * 2

  console.log(
    `Compressing ${basename(srcPath)} (${(statSync(srcPath).size / (1024 * 1024)).toFixed(2)} MB > ${(maxBytes / (1024 * 1024)).toFixed(0)} MB) -> target ~${targetKbps} kbps (keeping native resolution)...`
  )
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      srcPath,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '20',
      '-maxrate',
      `${maxRateKbps}k`,
      '-bufsize',
      `${bufSizeKbps}k`,
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      '-loglevel',
      'error',
      dstPath
    ],
    { stdio: 'inherit' }
  )

  // Safety second pass with stricter CRF if still above single-file limit
  if (statSync(dstPath).size > maxBytes) {
    const stricterKbps = Math.floor(targetKbps * 0.78)
    console.log(`Re-tightening ${basename(srcPath)} to ${stricterKbps} kbps to fit strictly under limit...`)
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        srcPath,
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-b:v',
        `${stricterKbps}k`,
        '-maxrate',
        `${Math.floor(stricterKbps * 1.1)}k`,
        '-bufsize',
        `${stricterKbps * 2}k`,
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        '-loglevel',
        'error',
        dstPath
      ],
      { stdio: 'inherit' }
    )
  }
}

// --- Minimal standards-compliant ZIP writer (zero external dependencies) ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function collectFiles(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full, base))
    else if (entry.isFile()) out.push({ full, rel: relative(base, full).replace(/\\/g, '/') })
  }
  return out
}

const ALREADY_COMPRESSED = new Set(['.mp4', '.webm', '.webp', '.png', '.jpg', '.jpeg', '.woff2', '.gif', '.gz', '.zip'])

function writeZip(srcDir, zipPath) {
  const files = collectFiles(srcDir)
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const { full, rel } of files) {
    const raw = readFileSync(full)
    const nameBuf = Buffer.from(rel, 'utf8')
    const storeOnly = ALREADY_COMPRESSED.has(extname(rel).toLowerCase())
    const method = storeOnly ? 0 : 8
    const data = storeOnly ? raw : deflateRawSync(raw, { level: 6 })
    const crc = crc32(raw)

    const lfh = Buffer.alloc(30)
    lfh.writeUInt32LE(0x04034b50, 0)
    lfh.writeUInt16LE(20, 4)
    lfh.writeUInt16LE(0x0800, 6)
    lfh.writeUInt16LE(method, 8)
    lfh.writeUInt16LE(0, 10)
    lfh.writeUInt16LE(0, 12)
    lfh.writeUInt32LE(crc, 14)
    lfh.writeUInt32LE(data.length, 18)
    lfh.writeUInt32LE(raw.length, 22)
    lfh.writeUInt16LE(nameBuf.length, 26)
    lfh.writeUInt16LE(0, 28)

    localParts.push(lfh, nameBuf, data)

    const cdh = Buffer.alloc(46)
    cdh.writeUInt32LE(0x02014b50, 0)
    cdh.writeUInt16LE(20, 4)
    cdh.writeUInt16LE(20, 6)
    cdh.writeUInt16LE(0x0800, 8)
    cdh.writeUInt16LE(method, 10)
    cdh.writeUInt16LE(0, 12)
    cdh.writeUInt16LE(0, 14)
    cdh.writeUInt32LE(crc, 16)
    cdh.writeUInt32LE(data.length, 20)
    cdh.writeUInt32LE(raw.length, 24)
    cdh.writeUInt16LE(nameBuf.length, 28)
    cdh.writeUInt16LE(0, 30)
    cdh.writeUInt16LE(0, 32)
    cdh.writeUInt16LE(0, 34)
    cdh.writeUInt16LE(0, 36)
    cdh.writeUInt32LE(0, 38)
    cdh.writeUInt32LE(offset, 42)

    centralParts.push(cdh, nameBuf)
    offset += lfh.length + nameBuf.length + data.length
  }

  const centralBuf = Buffer.concat(centralParts)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)

  writeFileSync(zipPath, Buffer.concat([...localParts, centralBuf, eocd]))
  return files.length
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.slug) {
    console.error('Error: missing post slug.\nExample: npm run export:km -- nylon-pull-and-tear')
    process.exit(1)
  }

  if (opts.build) {
    console.log('Running `npm run build` first...')
    execSync('npm run build', { stdio: 'inherit', cwd: SITE_ROOT })
  }

  const srcHtmlPath = join(DIST_DIR, 'blog', opts.slug, 'index.html')
  if (!existsSync(srcHtmlPath)) {
    console.error(`Error: built article not found at ${srcHtmlPath}\nRun \`npm run build\` or pass \`--build\`.`)
    process.exit(1)
  }

  const safeSlug = opts.slug.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'article'
  const pkgDir = join(opts.outDir, `${safeSlug}-km`)
  const zipPath = join(opts.outDir, `${safeSlug}-km.zip`)
  const maxSingleBytes = Math.floor(opts.maxSingleMb * 1024 * 1024)

  if (existsSync(pkgDir)) rmSync(pkgDir, { recursive: true, force: true })
  mkdirSync(join(pkgDir, 'assets'), { recursive: true })
  mkdirSync(join(pkgDir, 'fonts'), { recursive: true })
  mkdirSync(join(pkgDir, 'images'), { recursive: true })
  mkdirSync(join(pkgDir, 'media'), { recursive: true })

  let html = readFileSync(srcHtmlPath, 'utf8')

  // 1. Clean <head>: strip trailing site title, personal blog meta, favicon, feeds, Live2D, module scripts
  html = html.replace(/<title>([\s\S]*?)<\/title>/, (_, t) => {
    const cleanTitle = t.replace(/\s*·\s*Aentro\s*$/, '').trim()
    return `<title>${cleanTitle}</title>`
  })
  html = html.replace(
    /<link\b[^>]*rel="(?:icon|shortcut icon|apple-touch-icon|manifest|canonical|sitemap|alternate)"[^>]*>/g,
    ''
  )
  html = html.replace(/<link\b[^>]*href="\/live2d\/[^"]*"[^>]*>/g, '')
  html = html.replace(
    /<meta\b[^>]*(?:entropy622|property="og:|property="twitter:|property="article:|name="generator"|name="author")[^>]*>/g,
    ''
  )
  html = html.replace(/<script\b[^>]*src="\/_astro\/(?:ThemeProvider|page)[^"]*"[^>]*><\/script>/g, '')
  html = html.replace(/<link\b[^>]*href="\/_astro\/PFSearch[^"]*"[^>]*>/g, '')

  // KM-iframe safe video/image styling (avoid position:fixed full-page modals inside KM auto-height iframe)
  const extraHeadCss = `<style>
.prose video{display:block;width:100%;max-width:100%;border-radius:6px;background:#0f172a}
.prose img{max-width:100%;height:auto}
</style>`
  html = html.replace('</head>', `${extraHeadCss}\n</head>`)

  // 2. Remove opening splash (#opening-sequence + inline boot script)
  html = html.replace(
    /<!-- Decorative, fail-open introduction[\s\S]*?<div id="opening-sequence"[\s\S]*?<\/div>\s*<script>[\s\S]*?<\/script>/,
    ''
  )

  // 3. Remove Live2D loader block
  html = html.replace(
    /<!--\s*The widget is injected by waifu-tips\.js[\s\S]*?--><script type="module">[\s\S]*?<\/script>/,
    ''
  )

  // 4. Neutralize Rhine HUD labels
  html = html.replace('RHINE LAB STYLE <span>// 个人档案</span>', `RHINE LAB STYLE <span>// ${escapeHtml(opts.hudLabel)}</span>`)
  html = html.replace('ONLINE <b>AE-ARCHIVE</b>', `ONLINE <b>${escapeHtml(opts.hudCode)}</b>`)

  // 5. Replace <header-component> nav links with clean non-link Rhine brand + dark mode button
  html = html.replace(/<header-component\b[\s\S]*?<\/header-component>/, (hdr) => {
    const logoSvg = hdr.match(/<svg\b[\s\S]*?<\/svg>/)?.[0] ?? ''
    const darkBtn = hdr.match(/<button id="toggleDarkMode"[\s\S]*?<\/button>/)?.[0] ?? ''
    return (
      '<header-component class="group sticky top-4 z-50 max-md:z-30 mb-8 flex items-center justify-between rounded-xl border border-transparent max-sm:py-1 sm:rounded-2xl astro-b5wftkml">' +
      `<div class="rl-brand z-30 astro-b5wftkml" style="cursor:default">${logoSvg}<b class="astro-b5wftkml">${escapeHtml(opts.brand)}</b><span aria-hidden="true" class="astro-b5wftkml">${opts.sub}</span></div>` +
      `<div class="z-30 flex gap-x-4 astro-b5wftkml">${darkBtn}</div>` +
      '</header-component>'
    )
  })

  // 6. Remove Hero "Back" link to /blog
  html = html.replace(/<a\b[^>]*href="\/blog"[^>]*>[\s\S]*?<\/a>/g, '')

  // 7. Convert Hero tag links (/tags/...) to non-link styled <span> badges
  html = html.replace(/<a\b[^>]*href="\/tags\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '<span class="astro-qr7qsrsa">$1</span>')

  // 8. Remove bottom Copyright card, QR script, and Prev/Next post paginator
  html = html.replace(/<div class="bottom\b[\s\S]*?<\/div>\s*(?=<div\b[^>]*id="action-buttons")/, '')

  // 9. Remove site footer
  html = html.replace(/<footer class="rl-footer">[\s\S]*?<\/footer>/, '')

  // 10. Remove external CDN scripts (medium-zoom, qrcodejs if any remain)
  html = html.replace(/<script\b[^>]*src="https:\/\/cdn\.jsdelivr\.net\/[^"]*"[^>]*><\/script>/g, '')
  html = html.replace(/<script>\(function\(\)\{const selector = "\.prose img";[\s\S]*?\}\)\(\);<\/script>/g, '')

  // 11. Convert remaining inline <script type="module"> to classic IIFE <script> for file:// + KM compatibility
  html = html.replace(/<script type="module">([\s\S]*?)<\/script>/g, (_, code) => `<script>(()=>{${code.trim()}})();</script>`)

  // 12. Inject lightweight offline toast handler for theme switcher
  const offlineHelperJs = `
<script>
(() => {
  document.addEventListener('toast', (e) => {
    const msg = e.detail?.message;
    if (!msg) return;
    const el = document.createElement('div');
    el.className = 'animate fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-muted text-foreground rounded-lg border shadow-lg text-sm';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), e.detail?.time || 2200);
  });
})();
</script>
`
  html = html.replace('</body>', `${offlineHelperJs}\n</body>`)

  // 13. Bundle CSS files & fonts (pruning redundant KaTeX .woff/.ttf fallbacks when .woff2 exists)
  const usedAssets = new Set()
  const usedFonts = new Set()
  const fontMap = new Map()

  function bundleCss(cssHref) {
    const srcCss = join(DIST_DIR, cssHref.replace(/^\/+/, ''))
    if (!existsSync(srcCss)) throw new Error(`Missing stylesheet in dist: ${srcCss}`)
    let cssText = readFileSync(srcCss, 'utf8')

    if (cssText.includes('KaTeX_')) {
      cssText = cssText.replace(/,url\([^)]+\.(?:woff|ttf)\)\s*format\(["'](?:woff|truetype)["']\)/g, '')
    }

    cssText = cssText.replace(/url\(([^)]+)\)/g, (full, rawUrl) => {
      const cleaned = rawUrl.trim().replace(/^["']|["']$/g, '')
      if (cleaned.startsWith('data:') || cleaned.startsWith('http')) return full
      const srcAsset = cleaned.startsWith('/')
        ? join(DIST_DIR, cleaned.replace(/^\/+/, ''))
        : resolve(srcCss, '..', cleaned)
      if (!existsSync(srcAsset)) return full
      if (!fontMap.has(srcAsset)) {
        const fname = ensureAsciiName(basename(srcAsset), usedFonts)
        copyFileSync(srcAsset, join(pkgDir, 'fonts', fname))
        fontMap.set(srcAsset, `../fonts/${fname}`)
      }
      return `url("${fontMap.get(srcAsset)}")`
    })

    const cssName = ensureAsciiName(basename(srcCss), usedAssets)
    writeFileSync(join(pkgDir, 'assets', cssName), cssText, 'utf8')
    return `./assets/${cssName}`
  }

  html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (full, href) => {
    if (!href.startsWith('/')) return full
    const newHref = bundleCss(href)
    return full.replace(`href="${href}"`, `href="${newHref}"`)
  })

  // 13b. Bundle root-absolute SVG sprite icons (`<use href="/icons/code.svg#...">`) into ./assets/
  const iconMap = new Map()
  html = html.replace(/(<use\b[^>]*\b(?:xlink:)?href=")(\/[^"#]+)(#[^"]*)?(")/g, (_, p1, iconPath, hash = '', p4) => {
    if (!iconMap.has(iconPath)) {
      const srcIcon = join(DIST_DIR, decodeURIComponent(iconPath).replace(/^\/+/, ''))
      if (!existsSync(srcIcon)) throw new Error(`Missing SVG sprite in dist: ${srcIcon}`)
      const fname = ensureAsciiName(basename(srcIcon), usedAssets)
      copyFileSync(srcIcon, join(pkgDir, 'assets', fname))
      iconMap.set(iconPath, `./assets/${fname}`)
    }
    return `${p1}${iconMap.get(iconPath)}${hash}${p4}`
  })

  // 14. Bundle images (src + srcset) into ./images/
  const usedImgs = new Set()
  const imgMap = new Map()

  function mapImage(url) {
    if (!url.startsWith('/')) return url
    if (!imgMap.has(url)) {
      const srcImg = join(DIST_DIR, decodeURIComponent(url).replace(/^\/+/, ''))
      if (!existsSync(srcImg)) throw new Error(`Missing image in dist: ${srcImg}`)
      const fname = ensureAsciiName(basename(srcImg), usedImgs)
      copyFileSync(srcImg, join(pkgDir, 'images', fname))
      imgMap.set(url, `./images/${fname}`)
    }
    return imgMap.get(url)
  }

  html = html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g, (_, p1, url, p3) => `${p1}${mapImage(url)}${p3}`)
  html = html.replace(/srcset="([^"]+)"/g, (_, val) => {
    const rewritten = val
      .split(',')
      .map((part) => {
        const toks = part.trim().split(/\s+/)
        if (!toks[0]) return ''
        toks[0] = mapImage(toks[0])
        return toks.join(' ')
      })
      .filter(Boolean)
      .join(', ')
    return `srcset="${rewritten}"`
  })

  // 15. Bundle <video> / <source> media into ./media/, auto-compressing videos > maxSingleMb (KM 20 MB single-file cap)
  const usedVids = new Set()
  const vidMap = new Map()

  function mapMedia(url) {
    if (!url.startsWith('/')) return url
    if (!vidMap.has(url)) {
      const srcVid = join(DIST_DIR, decodeURIComponent(url).replace(/^\/+/, ''))
      if (!existsSync(srcVid)) throw new Error(`Missing media in dist: ${srcVid}`)
      const fname = ensureAsciiName(basename(srcVid), usedVids)
      const dstVid = join(pkgDir, 'media', fname)
      const sz = statSync(srcVid).size
      if (sz > maxSingleBytes && extname(srcVid).toLowerCase() === '.mp4') {
        compressVideoToLimit(srcVid, dstVid, maxSingleBytes)
      } else {
        copyFileSync(srcVid, dstVid)
      }
      vidMap.set(url, `./media/${fname}`)
    }
    return vidMap.get(url)
  }

  html = html.replace(/(<(?:video|source)\b[^>]*\bsrc=")([^"]+)(")/g, (_, p1, url, p3) => `${p1}${mapMedia(url)}${p3}`)
  html = html.replace(/\s+data-astro-prefetch\b/g, '')

  // Prune empty media/ directory if post has no videos
  if (usedVids.size === 0) rmSync(join(pkgDir, 'media'), { recursive: true, force: true })

  const outHtmlPath = join(pkgDir, 'index.html')
  writeFileSync(outHtmlPath, html, 'utf8')

  // 16. Automated integrity verification (aligned with KM check.py rules)
  const forbidden = [
    'entropy622.github.io',
    'cdn.jsdelivr.net',
    '"/_astro/',
    '"/media/',
    '"/icons/',
    '/live2d',
    '/tags/',
    '/rss.xml',
    'CC BY-NC-SA',
    'href="/blog"',
    'href="/projects"',
    'href="/links"',
    'href="/about"'
  ]
  const leaks = forbidden.filter((s) => html.includes(s))
  if (leaks.length) throw new Error(`Forbidden personal-blog/CDN strings remained: ${leaks.join(', ')}`)

  // Verify zero root-absolute src/href paths remain in index.html
  const absMatches = [...html.matchAll(/(?:src|href)="(\/[a-zA-Z0-9][^"]*)"/g)].map((m) => m[1])
  if (absMatches.length) throw new Error(`Root-absolute paths remained: ${[...new Set(absMatches)].join(', ')}`)

  const relRefs = new Set()
  for (const m of html.matchAll(/(?:src|href)="(\.\/[^"#]+)(?:#[^"]*)?"/g)) relRefs.add(m[1])
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const tok = part.trim().split(/\s+/)[0]
      if (tok?.startsWith('./')) relRefs.add(tok)
    }
  }
  const missingRel = [...relRefs].filter((r) => !existsSync(join(pkgDir, r.slice(2))))
  if (missingRel.length) throw new Error(`Missing relative assets in export: ${missingRel.join(', ')}`)

  const bodyOnly = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? ''
  const bodyNoScript = bodyOnly.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  const divOpen = (bodyNoScript.match(/<div\b/g) || []).length
  const divClose = (bodyNoScript.match(/<\/div>/g) || []).length
  if (divOpen !== divClose) throw new Error(`Unbalanced <div> tags: open=${divOpen}, close=${divClose}`)

  // Verify single-file size limit (KM 20 MB cap)
  for (const { full, rel } of collectFiles(pkgDir)) {
    const sz = statSync(full).size
    if (sz > maxSingleBytes) {
      throw new Error(`Single file ${rel} (${(sz / (1024 * 1024)).toFixed(2)} MB) exceeds ${opts.maxSingleMb} MB KM limit`)
    }
  }

  // 17. Create ZIP archive
  if (existsSync(zipPath)) rmSync(zipPath, { force: true })
  const entryCount = writeZip(pkgDir, zipPath)
  const zipMb = statSync(zipPath).size / (1024 * 1024)

  console.log('=== KM Export Complete ===')
  console.log(`Slug     : ${opts.slug}`)
  console.log(`Preview  : ${outHtmlPath}`)
  console.log(`ZIP      : ${zipPath}`)
  console.log(`Size     : ${zipMb.toFixed(2)} MB (limit: ${opts.maxMb} MB, max single: ${opts.maxSingleMb} MB)`)
  console.log(`Entries  : ${entryCount} (Assets=${usedAssets.size}, Fonts=${usedFonts.size}, Images=${usedImgs.size}, Media=${usedVids.size})`)

  if (zipMb > opts.maxMb) {
    console.error(`Warning: ZIP size (${zipMb.toFixed(2)} MB) exceeds ${opts.maxMb} MB limit!`)
    process.exit(2)
  }
}

main()
