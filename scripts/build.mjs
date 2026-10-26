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
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.4"/></svg>';
const star =
  '<svg class="star-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 1 3.5 11.5L31 16l-11.5 3.5L16 31l-3.5-11.5L1 16l11.5-3.5L16 1Z" stroke="currentColor"/><circle cx="16" cy="16" r="4" fill="currentColor"/></svg>';
const quotations = {
  traveler: {
    text: "人生天地间，忽如远行客。",
    author: "佚名",
    work: "古诗十九首·青青陵上柏",
    url: "https://zh.wikisource.org/wiki/古詩十九首",
  },
  beauty: {
    text: "天地有大美而不言。",
    author: "庄子",
    work: "庄子·知北游",
    url: "https://zh.wikisource.org/wiki/莊子/知北遊",
  },
  mountain: {
    text: "相看两不厌，只有敬亭山。",
    author: "李白",
    work: "独坐敬亭山",
    url: "https://zh.wikisource.org/wiki/獨坐敬亭山",
  },
  wind: {
    text: "惟江上之清风，与山间之明月。",
    author: "苏轼",
    work: "前赤壁赋",
    url: "https://zh.wikisource.org/wiki/前赤壁賦",
  },
};
function attribution(quote) {
  return `<figcaption><span>${quote.author}</span><span class="citation-dash">—</span><cite><a href="${quote.url}" target="_blank" rel="noopener noreferrer">《${quote.work}》<span class="sr-only">（出处，新窗口）</span></a></cite></figcaption>`;
}
function quotation(key, className = "") {
  const quote = quotations[key];
  return `<figure class="quotation ${className}"><blockquote cite="${quote.url}">${quote.text}</blockquote>${attribution(quote)}</figure>`;
}
const homeDescription =
  "海果不能吃，Homalozoa 的个人博客。随笔、Linux 与机器人。";
const footer = `<footer class="site-footer"><div class="footer-top"><a href="/" class="footer-brand">${star}<span>海果不能吃<small>Homalozoa is not for eating.</small></span></a>${quotation("mountain", "footer-quotation")}</div><div class="footer-bottom"><span>© 2021–${new Date().getFullYear()} Homalozoa</span><span class="footer-middle">个人博客 · ${posts.length} 篇文章</span><a href="#top">回到顶部 ↑</a></div></footer>`;

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
<meta name="theme-color" content="#101e22">
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
<meta name="twitter:card" content="summary_large_image">
<meta property="og:image" content="${origin}/assets/images/planetary-landscape.webp">
${post ? `<meta property="article:published_time" content="${post.published}"><meta property="article:modified_time" content="${post.modified}"><meta property="article:author" content="海果">` : ""}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
${kind === "home" ? '<link rel="preload" as="image" href="/assets/images/planetary-landscape.webp" imagesrcset="/assets/images/planetary-landscape-mobile.webp 800w, /assets/images/planetary-landscape.webp 2400w" imagesizes="100vw">' : ""}
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script>
</head>
<body class="page-${kind}" id="top">
<a class="skip-link" href="#main">跳到内容</a>
<header class="site-header">
  <a href="/" class="brand" aria-label="海果不能吃首页"><span class="brand-mark" aria-hidden="true">H</span><span>海果不能吃<span class="brand-sub">HOMALOZOA</span></span></a>
  <nav aria-label="主导航"><a href="/" ${kind === "home" ? 'aria-current="page"' : ""}>首页</a><a href="/#notes">文章</a><a href="/archives/" ${kind === "archive" ? 'aria-current="page"' : ""}>归档</a><a href="/#about">关于</a></nav>
  <a class="github-link" href="https://github.com/homalozoa" target="_blank" rel="noopener noreferrer">GitHub ${arrow}<span class="sr-only">（新窗口）</span></a>
</header>
${content}
${footer}
</body>
</html>
`;
}

function filters(selectedPosts) {
  const categories = [
    ...new Map(
      selectedPosts.map((post) => [post.category, post.label]),
    ).entries(),
  ];
  return `<div class="post-filters" role="group" aria-label="按文章分类筛选" hidden><button type="button" data-filter="all" aria-pressed="true">全部<span>${String(selectedPosts.length).padStart(2, "0")}</span></button>${categories.map(([category, label]) => `<button type="button" data-filter="${escape(category)}" aria-pressed="false">${escape(label)}</button>`).join("")}</div><p class="sr-only filter-status" role="status" aria-live="polite"></p>`;
}

function postCard(post, index) {
  const number = String(index + 1).padStart(2, "0");
  const symbols = ["◎", "△", "✳"];
  return `<a href="${post.path}" class="post-card" data-category="${escape(post.category)}"><div class="card-art art-${index % 3}" aria-hidden="true"><span class="card-planet"></span><span class="art-orbit"></span><span class="art-cross">+</span><span class="art-caption">${escape(post.category)} / ${number}</span><span class="art-symbol">${symbols[index % 3]}</span></div><div class="card-content"><div class="card-meta"><span class="tag">${escape(post.label)}</span><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time></div><h3>${escape(post.title)}</h3><p>${escape(post.summary)}</p><span class="card-read">阅读全文 ${arrow}</span></div></a>`;
}

function home() {
  return shell({
    content: `<main id="main">
