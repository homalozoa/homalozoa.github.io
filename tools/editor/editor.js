const $ = (id) => document.getElementById(id);
const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let library = { posts: [], drafts: [] };
let article = blank();
let revision = 0;
let savedRevision = 0;
let saveChain = Promise.resolve();
let autosave;
let previewTimer;
let sourceMode = false;
let libraryTab = "drafts";
let selection;
let insertMode = "link";
let busy = false;
const recoveryKey = "homalozoa-editor-recovery";
const lastKey = "homalozoa-editor-last-draft";

function storage(action, key, value) {
  try { return localStorage[action](key, value); }
  catch { $("disk-status").textContent = "浏览器备份不可用 · 请及时保存到磁盘"; return null; }
}

function localDate(value = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)).replace(" ", "T");
}

function blank() {
  return { title: "", slug: "", summary: "", category: "ESSAY", label: "观察与思考", published: `${localDate()}:00+08:00`, html: "", originalSlug: null };
}

async function api(route, data) {
  const response = await fetch(route, data === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "操作未完成，请重试。");
  return result;
}

function notice(message, error = false, route = null) {
  const box = $("notice");
  box.hidden = false;
  box.classList.toggle("error", error);
  box.textContent = message;
  if (route) {
    const link = document.createElement("a");
    link.href = route;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "打开本地文章 ↗";
    box.append(link);
  }
}

// HTML remains the on-disk article format; the editable DOM only receives passive markup.
function passiveHTML(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set("p div span br hr h2 h3 h4 h5 h6 strong b em i u s del mark sub sup a img ul ol li blockquote pre code figure figcaption table thead tbody tfoot tr td th caption dl dt dd details summary kbd samp time".split(" "));
  const attrs = new Set(["id", "class", "href", "src", "alt", "title", "colspan", "rowspan", "start", "datetime", "open"]);
  for (const element of [...doc.body.querySelectorAll("*")]) {
    if (!allowed.has(element.localName)) {
      if (["script", "style", "iframe", "object", "embed", "svg", "math", "template"].includes(element.localName)) element.remove();
      else element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attribute of [...element.attributes]) {
      if (!attrs.has(attribute.name)) { element.removeAttribute(attribute.name); continue; }
      if (["href", "src"].includes(attribute.name) && !safeURL(attribute.value, element.localName === "img")) element.removeAttribute(attribute.name);
    }
    if (element.localName === "a") element.setAttribute("rel", "noopener noreferrer");
  }
  return doc.body.innerHTML;
}

function safeURL(value, image = false) {
  try {
    const url = new URL(value, location.origin);
    return ["http:", "https:", ...(image ? [] : ["mailto:"])].includes(url.protocol) || (image && /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value));
  } catch { return false; }
}

function headingIDs() {
  const used = new Set([...$("body").querySelectorAll("[id]")].map((node) => node.id));
  let index = 1;
  for (const heading of $("body").querySelectorAll("h2,h3")) {
    if (heading.id) continue;
    while (used.has(`section-${index}`)) index++;
    heading.id = `section-${index++}`;
    used.add(heading.id);
  }
}

function renderPreview() {
  $("title").style.height = "auto";
  $("title").style.height = `${Math.max(95, $("title").scrollHeight)}px`;
  const text = new DOMParser().parseFromString(article.html, "text/html").body.textContent || "";
  const count = [...text.replace(/\s/g, "")].length;
  $("word-count").textContent = `${count.toLocaleString()} 字 · 约 ${Math.max(1, Math.ceil(count / 400))} 分钟`;
  $("writing-label").textContent = article.label || "观察与思考";
  $("document-name").textContent = article.title || "新的草稿";
  const post = article.originalSlug && library.posts.find((post) => post.slug === article.originalSlug);
  $("path-preview").textContent = post?.path || (article.slug ? `/${article.published.slice(0, 10).replaceAll("-", "/")}/${article.slug}/` : "填写网址标识后显示");
  const body = passiveHTML(article.html);
  const doc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/site.css"><style>html{scroll-behavior:auto}body{min-width:0}.article-header{padding:35px 28px 28px}.article-header h1{font-size:30px;line-height:1.6;margin:22px 0}.article-layout{display:block;width:auto;padding:22px 28px 50px}.article-body{font-size:14px}.article-body h2{font-size:23px}.preview-empty{color:#68868a;line-height:2;padding:25px 0}.article-kicker{flex-wrap:wrap;gap:15px}@media(max-width:400px){.article-header{padding:30px 22px 25px}.article-header h1{font-size:26px}.article-layout{padding:20px 22px 45px}}</style></head><body class="page-article"><header class="article-header"><div class="article-heading-inner"><div class="article-kicker"><span class="tag">${escape(article.label || "观察与思考")}</span><time>${escape(article.published.slice(0, 10).replaceAll("-", "."))}</time></div><h1>${escape(article.title || "尚未命名的想法")}</h1><p class="article-byline">HOMALOZOA <span>/ 海果</span></p></div></header><main class="article-layout"><article class="article-body">${body || '<p class="preview-empty">文字落下的地方，<br>也会在这里慢慢成形。</p>'}</article></main></body></html>`;
  const frame = $("preview");
  const scroll = frame.contentDocument?.documentElement.scrollTop || 0;
  frame.onload = () => { if (frame.contentDocument) frame.contentDocument.documentElement.scrollTop = scroll; };
  frame.srcdoc = doc;
}

