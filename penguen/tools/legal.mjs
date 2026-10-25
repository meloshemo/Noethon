/**
 * The legal texts, as pages a store can be given a link to.
 *
 *   node tools/legal.mjs            # yaz
 *   node tools/legal.mjs --check    # sadece denetle (CI ve tests/legal.mjs)
 *
 * Both app stores ask for a privacy policy at a public URL, and the four texts
 * this game has were markdown files in `docs/`. A static host serves those as
 * plain text — the reviewer opening the link sees pipe characters and hashes —
 * so they need to exist as pages.
 *
 * Written rather than converted at load time, because the game has no build
 * step and no runtime markdown library, and a store link must keep working
 * whatever else happens. Written *from* the markdown, because the moment the
 * page becomes the second copy of a legal text, one of the two is wrong and
 * nobody knows which: `--check` regenerates into memory and compares, and
 * `tests/legal.mjs` runs that on every push.
 *
 * The markdown understood here is only what these four files use — headings,
 * paragraphs, tables, lists, block quotes, rules, bold, inline code and links.
 * Anything fancier belongs in the game, not in a privacy policy.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Which text becomes which page, and what the page says it is. */
export const PAGES = [
  {
    from: 'docs/GIZLILIK.md',
    to: 'gizlilik.html',
    lang: 'tr',
    title: 'Gizlilik — Pengu',
    back: 'Oyuna dön',
  },
  {
    from: 'docs/PRIVACY.md',
    to: 'privacy.html',
    lang: 'en',
    title: 'Privacy — Pengu',
    back: 'Back to the game',
  },
  {
    from: 'docs/KULLANIM-SARTLARI.md',
    to: 'kullanim-sartlari.html',
    lang: 'tr',
    title: 'Kullanım Şartları — Pengu',
    back: 'Oyuna dön',
  },
  {
    from: 'docs/TERMS.md',
    to: 'terms.html',
    lang: 'en',
    title: 'Terms — Pengu',
    back: 'Back to the game',
  },
];

/**
 * A link to a sibling text has to point at the *page*, not the markdown.
 *
 * The English policy links to the Turkish one as `GIZLILIK.md`, which is
 * right in the repository and useless in a store listing: the reviewer gets a
 * file download or a wall of pipe characters.
 */
function docLink(href) {
  const match = href.match(/([A-Z-]+)\.md$/);
  if (!match) return href;
  const page = PAGES.find((p) => p.from.endsWith(`${match[1]}.md`));
  return page ? page.to : href;
}

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Bold, inline code and links — in that order, so a link inside bold works. */
function inline(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${docLink(href)}">${label}</a>`);
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

/** The markdown these four files actually contain, and nothing else. */
function render(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  const paragraph = [];
  const flush = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph.length = 0;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    const head = line.match(/^(#{1,4})\s+(.*)$/);
    if (head) {
      flush();
      const level = head[1].length;
      out.push(`<h${level}>${inline(head[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }

    // A table: a header row, a divider of dashes, then body rows.
    if (line.trim().startsWith('|') && /^\s*\|[\s:-]+\|/.test(lines[i + 1] ?? '')) {
      flush();
      const head2 = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        body.push(cells(lines[i]));
        i++;
      }
      out.push(
        `<table><thead><tr>${head2.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${body
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && lines[i].trim()) {
        if (/^\s*[-*]\s+/.test(lines[i])) {
          items.push([lines[i].replace(/^\s*[-*]\s+/, '')]);
        } else if (items.length) {
          // A wrapped bullet. Without this the tail of every long item fell
          // out of the list and became a paragraph of its own, mid-sentence —
          // which looks exactly like a legal text with something missing.
          items[items.length - 1].push(lines[i].trim());
        } else {
          break;
        }
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it.join(' '))}</li>`).join('')}</ul>`);
      continue;
    }

    if (line.trimStart().startsWith('>')) {
      flush();
      const quote = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${render(quote.join('\n'))}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }
  flush();
  return out.join('\n');
}

/**
 * One page, styled in the game's own colours and readable on a phone.
 *
 * Self-contained on purpose: a reviewer may open this with the site half
 * cached, from a link in a form, on a connection that is doing other things.
 * A legal page that depends on a stylesheet loading is a legal page that can
 * arrive unreadable.
 */
function page({ title, lang, back }, body) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escape(title)}</title>
<meta name="robots" content="index, follow">
<meta name="color-scheme" content="dark">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: clamp(1.25rem, 4vw, 3rem) clamp(1rem, 5vw, 2rem) 4rem;
    background: #050d1c;
    color: #dbe7f4;
    font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: clamp(1.7rem, 5vw, 2.3rem); line-height: 1.15; margin: 0 0 0.6em; color: #fff; }
  h2 { font-size: 1.25rem; margin: 2.2em 0 0.6em; color: #9ad4f2; }
  h3 { font-size: 1.05rem; margin: 1.8em 0 0.5em; color: #9ad4f2; }
  p { margin: 0 0 1em; }
  a { color: #7fd1ff; }
  code {
    background: #0e1f38; border: 1px solid #1d3a5c; border-radius: 4px;
    padding: 0.1em 0.35em; font-size: 0.92em;
  }
  ul { padding-left: 1.2em; margin: 0 0 1em; }
  li { margin: 0.25em 0; }
  hr { border: 0; border-top: 1px solid #1d3a5c; margin: 2.5em 0; }
  blockquote {
    margin: 1.5em 0; padding: 0.8em 1.1em;
    background: #0a1830; border-left: 3px solid #2b6a8f; border-radius: 0 8px 8px 0;
  }
  blockquote p:last-child { margin-bottom: 0; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 1.4em; font-size: 0.95em; }
  th, td { text-align: left; padding: 0.5em 0.7em; border-bottom: 1px solid #16304f; vertical-align: top; }
  th { color: #9ad4f2; font-weight: 600; }
  .back { display: inline-block; margin-bottom: 2em; color: #7fd1ff; text-decoration: none; }
  .back:hover { text-decoration: underline; }
  @media (max-width: 30rem) { table { display: block; overflow-x: auto; } }
</style>
</head>
<body>
<main>
<a class="back" href="./">← ${escape(back)}</a>
${body}
</main>
</body>
</html>
`;
}

export async function build() {
  const made = [];
  for (const spec of PAGES) {
    const md = await readFile(resolve(root, spec.from), 'utf8');
    made.push({ ...spec, html: page(spec, render(md)) });
  }
  return made;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const made = await build();
  let stale = 0;
  for (const m of made) {
    const path = resolve(root, m.to);
    if (check) {
      const have = await readFile(path, 'utf8').catch(() => null);
      if (have !== m.html) {
        console.log(`  ✗ ${m.to} güncel değil`);
        stale++;
      } else {
        console.log(`  ✓ ${m.to}`);
      }
    } else {
      await writeFile(path, m.html);
      console.log(`  ✓ ${m.to} ← ${m.from}`);
    }
  }
  if (check && stale) {
    console.log(`\n✗ ${stale} sayfa eskimiş — "node tools/legal.mjs" ile tazele.`);
    process.exit(1);
  }
  console.log(check ? '\n✓ Yasal sayfalar metinlerle aynı şeyi söylüyor.' : '\n✓ Yasal sayfalar yazıldı.');
}
