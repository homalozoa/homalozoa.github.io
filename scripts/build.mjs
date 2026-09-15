import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = "https://homalozoa.github.io";
const posts = JSON.parse(
  await readFile(path.join(root, "content/posts.json"), "utf8"),
);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const arrow =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg>';
const homeDescription =
  "海果不能吃，Homalozoa X 的个人博客。记录那些暂时说不出用途的观察、疑问与兴趣。";
const footer = `<footer class="site-footer"><a href="/" class="footer-name">海果不能吃<span>Homalozoa is not for eating.</span></a><div class="footer-bottom"><span>© 2021–${new Date().getFullYear()} Homalozoa X</span><span class="footer-motto">观察 · 阅读 · 实践</span><a href="#top">回到顶部 ↑</a></div></footer>`;

function shell({
  title = "海果不能吃",
  description = homeDescription,
  route = "/",
  kind = "home",
  post,
  content,
}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ff6846">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="author" content="海果">
<link rel="canonical" href="${origin}${route}">
<meta property="og:type" content="${post ? "article" : "website"}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${origin}${route}">
<meta property="og:site_name" content="海果不能吃">
<meta property="og:locale" content="zh_CN">
<meta name="twitter:card" content="summary">
${post ? `<meta property="article:published_time" content="${post.published}"><meta property="article:modified_time" content="${post.modified}"><meta property="article:author" content="海果">` : ""}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script>
</head>
<body class="page-${kind}" id="top">
<a class="skip-link" href="#main">跳到内容</a>
<header class="site-header">
  <a href="/" class="brand" aria-label="海果不能吃首页"><span class="brand-mark" aria-hidden="true">H</span><span>海果不能吃<span class="brand-sub">Homalozoa is not for eating.</span></span></a>
  <nav aria-label="主导航"><a href="/" ${kind === "home" ? 'aria-current="page"' : ""}>首页<span>INDEX</span></a><a href="/archives/" ${kind === "archive" ? 'aria-current="page"' : ""}>归档<span>ARCHIVE</span></a><a class="github-link" href="https://github.com/homalozoa" target="_blank" rel="noopener noreferrer">GitHub ${arrow}<span class="sr-only">（新窗口）</span></a></nav>
</header>
${content}
${footer}
</body>
</html>
`;
}

function postCard(post, index) {
  const number = String(index + 1).padStart(2, "0");
  const cardTitle = (post.cardTitle || [post.title])
    .map((line, index) =>
      index ? `<span class="title-break">${escape(line)}</span>` : escape(line),
    )
    .join("");
  return `<a href="${post.path}" class="post-card"><span class="post-index">${number}</span><div class="card-content"><div class="card-meta"><span class="tag">${post.category}</span><span>${post.label}</span></div><h3>${cardTitle}</h3><p>${post.summary}</p></div><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time><span class="card-read">阅读全文 ${arrow}</span></a>`;
}

function home() {
  return shell({
    content: `<main id="main">
<section class="home-hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">A PERSONAL JOURNAL · EST. 2021</p><p class="hero-english">Homalozoa is not for eating.</p><h1 id="hero-title">海果不能吃</h1><p class="hero-lede">有些东西不必被消费，也值得被认真看见。这里记录阅读、观察与实践留下的变化。</p><a class="read-notes" href="#notes">查看文章 <span>↓</span></a></div><aside class="hero-aside"><span class="decor-orb" aria-hidden="true"></span><span class="decor-bar" aria-hidden="true"></span><span class="decor-letter" aria-hidden="true">H</span><p>这里收留那些暂时说不出用途的观察、疑问与兴趣。</p><figure class="hero-quotation"><blockquote cite="https://www.hachette.co.nz/octavia-e-butler/parable-of-the-sower-the-new-york-times-bestseller">“你改变的一切，也在改变你。”</blockquote><figcaption>— Octavia E. Butler，<cite><a href="https://www.hachette.co.nz/octavia-e-butler/parable-of-the-sower-the-new-york-times-bestseller" target="_blank" rel="noopener noreferrer">《播种者寓言》<span class="sr-only">（英文出处，新窗口）</span></a></cite></figcaption></figure></aside></section>
<section class="notes-section" id="notes" aria-labelledby="notes-title"><div class="section-heading"><div><p class="eyebrow">01 / RECENT NOTES</p><h2 id="notes-title">最近写下<span class="count">${String(posts.length).padStart(2, "0")}</span></h2></div><a class="text-link" href="/archives/">全部归档 ${arrow}</a></div><div class="post-grid">${posts.map(postCard).join("")}</div></section>
<section class="colophon" aria-labelledby="colophon-title"><span class="eyebrow">02 / ABOUT</span><h2 id="colophon-title">不以有用<br><span>为尺度</span></h2><div><p>有些兴趣尚未形成项目，也暂时说不出用途。<br>它们仍值得被看见、被追问，<br>并在文字里慢慢改变形状。</p><a href="https://github.com/homalozoa" target="_blank" rel="noopener noreferrer" class="text-link">GitHub 主页 ${arrow}<span class="sr-only">（新窗口）</span></a></div></section>
</main>`,
  });
}

async function write(route, html) {
  const output = path.join(
    root,
    route,
    route.endsWith(".html") ? "" : "index.html",
  );
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
}

function archive(route, selectedPosts, period = "") {
  const groups = Map.groupBy
    ? Map.groupBy(selectedPosts, (post) => post.date.slice(0, 4))
    : selectedPosts.reduce(
        (groups, post) =>
          groups.set(post.date.slice(0, 4), [
            ...(groups.get(post.date.slice(0, 4)) || []),
            post,
          ]),
        new Map(),
      );
  return shell({
    title: `${period ? period + " · " : ""}文章归档 · 海果不能吃`,
    route,
    kind: "archive",
    content: `<main id="main"><section class="archive-header"><p class="eyebrow">ALL NOTES / 漂流记录</p><div class="archive-title"><h1>归档<span>ARCHIVE${period ? " / " + period : ""}</span></h1><span class="archive-total">${String(selectedPosts.length).padStart(2, "0")}<small>篇文章</small></span></div><p>所有被打捞并写下的东西，按时间排列。</p></section><section class="archive-list" aria-label="按年份排列的文章">${[...groups].map(([year, entries]) => `<div class="archive-year"><div class="year-label"><a href="/archives/${year}/">${year}</a><span>${String(entries.length).padStart(2, "0")} ENTRIES</span></div><div class="archive-entries">${entries.map((post) => `<a class="archive-entry" href="${post.path}"><time datetime="${post.date}">${post.date.slice(5).replace("-", ".")}</time><div><span class="eyebrow">${post.category}</span><h2>${post.title}</h2><p>${post.summary}</p></div><span class="entry-arrow">${arrow}</span></a>`).join("")}</div></div>`).join("")}<div class="archive-end"><span>记录始于 2021</span><a href="/" class="text-link">返回首页 ${arrow}</a></div></section></main>`,
  });
}

for (const post of posts) {
  const source = await readFile(
    path.join(root, "content/posts", post.slug + ".html"),
    "utf8",
  );
  // The old theme starts content headings at h4. Preserve their IDs and text.
  const body = /<h[23][\s>]/i.test(source)
    ? source
    : source.replace(
        /<(\/?)[hH]([456])(?=[\s>])/g,
        (_, closing, level) => `<${closing}h${Number(level) - 2}`,
      );
  const headings = [
    ...body.matchAll(/<h([234]) id="([^"]+)">([\s\S]*?)<\/h\1>/g),
  ].map(([, level, id, title]) => ({
    level,
    id,
    title: title.replace(/<[^>]+>/g, ""),
  }));
  const toc = headings
    .filter((heading) => heading.level === "2")
    .map(
      (heading, index) =>
        `<li><a href="#${encodeURIComponent(heading.id)}"><span>${String(index + 1).padStart(2, "0")}</span>${heading.title}</a></li>`,
    )
    .join("");
  const tocPanel = toc
    ? `<details class="toc" open><summary>本篇目录 <span>CONTENTS</span></summary><nav aria-label="文章目录"><ol>${toc}</ol></nav></details>`
    : "";
  const otherPosts = posts.filter((other) => other.slug !== post.slug);
  await write(
    post.path,
    shell({
      title: `${post.title} · 海果不能吃`,
      description: post.summary,
      route: post.path,
      kind: "article",
      post,
      content: `<div class="reading-progress" aria-hidden="true"><span></span></div><main id="main"><header class="article-header"><a href="/archives/" class="back-link">← 全部文章</a><div class="article-kicker"><span class="tag">${post.category}</span><span>${post.label}</span><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time></div><h1>${escape(post.title)}</h1><p class="article-byline">BY HOMALOZOA <span>/ 海果</span></p></header><div class="article-layout"><aside class="toc-sidebar">${tocPanel}<a href="#top" class="toc-top">↑ 回到顶部</a></aside><article class="article-body" aria-label="文章正文">${body}</article></div>${otherPosts.length ? `<nav class="next-note" aria-label="继续阅读"><span class="eyebrow">NEXT NOTE / 继续阅读</span><a href="${otherPosts[0].path}"><h2>${escape(otherPosts[0].title)}</h2>${arrow}</a></nav>` : ""}</main>`,
    }),
  );
}
await write("/", home());
await write("/archives/", archive("/archives/", posts));
for (const year of new Set(posts.map((post) => post.date.slice(0, 4)))) {
  const route = `/archives/${year}/`;
  await write(
    route,
    archive(
      route,
      posts.filter((post) => post.date.startsWith(year)),
      year,
    ),
  );
}
for (const month of new Set(posts.map((post) => post.date.slice(0, 7)))) {
  const route = `/archives/${month.replace("-", "/")}/`;
  await write(
    route,
    archive(
      route,
      posts.filter((post) => post.date.startsWith(month)),
      month.replace("-", " / "),
    ),
  );
}
await write(
  "/404.html",
  shell({
    title: "页面未找到 · 海果不能吃",
    route: "/404.html",
    kind: "error",
    content: `<main id="main" class="error-page"><p class="eyebrow">SPECIMEN NOT FOUND</p><h1>404<span>这枚海果漂走了</span></h1><p>请检查链接地址，或返回首页继续翻阅。</p><a class="read-notes" href="/">返回首页 <span>↗</span></a></main>`,
  }),
);
console.log(
  `Built homepage, ${posts.length} articles, archives, and 404 page.`,
);