function renderLibrary() {
  $("draft-count").textContent = library.drafts.length;
  $("post-count").textContent = library.posts.length;
  $("draft-tab").setAttribute("aria-selected", libraryTab === "drafts");
  $("post-tab").setAttribute("aria-selected", libraryTab === "posts");
  const query = $("search").value.trim().toLowerCase();
  const items = library[libraryTab].filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query));
  const list = $("article-list");
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = query ? "没有找到这篇文字。" : "这里留给还在生长的想法。\n开始写，草稿会自动留下来。";
    list.append(empty);
  }
  for (const item of items) {
    const button = document.createElement("button");
    button.className = "article-item";
    button.classList.toggle("active", libraryTab === "drafts" ? item.id === article?.id : item.slug === article?.originalSlug);
    button.innerHTML = `<strong>${escape(item.title || "未命名草稿")}</strong><p>${escape(item.summary || "还没有摘要，想法正在成形。")}</p><time>${escape((item.updatedAt || item.date).slice(0, 10).replaceAll("-", "."))} · ${libraryTab === "drafts" ? "本地草稿" : "站点文章"}</time>`;
    button.addEventListener("click", () => task(async () => {
      await persist();
      const draft = libraryTab === "posts" ? library.drafts.find((draft) => draft.originalSlug === item.slug) : null;
      load(await api(libraryTab === "drafts" ? `/api/drafts/${item.id}` : draft ? `/api/drafts/${draft.id}` : `/api/articles/${item.slug}`));
    }));
    list.append(button);
  }
}

async function refreshLibrary() { library = await api("/api/library"); renderLibrary(); }

function load(value, recovered = false, remember = true) {
  article = value;
  revision = recovered ? 1 : 0;
  savedRevision = 0;
  sourceMode = false;
  $("source-toggle").setAttribute("aria-pressed", "false");
  for (const button of document.querySelectorAll(".format-bar button")) button.disabled = false;
  $("source").hidden = true;
  $("body").hidden = false;
  $("body").innerHTML = passiveHTML(article.html);
  $("source").value = article.html;
  for (const name of ["title", "slug", "summary", "category", "label"]) $(name).value = article[name] || "";
  $("published").value = Number.isFinite(Date.parse(article.published)) ? localDate(article.published) : "";
  $("slug").readOnly = !!article.originalSlug;
  $("published").readOnly = !!article.originalSlug;
  $("save-status").textContent = recovered ? "已恢复未保存内容" : article.id ? "已保存到本机" : article.originalSlug ? "从站点载入" : "等待落笔";
  $("source-hint").textContent = "草稿自动保存在本机";
  $("notice").hidden = true;
  if (remember) {
    if (article.id) storage("setItem", lastKey, article.id);
    else storage("removeItem", lastKey);
  }
  renderLibrary();
  renderPreview();
  if (recovered) autosave = setTimeout(() => task(persist), 800);
}

function changed() {
  revision++;
  $("save-status").textContent = "等待保存…";
  storage("setItem", recoveryKey, JSON.stringify(article));
  clearTimeout(autosave);
  autosave = setTimeout(() => task(persist), 800);
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 180);
}

