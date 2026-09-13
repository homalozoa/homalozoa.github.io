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
const mark =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M30 9H15L7 20l8 11h15v-9H19v-4h11Z" fill="currentColor"/></svg>';
const homeDescription =
  "Carboniferous，Homalozoa X 的个人博客。记录对世界的观察、阅读与思考。";
const footer = `<footer class="site-footer"><a href="/" class="footer-name">Carboniferous<span>石炭纪</span></a><div class="footer-bottom"><span>© 2021–${new Date().getFullYear()} Homalozoa X</span><span class="footer-motto">观察 · 阅读 · 思考</span><a href="#top">回到顶部 ↑</a></div></footer>`;

function shell({
  title = "Carboniferous · 石炭纪",
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
<meta name="theme-color" content="#dfff70">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="author" content="Homalozoa X">
<link rel="canonical" href="${origin}${route}">
<meta property="og:type" content="${post ? "article" : "website"}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${origin}${route}">
<meta property="og:site_name" content="Carboniferous">
<meta property="og:locale" content="zh_CN">
<meta name="twitter:card" content="summary">
${post ? `<meta property="article:published_time" content="${post.published}"><meta property="article:modified_time" content="${post.modified}"><meta property="article:author" content="Homalozoa X">` : ""}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js" defer></script>
</head>
<body class="page-${kind}" id="top">
<a class="skip-link" href="#main">跳到内容</a>
<header class="site-header">
  <a href="/" class="brand" aria-label="Carboniferous 首页">${mark}<span>HOMALOZOA X<span class="brand-sub">A PERSONAL JOURNAL</span></span></a>
  <nav aria-label="主导航"><a href="/" ${kind === "home" ? 'aria-current="page"' : ""}>首页<span>INDEX</span></a><a href="/archives/" ${kind === "archive" ? 'aria-current="page"' : ""}>归档<span>ARCHIVE</span></a><a class="github-link" href="https://github.com/homalozoa" target="_blank" rel="noopener noreferrer">GitHub ${arrow}<span class="sr-only">（新窗口）</span></a></nav>
</header>
${content}
${footer}
</body>
</html>
`;
}

function postCard(post, index) {
  const covers = {
    LINUX: {
      style: "card-linux",
      art: '<span class="terminal-symbol">&gt;_</span><span class="symbol-caption">ARCH<br>LINUX</span>',
    },
    ROBOTICS: {
      style: "card-ros",
      art: '<span class="ros-symbol">ROS<span class="ros-two">2</span></span><span class="symbol-caption">ROS 2<br>GALACTIC</span>',
    },
  };
  const cover = covers[post.category] || {
    style: "card-note",
    art: `<span class="terminal-symbol">${String(index + 1).padStart(2, "0")}</span>`,
  };
  const cardTitle = (post.cardTitle || [post.title])
    .map((line, index) =>
      index ? `<span class="title-break">${escape(line)}</span>` : escape(line),
    )
    .join("");
  return `<a href="${post.path}" class="post-card ${cover.style}"><div class="card-top"><span class="eyebrow">NOTE / ${String(index + 1).padStart(2, "0")}</span><span class="tag">${post.category}</span></div><div class="card-symbol" aria-hidden="true">${cover.art}</div><div class="card-content"><span class="card-category">${post.label}</span><h3>${cardTitle}</h3><p>${post.summary}</p></div><div class="card-bottom"><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time><span class="card-read">阅读全文 ${arrow}</span></div></a>`;
}

function home() {
  return shell({
    content: `<main id="main">
<section class="hero" aria-labelledby="hero-title">
  <div class="masthead"><h1 id="hero-title">CARBONIFEROUS</h1><div class="masthead-meta"><span>石炭纪 / A PERSONAL JOURNAL</span><span>NOTES ON A CHANGING WORLD</span><span>EST. 2021</span></div></div>
  <div class="hero-grid"><div class="hero-copy"><p class="eyebrow">关于世界，也关于我们如何置身其中</p><figure class="hero-quotation"><blockquote cite="https://www.hachette.co.nz/octavia-e-butler/parable-of-the-sower-the-new-york-times-bestseller"><h2>你改变的一切，<br>也在<span class="serif-word">改变你。</span></h2></blockquote><figcaption><span>— Octavia E. Butler</span><span><cite><a href="https://www.hachette.co.nz/octavia-e-butler/parable-of-the-sower-the-new-york-times-bestseller" target="_blank" rel="noopener noreferrer">《播种者寓言》<span class="sr-only">（英文出处，新窗口）</span></a></cite> · 1993<span class="quote-translation">节选 · 本站译文</span></span></figcaption></figure><p class="hero-intro">一段代码，一片叶子，一页书。<br>从具体的事物出发，记录观察、疑问与理解的变化。</p><a class="read-notes" href="#notes">查看文章 <span>↓</span></a><div class="hero-footnote"><span class="asterisk" aria-hidden="true">✳</span><span>All that you Change,<br>Changes you.</span></div></div>
  <figure class="specimen"><div class="specimen-corner top-left" aria-hidden="true"></div><div class="specimen-corner top-right" aria-hidden="true"></div><div class="specimen-corner bottom-left" aria-hidden="true"></div><div class="specimen-corner bottom-right" aria-hidden="true"></div><div class="specimen-meta"><span>CARBONIFEROUS<br>ILLUSTRATION / 01</span><span class="specimen-plus" aria-hidden="true">+</span></div><img src="/assets/fossil.webp" alt="银色金属质感的螺旋化石艺术作品" width="1254" height="1254" fetchpriority="high"><span class="specimen-sticker" aria-hidden="true">EST.<br><i>2021.</i></span><figcaption><span>FIG. 01 — DIGITAL FOSSIL</span><span>化石插图</span></figcaption></figure></div>
</section>
<section class="notes-section" id="notes" aria-labelledby="notes-title"><div class="section-heading"><div><p class="eyebrow">01 / ESSAYS & NOTES</p><h2 id="notes-title">最近的记录<span class="count">(${String(posts.length).padStart(2, "0")})</span></h2></div><a class="text-link" href="/archives/">全部归档 ${arrow}</a></div><div class="post-grid">${posts.map(postCard).join("")}</div></section>
<section class="colophon" aria-labelledby="colophon-title"><span class="eyebrow">02 / COLOPHON</span><h2 id="colophon-title">关于<br><span>这里</span></h2><div><p>这些文字始于阅读、观察与实践。<br>它们从不同的事物出发，最后常常回到同一个问题：<br>我们如何认识世界，又如何在其中生活。</p><a href="https://github.com/homalozoa" target="_blank" rel="noopener noreferrer" class="text-link">GitHub 主页 ${arrow}<span class="sr-only">（新窗口）</span></a></div></section>
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
    title: `${period ? period + " · " : ""}文章归档 · Carboniferous`,
    route,
    kind: "archive",
    content: `<main id="main"><section class="archive-header"><p class="eyebrow">ALL POSTS / 文章归档</p><div class="archive-title"><h1>ARCHIVE<span>归档${period ? " / " + period : ""}</span></h1><span class="archive-total">${String(selectedPosts.length).padStart(2, "0")}<small>篇文章</small></span></div><p>按年份浏览文章。</p></section><section class="archive-list" aria-label="按年份排列的文章">${[...groups].map(([year, entries]) => `<div class="archive-year"><div class="year-label"><a href="/archives/${year}/">${year}</a><span>${String(entries.length).padStart(2, "0")} ENTRIES</span></div><div class="archive-entries">${entries.map((post) => `<a class="archive-entry" href="${post.path}"><time datetime="${post.date}">${post.date.slice(5).replace("-", ".")}</time><div><span class="eyebrow">${post.category}</span><h2>${post.title}</h2><p>${post.summary}</p></div><span class="entry-arrow">${arrow}</span></a>`).join("")}</div></div>`).join("")}<div class="archive-end"><span>— 记录始于 2021 —</span><a href="/" class="text-link">返回首页 ${arrow}</a></div></section></main>`,
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
  const otherPosts = posts.filter((other) => other.slug !== post.slug);
  await write(
    post.path,
    shell({
      title: `${post.title} · Carboniferous`,
      description: post.summary,
      route: post.path,
      kind: "article",
      post,
      content: `<div class="reading-progress" aria-hidden="true"><span></span></div><main id="main"><header class="article-header"><a href="/archives/" class="back-link">← 全部文章</a><div class="article-kicker"><span class="tag">${post.category}</span><span>${post.label}</span><time datetime="${post.date}">${post.date.replaceAll("-", ".")}</time></div><h1>${escape(post.title)}</h1><p class="article-byline">BY HOMALOZOA X <span>/ A PERSONAL JOURNAL</span></p></header><div class="article-layout"><aside class="toc-sidebar"><details class="toc" open><summary>本篇目录 <span>CONTENTS</span></summary><nav aria-label="文章目录"><ol>${toc}</ol></nav></details><a href="#top" class="toc-top">↑ 回到顶部</a></aside><article class="article-body" aria-label="文章正文">${body}</article></div>${otherPosts.length ? `<nav class="next-note" aria-label="继续阅读"><span class="eyebrow">NEXT NOTE / 继续阅读</span><a href="${otherPosts[0].path}"><h2>${escape(otherPosts[0].title)}</h2>${arrow}</a></nav>` : ""}</main>`,
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
    title: "页面未找到 · Carboniferous",
    route: "/404.html",
    kind: "error",
    content: `<main id="main" class="error-page"><p class="eyebrow">PAGE NOT FOUND</p><h1>404<span>页面未找到</span></h1><p>请检查链接地址，或返回首页。</p><a class="read-notes" href="/">返回首页 <span>↗</span></a></main>`,
  }),
);
console.log(
  `Built homepage, ${posts.length} articles, archives, and 404 page.`,
);