<section class="home-hero" aria-labelledby="hero-title">
  <picture class="hero-landscape" aria-hidden="true"><source media="(max-width: 600px)" srcset="/assets/images/planetary-landscape-mobile.webp"><img src="/assets/images/planetary-landscape.webp" alt="" width="2400" height="1350" fetchpriority="high"></picture>
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-copy"><p class="eyebrow hero-eyebrow"><span class="small-cross" aria-hidden="true">+</span> HOMALOZOA'S JOURNAL <span class="eyebrow-divider">/</span> EST. 2021</p><h1 id="hero-title">海果不能吃<span>Homalozoa is not for eating.</span></h1><figure class="quotation hero-quotation"><blockquote cite="${quotations.traveler.url}">人生天地间，<br>忽如远行客。</blockquote>${attribution(quotations.traveler)}</figure><a class="read-notes" href="#notes">翻阅文章 <span>↓</span></a></div>
  <div class="hero-edge" aria-hidden="true"><span>HOMALOZOA</span><span class="edge-line"></span><span>2021 — ${new Date().getFullYear()}</span></div>
  <div class="hero-bottom"><span class="hero-location">${star}<span>个人博客<span class="tiny-label">A PERSONAL JOURNAL</span></span></span><a href="#notes" class="hero-scroll"><span>向下探索</span><span class="scroll-line" aria-hidden="true"></span></a><span class="hero-count">${String(posts.length).padStart(2, "0")} <span>篇文章</span></span></div>
</section>
<section class="notes-section content-width" id="notes" aria-labelledby="notes-title" data-post-collection><div class="section-heading"><div><p class="eyebrow">01 <span>/</span> JOURNAL</p><h2 id="notes-title">最近的文章<span class="count">${String(posts.length).padStart(2, "0")}</span></h2></div><a class="text-link" href="/archives/">全部归档 ${arrow}</a></div>${filters(posts)}<div class="post-grid">${posts.map(postCard).join("")}</div></section>
<section class="interlude" aria-label="庄子题辞"><div class="interlude-orbit" aria-hidden="true"><span></span></div><div class="interlude-inner"><span class="eyebrow">INTERLUDE</span>${quotation("beauty")}</div></section>
<section class="about-section content-width" id="about" aria-labelledby="about-title"><div class="about-heading"><p class="eyebrow">02 <span>/</span> THE AUTHOR</p><h2 id="about-title">关于海果</h2><p class="about-handle">@homalozoa</p></div><div class="about-content">${quotation("wind", "about-quotation")}<div class="about-bottom"><p>写一点随笔，也记下折腾 Linux 和机器人的过程。</p><a href="https://github.com/homalozoa" target="_blank" rel="noopener noreferrer" class="text-link">在 GitHub 找到我 ${arrow}<span class="sr-only">（新窗口）</span></a></div></div></section>
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
  const groups = selectedPosts.reduce(
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
    content: `<main id="main"><section class="archive-header"><div class="content-width"><p class="eyebrow">THE ARCHIVE <span>/</span> ${period || "2021 — " + new Date().getFullYear()}</p><div class="archive-title"><h1>文章归档${period ? `<span>${escape(period)}</span>` : ""}</h1><span class="archive-total">${String(selectedPosts.length).padStart(2, "0")}<small>篇文章</small></span></div>${quotation("traveler", "archive-quotation")}</div></section><section class="archive-list content-width" aria-label="按年份排列的文章" data-post-collection>${filters(selectedPosts)}${[...groups].map(([year, entries]) => `<div class="archive-year"><div class="year-label"><a href="/archives/${year}/">${year}</a><span>${String(entries.length).padStart(2, "0")} ENTRIES</span></div><div class="archive-entries">${entries.map((post) => `<a class="archive-entry" href="${post.path}" data-category="${escape(post.category)}"><time datetime="${post.date}">${post.date.slice(5).replace("-", ".")}</time><div><span class="eyebrow">${escape(post.label)}</span><h2>${escape(post.title)}</h2><p>${escape(post.summary)}</p></div><span class="entry-arrow">${arrow}</span></a>`).join("")}</div></div>`).join("")}<div class="archive-end"><span>始于 2021</span><a href="/" class="text-link">返回首页 ${arrow}</a></div></section></main>`,
  });
}

for (const post of posts) {
  const source = await readFile(
    path.join(root, "content/posts", post.slug + ".html"),
    "utf8",
  );
  // Preserve historical article content, heading IDs, and permanent links.
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
        `<li><a href="#${encodeURIComponent(heading.id)}"><span>${String(index + 1).padStart(2, "0")}</span>${escape(heading.title)}</a></li>`,
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
      content: `<div class="reading-progress" aria-hidden="true"><span></span></div><main id="main"><header class="article-header"><div class="article-heading-inner"><a href="/archives/" class="back-link">← 全部文章</a><div class="article-kicker"><span class="tag">${escape(post.label)}</span><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time></div><h1>${escape(post.title)}</h1><p class="article-byline">HOMALOZOA <span>/ 海果</span></p></div></header><div class="article-layout"><aside class="toc-sidebar">${tocPanel}<a href="#top" class="toc-top">↑ 回到顶部</a></aside><article class="article-body" aria-label="文章正文">${body}</article></div>${otherPosts.length ? `<nav class="next-note" aria-label="继续阅读"><span class="eyebrow">CONTINUE READING <span>/</span> 继续阅读</span><a href="${otherPosts[0].path}"><h2>${escape(otherPosts[0].title)}</h2>${arrow}</a></nav>` : ""}</main>`,
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
    content: `<main id="main" class="error-page"><div class="content-width"><p class="eyebrow">PAGE NOT FOUND</p><h1>404<span>此处没有页面</span></h1>${quotation("traveler")}<a class="read-notes" href="/">返回首页 ${arrow}</a></div></main>`,
  }),
);
console.log(
  `Built homepage, ${posts.length} articles, archives, and 404 page.`,
);
