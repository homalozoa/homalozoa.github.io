import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEditorServer } from "./server.mjs";
import { request } from "node:http";

test("local writing, safe requests, and checked site updates", async (t) => {
  const source = fileURLToPath(new URL("../../", import.meta.url));
  const root = await mkdtemp(path.join(tmpdir(), "blog-editor-test-"));
  await cp(source, root, { recursive: true, filter: (file) => !/^(?:\.git|\.local|node_modules|output|\.playwright-cli)(?:\/|$)/.test(path.relative(source, file)) });
  const server = createEditorServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const post = (route, data, headers = {}) => fetch(origin + route, { method: "POST", headers: { "content-type": "application/json", origin, ...headers }, body: JSON.stringify(data) });
  const article = { title: "测试文章", slug: "editor-test", summary: "本地编辑器测试。", category: "ESSAY", label: "观察与思考", published: "2026-10-26T20:30:00+08:00", html: '<h2 id="start">开始</h2>\n<p>只在本地写作。</p>\n' };
  let draft;

  await t.test("reject foreign writes and DNS rebinding hosts", async () => {
    assert.equal((await post("/api/drafts", article, { origin: "https://example.com" })).status, 403);
    assert.equal((await post("/api/drafts", article, { origin: "" })).status, 403);
    const reboundStatus = await new Promise((resolve, reject) => {
      const req = request(origin + "/api/library", { headers: { host: "example.com" } }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on("error", reject);
      req.end();
    });
    assert.equal(reboundStatus, 403);
    assert.equal((await fetch(origin + "/.git/config")).status, 404);
    assert.equal((await fetch(origin + "/content/posts.json")).status, 404);
  });
  await t.test("save drafts without changing the website; survive a server restart", async () => {
    const before = await readFile(path.join(root, "content/posts.json"), "utf8");
    const response = await post("/api/drafts", article);
    assert.equal(response.status, 200);
    draft = await response.json();
    assert.equal(await readFile(path.join(root, "content/posts.json"), "utf8"), before);
    assert.equal((await fetch(origin + `/.local/editor/drafts/${draft.id}.json`)).status, 404);
    const library = await (await fetch(origin + "/api/library")).json();
    assert.equal(library.drafts[0].title, article.title);
    const second = createEditorServer(root);
    await new Promise((resolve) => second.listen(0, "127.0.0.1", resolve));
    try {
      const restored = await (await fetch(`http://127.0.0.1:${second.address().port}/api/drafts/${draft.id}`)).json();
      assert.equal(restored.html, article.html);
    } finally { await new Promise((resolve) => second.close(resolve)); }
  });
  await t.test("invalid references fail before touching site sources or output", async () => {
    const before = await readFile(path.join(root, "index.html"), "utf8");
    const bad = await (await post("/api/drafts", { ...article, slug: "broken-reference", html: '<p><img src="/images/does-not-exist.png" alt="missing"></p>' })).json();
    const response = await post(`/api/apply/${bad.id}`, {});
    assert.equal(response.status, 422);
    assert.equal(await readFile(path.join(root, "index.html"), "utf8"), before);
    await assert.rejects(readFile(path.join(root, "content/posts/broken-reference.html")), { code: "ENOENT" });
  });
  await t.test("apply a draft, regenerate navigation, and preserve article URL on later edits", async () => {
    let response = await post(`/api/apply/${draft.id}`, {});
    assert.equal(response.status, 200, await response.clone().text());
    const applied = await response.json();
    assert.equal(applied.path, "/2026/10/26/editor-test/");
    assert.match(await (await fetch(origin + applied.path)).text(), /只在本地写作/);
    assert.match(await readFile(path.join(root, "index.html"), "utf8"), /测试文章/);
    const stored = await (await fetch(origin + `/api/drafts/${draft.id}`)).json();
    assert.equal(stored.originalSlug, article.slug);
    await post("/api/drafts", { ...stored, title: "修改后的文章", published: "2026-11-01T12:00:00+08:00" });
    response = await post(`/api/apply/${draft.id}`, {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).path, applied.path);
    const posts = JSON.parse(await readFile(path.join(root, "content/posts.json"), "utf8"));
    assert.equal(posts[0].published, article.published);
    assert.equal(posts[0].title, "修改后的文章");
  });
  await t.test("duplicate slugs and invalid paths cannot overwrite existing articles", async () => {
    const duplicate = await (await post("/api/drafts", article)).json();
    assert.equal((await post(`/api/apply/${duplicate.id}`, {})).status, 409);
    const traversal = await (await post("/api/drafts", { ...article, slug: "../../escape" })).json();
    assert.equal((await post(`/api/apply/${traversal.id}`, {})).status, 400);
  });
});
