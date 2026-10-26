import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir, rename, rm, cp, mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, "../..");
const slugPattern = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const idPattern = /^[a-f0-9-]{36}$/;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const json = async (file) => JSON.parse(await readFile(file, "utf8"));

async function atomicWrite(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  try {
    await writeFile(temporary, content, { mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw fail("文章超过 2 MB，请缩小后重试。", 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw fail("请求必须是有效的 JSON。"); }
}

function draftInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw fail("草稿格式不正确。");
  const draft = {};
  for (const field of ["title", "summary", "slug", "category", "label", "published", "html"]) {
    if (typeof input[field] !== "string") throw fail(`缺少字段：${field}`);
    draft[field] = field === "html" ? input[field] : input[field].trim();
  }
  if (draft.title.length > 300 || draft.summary.length > 2000) throw fail("标题或摘要过长。");
  return draft;
}

export function createEditorServer(root = defaultRoot) {
  const draftDirectory = path.join(root, ".local/editor/drafts");
  const postsFile = path.join(root, "content/posts.json");
  // Serialize local mutations so autosave and site writes cannot interleave.
  let queue = Promise.resolve();
  const serialize = (task) => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };
  const draftFile = (id) => {
    if (!idPattern.test(id)) throw fail("草稿 ID 不正确。");
    return path.join(draftDirectory, `${id}.json`);
  };
  const readDraft = async (id) => {
    try { return await json(draftFile(id)); }
    catch (error) { if (error.code === "ENOENT") throw fail("草稿不存在。", 404); throw error; }
  };
  const saveDraft = async (draft) => {
    await atomicWrite(draftFile(draft.id), JSON.stringify(draft, null, 2) + "\n");
    return draft;
  };

  async function applyDraft(id) {
    const draft = await readDraft(id);
    if (!draft.title || !draft.summary || !draft.category || !draft.label || !draft.html.trim()) throw fail("请填写标题、摘要、分类和正文。");
    if (!slugPattern.test(draft.slug)) throw fail("网址标识只能使用小写英文字母、数字、短横线和下划线。");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(draft.published) || !Number.isFinite(Date.parse(draft.published))) throw fail("发布时间格式不正确。");
    const previousPosts = await readFile(postsFile, "utf8");
    const posts = JSON.parse(previousPosts);
    const original = draft.originalSlug ? posts.find((post) => post.slug === draft.originalSlug) : null;
    if (draft.originalSlug && !original) throw fail("原文章已被移走，请重新载入。", 409);
    if (original && draft.slug !== original.slug) throw fail("已有文章的网址标识不能在编辑器中修改。");
    if (!original && posts.some((post) => post.slug === draft.slug)) throw fail("这个网址标识已经被使用，请换一个。", 409);
    const date = original?.date || draft.published.slice(0, 10);
    const route = original?.path || `/${date.replaceAll("-", "/")}/${draft.slug}/`;
    const articleFile = path.join(root, "content/posts", `${draft.slug}.html`);
    const previousArticle = await readFile(articleFile, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!original && previousArticle !== null) throw fail("同名正文文件已经存在，请换一个网址标识。", 409);
    const post = { ...original, slug: draft.slug, title: draft.title, date, published: original?.published || draft.published, modified: new Date().toISOString(), category: draft.category, label: draft.label, summary: draft.summary, path: route, cardTitle: [draft.title] };
    const nextPosts = original ? posts.map((item) => item.slug === original.slug ? post : item) : [post, ...posts];
    const temporary = await mkdtemp(path.join(tmpdir(), "blog-editor-"));
    try {
      await cp(root, temporary, { recursive: true, filter: (source) => !/^(?:\.git|\.local|node_modules|output|\.playwright-cli|tools)(?:\/|$)/.test(path.relative(root, source)) });
      await writeFile(path.join(temporary, "content/posts.json"), JSON.stringify(nextPosts, null, 2) + "\n");
      await writeFile(path.join(temporary, "content/posts", `${draft.slug}.html`), draft.html);
      try {
        await run(process.execPath, ["scripts/build.mjs"], { cwd: temporary, timeout: 30000 });
        await run("python3", ["scripts/check.py"], { cwd: temporary, timeout: 30000 });
      } catch (error) {
        throw fail(`本地检查未通过，站点源文件未改动。\n${error.stderr || error.stdout || error.message}`, 422);
      }
      if (await readFile(postsFile, "utf8") !== previousPosts || await readFile(articleFile, "utf8").catch(() => null) !== previousArticle) throw fail("检查期间文章源文件发生变化，请重新载入后再写入。", 409);
      const changes = new Map([["content/posts.json", JSON.stringify(nextPosts, null, 2) + "\n"], [`content/posts/${draft.slug}.html`, draft.html]]);
      async function generated(directory) {
        for (const entry of await readdir(path.join(temporary, directory), { withFileTypes: true })) {
          const relative = path.posix.join(directory, entry.name);
          if (entry.isDirectory() && (directory || /^(?:\d{4}|archives)$/.test(entry.name))) await generated(relative);
          if (entry.isFile() && entry.name.endsWith(".html")) changes.set(relative, await readFile(path.join(temporary, relative), "utf8"));
        }
      }
      await generated("");
      const originals = new Map();
      try {
        for (const [relative, content] of changes) {
          const file = path.join(root, relative);
          const before = await readFile(file, "utf8").catch((error) => { if (error.code === "ENOENT") return null; throw error; });
          if (before === content) continue;
          originals.set(file, before);
          await atomicWrite(file, content);
        }
      } catch (error) {
        for (const [file, before] of originals) {
          if (before === null) await rm(file, { force: true });
          else await atomicWrite(file, before);
        }
        throw error;
      }
      await saveDraft({ ...draft, originalSlug: draft.slug, appliedAt: post.modified });
      return { path: route, message: "已写入本地站点，构建与检查通过。" };
    } finally { await rm(temporary, { recursive: true, force: true }); }
  }

  return createServer(async (req, res) => {
    const send = (status, data, type = "application/json; charset=utf-8") => {
      res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" });
      res.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data));
    };
    try {
      const port = req.socket.localPort;
      const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!allowedHosts.includes(req.headers.host)) throw fail("不允许的主机。", 403);
      const origin = `http://${req.headers.host}`;
      const url = new URL(req.url, origin);
      const pathname = decodeURIComponent(url.pathname);
      if (req.method === "POST") {
        if (req.headers.origin !== origin || req.headers["content-type"]?.split(";")[0] !== "application/json") throw fail("写入请求必须来自本地编辑器。", 403);
      } else if (req.method !== "GET") throw fail("不支持此操作。", 405);
      if (pathname === "/api/library" && req.method === "GET") {
        const files = await readdir(draftDirectory).catch((error) => { if (error.code === "ENOENT") return []; throw error; });
        const drafts = await Promise.all(files.filter((name) => idPattern.test(name.replace(/\.json$/, "")) && name.endsWith(".json")).map((name) => json(path.join(draftDirectory, name))));
        drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return send(200, { posts: await json(postsFile), drafts: drafts.map(({ html, ...draft }) => draft) });
      }
      if (pathname.startsWith("/api/articles/") && req.method === "GET") {
        const slug = pathname.slice("/api/articles/".length);
        const post = (await json(postsFile)).find((item) => item.slug === slug);
        if (!post) throw fail("文章不存在。", 404);
        return send(200, { ...post, originalSlug: post.slug, html: await readFile(path.join(root, "content/posts", `${post.slug}.html`), "utf8") });
      }
      if (pathname === "/api/drafts" && req.method === "POST") {
        const input = await body(req);
        const fields = draftInput(input);
        return send(200, await serialize(async () => {
          const existing = input.id ? await readDraft(input.id) : null;
          const originalSlug = existing?.originalSlug || input.originalSlug || null;
          if (originalSlug && !(await json(postsFile)).some((post) => post.slug === originalSlug)) throw fail("原文章不存在。", 404);
          return saveDraft({ ...existing, ...fields, id: existing?.id || randomUUID(), originalSlug, updatedAt: new Date().toISOString() });
        }));
      }
      if (pathname.startsWith("/api/drafts/") && req.method === "GET") return send(200, await readDraft(pathname.slice("/api/drafts/".length)));
      if (pathname.startsWith("/api/apply/") && req.method === "POST") {
        await body(req);
        return send(200, await serialize(() => applyDraft(pathname.slice("/api/apply/".length))));
      }
      if (pathname.startsWith("/api/")) throw fail("接口不存在。", 404);
      let file;
      if (["/", "/editor.css", "/editor.js"].includes(pathname)) file = path.join(here, pathname === "/" ? "index.html" : pathname.slice(1));
      else {
        if (!/^\/(?:index\.html$|404\.html$|assets\/|images\/|\d{4}\/|archives\/)/.test(pathname) || pathname.split("/").some((part) => part.startsWith("."))) throw fail("页面不存在。", 404);
        file = path.resolve(root, `.${pathname}`);
        if (!file.startsWith(root + path.sep)) throw fail("页面不存在。", 404);
        if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      }
      return send(200, await readFile(file), types[path.extname(file)] || "application/octet-stream");
    } catch (error) {
      send(error.status || (error.code === "ENOENT" ? 404 : 500), { error: error.status ? error.message : error.code === "ENOENT" ? "文件不存在。" : "本地操作失败，请检查终端输出。" });
      if (!error.status && error.code !== "ENOENT") console.error(error);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.BLOG_EDITOR_PORT || 4174);
  const server = createEditorServer();
  server.on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? `端口 ${port} 已占用。可使用 BLOG_EDITOR_PORT=4175 npm run editor。` : error);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => console.log(`海果不能吃 · 写作室 http://127.0.0.1:${port}`));
}