function persist(force = false) {
  clearTimeout(autosave);
  saveChain = saveChain.catch(() => {}).then(async () => {
    if (!force && revision === savedRevision) return article;
    const version = revision;
    $("save-status").textContent = "正在保存…";
    try {
      const result = await api("/api/drafts", article);
      article.id = result.id;
      article.updatedAt = result.updatedAt;
      savedRevision = version;
      storage("setItem", lastKey, article.id);
      if (version === revision) storage("removeItem", recoveryKey);
      $("save-status").textContent = version === revision ? "已保存到本机" : "等待保存…";
      $("source-hint").textContent = `上次保存 ${new Date(result.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
      await refreshLibrary();
      return article;
    } catch (error) { $("save-status").textContent = "保存失败 · 请重试"; throw error; }
  });
  return saveChain;
}

async function task(operation) {
  try { await operation(); }
  catch (error) { notice(error.message, true); }
}

function readBody() {
  headingIDs();
  article.html = $("body").innerHTML;
  changed();
}

for (const field of ["title", "slug", "summary", "category", "label"]) $(field).addEventListener("input", () => { article[field] = $(field).value; changed(); });
$("published").addEventListener("input", () => { article.published = `${$("published").value}:00+08:00`; changed(); });
$("body").addEventListener("input", readBody);
$("body").addEventListener("paste", (event) => {
  event.preventDefault();
  const html = event.clipboardData.getData("text/html");
  if (html) document.execCommand("insertHTML", false, passiveHTML(html));
  else document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  readBody();
});
$("body").addEventListener("drop", (event) => { event.preventDefault(); notice("请通过工具栏插入图片路径，或将文字粘贴进正文。"); });
$("body").addEventListener("click", (event) => { if (event.target.closest("a")) event.preventDefault(); });
$("source").addEventListener("input", () => { article.html = $("source").value; changed(); });
$("source-toggle").addEventListener("click", () => {
  sourceMode = !sourceMode;
  $("source-toggle").setAttribute("aria-pressed", sourceMode);
  $("source").hidden = !sourceMode;
  $("body").hidden = sourceMode;
  for (const button of document.querySelectorAll(".format-bar button:not(#source-toggle)")) button.disabled = sourceMode;
  if (sourceMode) { $("source").value = article.html; $("source").focus(); }
  else { $("body").innerHTML = passiveHTML(article.html); $("body").focus(); }
});
for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => { $("body").focus(); document.execCommand(button.dataset.command, false, button.dataset.value || null); readBody(); });
}

for (const mode of ["link", "image", "code"]) $(mode).addEventListener("click", () => {
  const range = window.getSelection();
  selection = range.rangeCount && $("body").contains(range.anchorNode) ? range.getRangeAt(0).cloneRange() : null;
  insertMode = mode;
  $("insert-title").textContent = { link: "插入链接", image: "插入图片", code: "插入代码块" }[mode];
  $("url-label").hidden = mode === "code";
  $("text-label").hidden = mode === "code";
  $("code-label").hidden = mode !== "code";
  $("insert-help").hidden = mode !== "image";
  $("insert-url").required = mode !== "code";
  $("insert-url").value = "";
  $("insert-text").value = selection?.toString() || "";
  $("insert-code").value = selection?.toString() || "";
  $("insert-dialog").showModal();
});
$("cancel-insert").addEventListener("click", () => $("insert-dialog").close());
$("insert-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const url = $("insert-url").value.trim();
  if (insertMode !== "code" && !safeURL(url, insertMode === "image")) { $("insert-url").setCustomValidity("请填写 http、https 或本地资源路径。"); $("insert-url").reportValidity(); return; }
  const text = $("insert-text").value;
  const html = insertMode === "code" ? `<pre><code>${escape($("insert-code").value)}</code></pre><p><br></p>` : insertMode === "image" ? `<figure><img src="${escape(url)}" alt="${escape(text)}">${text ? `<figcaption>${escape(text)}</figcaption>` : ""}</figure><p><br></p>` : `<a href="${escape(url)}" rel="noopener noreferrer">${escape(text || url)}</a>`;
  $("insert-dialog").close();
  $("body").focus();
  const range = window.getSelection();
  range.removeAllRanges();
  if (selection) range.addRange(selection);
  else { const end = document.createRange(); end.selectNodeContents($("body")); end.collapse(false); range.addRange(end); }
  document.execCommand("insertHTML", false, html);
  readBody();
});
$("insert-url").addEventListener("input", () => $("insert-url").setCustomValidity(""));

for (const button of document.querySelectorAll("button[data-view]")) button.addEventListener("click", () => {
  $("work-area").dataset.view = button.dataset.view;
  for (const other of document.querySelectorAll("button[data-view]")) other.setAttribute("aria-pressed", other === button);
});
for (const [id, mobile] of [["desktop-preview", false], ["mobile-preview", true]]) $(id).addEventListener("click", () => {
  document.querySelector(".preview-stage").classList.toggle("mobile", mobile);
  $("desktop-preview").setAttribute("aria-pressed", !mobile);
  $("mobile-preview").setAttribute("aria-pressed", mobile);
});
function settings(open) { $("metadata").hidden = !open; $("settings").setAttribute("aria-expanded", open); }
$("settings").addEventListener("click", () => settings($("metadata").hidden));
$("close-settings").addEventListener("click", () => settings(false));
$("draft-tab").addEventListener("click", () => { libraryTab = "drafts"; renderLibrary(); });
$("post-tab").addEventListener("click", () => { libraryTab = "posts"; renderLibrary(); });
$("search").addEventListener("input", renderLibrary);
$("new").addEventListener("click", () => task(async () => { await persist(); load(blank()); libraryTab = "drafts"; renderLibrary(); $("title").focus(); }));
$("save").addEventListener("click", () => task(async () => { await persist(true); notice("草稿已保存到本机。"); }));
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); task(() => persist(true)); }
  if (event.key === "Escape") settings(false);
});
window.addEventListener("beforeunload", (event) => { if (revision !== savedRevision) { event.preventDefault(); event.returnValue = ""; } });

$("apply").addEventListener("click", () => task(async () => {
  if (busy) return;
  if (!article.title.trim() || !article.summary.trim() || !article.slug.trim() || !article.html.trim() || !article.category.trim() || !article.label.trim()) {
    settings(true);
    notice("请先填写标题、正文，以及文章设置中的网址标识、分类和摘要。", true);
    return;
  }
  busy = true;
  for (const pane of document.querySelectorAll(".writing-pane,.metadata,.library,.utility-actions")) pane.inert = true;
  $("apply").disabled = true;
  $("apply").textContent = "正在构建与检查…";
  try {
    await persist(true);
    const result = await api(`/api/apply/${article.id}`, {});
    article.originalSlug = article.slug;
    $("slug").readOnly = true;
    $("published").readOnly = true;
    await refreshLibrary();
    notice(result.message + " 文件已留在工作区，可通过 Git 审阅与提交。", false, result.path);
  } finally {
    busy = false;
    for (const pane of document.querySelectorAll(".writing-pane,.metadata,.library,.utility-actions")) pane.inert = false;
    $("apply").disabled = false;
    $("apply").innerHTML = '写入本地站点 <span>↗</span>';
  }
}));

$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(article, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${article.slug || "untitled"}.draft.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", () => task(async () => {
  const file = $("import-file").files[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error("文件超过 2 MB。");
    const text = await file.text();
    const value = blank();
    if (file.name.endsWith(".json")) {
      const imported = JSON.parse(text);
      for (const key of Object.keys(value)) if (key !== "originalSlug" && typeof imported[key] === "string") value[key] = imported[key];
    } else {
      const doc = new DOMParser().parseFromString(text, "text/html");
      value.title = doc.querySelector("h1")?.textContent || file.name.replace(/\.[^.]+$/, "");
      value.html = file.name.endsWith(".txt") ? `<p>${escape(text).replace(/\n/g, "<br>")}</p>` : (doc.querySelector(".article-body") || doc.body).innerHTML;
    }
    value.html = passiveHTML(value.html);
    if (!Number.isFinite(Date.parse(value.published))) throw new Error("草稿中的时间无效。");
    await persist();
    load(value);
    changed();
    settings(true);
    notice("已导入为新的本地草稿。请检查文章设置后继续写作。");
  } finally { $("import-file").value = ""; }
}));

load(blank(), false, false);
await task(async () => {
  await refreshLibrary();
  const recovery = storage("getItem", recoveryKey);
  if (recovery) {
    try { const value = JSON.parse(recovery); if (typeof value.html === "string" && typeof value.published === "string") { load(value, true); return; } } catch { /* Ignore a damaged browser backup. */ }
  }
  const last = storage("getItem", lastKey);
  if (last && library.drafts.some((draft) => draft.id === last)) load(await api(`/api/drafts/${last}`));
  else load(blank());
});
