import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEditorServer } from "./server.mjs";
import { request } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

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

test("signed article commits and recoverable draft removal", async (t) => {
  const source = fileURLToPath(new URL("../../", import.meta.url));
  const root = await mkdtemp(path.join(tmpdir(), "blog-editor-git-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(source, root, { recursive: true, filter: (file) => !/^(?:\.git|\.local|node_modules|output|\.playwright-cli)(?:\/|$)/.test(path.relative(source, file)) });
  const git = async (...args) => (await run("git", args, { cwd: root })).stdout.trim();
  await git("init", "-q");
  for (const key of ["user.name", "user.email", "user.signingkey"]) {
    const value = (await run("git", ["config", "--get", key], { cwd: source })).stdout.trim();
    await git("config", "--local", key, value);
  }
  await writeFile(path.join(root, "notes.txt"), "unrelated original\n");
  await git("add", ".");
  await git("commit", "-S", "-qm", "test: prepare isolated blog repository");
  const server = createEditorServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (route, data) => fetch(origin + route, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(data) });
  const article = { title: "签名提交文章", slug: "signed-editor-test", summary: "签名与草稿生命周期测试。", category: "ESSAY", label: "观察与思考", published: "2026-10-26T20:30:00+08:00", html: '<h2 id="start">开始</h2>\n<p>先提交，再移除草稿。</p>\n' };
  let draft;
  let committed;

  await t.test("commit only this article, verify its signature, then trash its draft", async () => {
    await writeFile(path.join(root, "notes.txt"), "unrelated staged changes\n");
    await git("add", "notes.txt");
    await writeFile(path.join(root, "unrelated.html"), "unrelated untracked page\n");
    draft = await (await post("/api/drafts", article)).json();
    const response = await post(`/api/apply/${draft.id}`, { commit: true });
    assert.equal(response.status, 200, await response.clone().text());
    committed = await response.json();
    assert.equal(committed.created, true);
    assert.equal(committed.draftRemoved, true);
    assert.equal(committed.commit, await git("rev-parse", "HEAD"));
    await git("verify-commit", committed.commit);
    assert.equal(await git("diff", "--cached", "--name-only"), "notes.txt");
    const files = await git("show", "--format=", "--name-only", "HEAD");
    assert.match(files, /content\/posts\/signed-editor-test\.html/);
    assert.doesNotMatch(files, /notes\.txt|unrelated\.html|tools\/editor/);
    assert.equal((await fetch(origin + `/api/drafts/${draft.id}`)).status, 404);
    const library = await (await fetch(origin + "/api/library")).json();
    assert.equal(library.trash.find((item) => item.id === draft.id).title, article.title);
    assert.equal(await git("show", `HEAD:content/posts/${article.slug}.html`), article.html.trim());
    await git("reset", "-q", "HEAD", "--", "notes.txt");
    await writeFile(path.join(root, "notes.txt"), "unrelated original\n");
  });
  await t.test("restoring and committing unchanged content creates no duplicate commit", async () => {
    assert.equal((await post(`/api/restore/${draft.id}`, {})).status, 200);
    const response = await post(`/api/apply/${draft.id}`, { commit: true });
    assert.equal(response.status, 200, await response.clone().text());
    const result = await response.json();
    assert.equal(result.created, false);
    assert.equal(result.commit, committed.commit);
    assert.equal(result.draftRemoved, true);
  });
  await t.test("signing failure retains the draft and site changes; retry succeeds", async () => {
    const failure = await (await post("/api/drafts", { ...article, slug: "signing-failure" })).json();
    await mkdir(path.join(root, ".local"), { recursive: true });
    const program = path.join(root, ".local/failing-gpg");
    await writeFile(program, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    await git("config", "gpg.program", program);
    try {
      const response = await post(`/api/apply/${failure.id}`, { commit: true });
      assert.equal(response.status, 409);
      assert.match((await response.json()).error, /签名提交失败/);
      assert.equal(await git("rev-parse", "HEAD"), committed.commit);
      const saved = await (await fetch(origin + `/api/drafts/${failure.id}`)).json();
      assert.equal(saved.html, article.html);
      assert.equal(saved.originalSlug, "signing-failure");
      assert.equal(await git("diff", "--cached", "--name-only"), "");
    } finally { await git("config", "--unset", "gpg.program"); }
    const response = await post(`/api/apply/${failure.id}`, { commit: true });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).draftRemoved, true);
    await git("verify-commit", "HEAD");
  });
  await t.test("unrelated article changes and staged site files are preserved", async () => {
    const blocked = await (await post("/api/drafts", { ...article, slug: "blocked-editor-test" })).json();
    const other = path.join(root, "content/posts/agent-authorship.html");
    const before = await readFile(other, "utf8");
    const postsBefore = await readFile(path.join(root, "content/posts.json"), "utf8");
    await writeFile(other, before + "\n<p>Unrelated user work.</p>\n");
    const response = await post(`/api/apply/${blocked.id}`, { commit: true });
    assert.equal(response.status, 409);
    assert.equal(await readFile(path.join(root, "content/posts.json"), "utf8"), postsBefore);
    await git("add", "content/posts/agent-authorship.html");
    const staged = await git("diff", "--cached");
    assert.equal((await post(`/api/apply/${blocked.id}`, { commit: true })).status, 409);
    assert.equal(await git("diff", "--cached"), staged);
    assert.equal((await fetch(origin + `/api/drafts/${blocked.id}`)).status, 200);
    await git("reset", "-q", "HEAD", "--", "content/posts/agent-authorship.html");
    await writeFile(other, before);
  });
  await t.test("manual trash removal is reversible and cannot resurrect by autosave", async () => {
    const manual = await (await post("/api/drafts", { ...article, slug: "manual-trash" })).json();
    const before = await git("rev-parse", "HEAD");
    assert.equal((await post(`/api/trash/${manual.id}`, {})).status, 200);
    assert.equal((await post("/api/drafts", manual)).status, 404);
    assert.equal(await git("rev-parse", "HEAD"), before);
    const response = await post(`/api/restore/${manual.id}`, {});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).html, article.html);
    assert.equal((await post("/api/apply/invalid", { commit: "yes" })).status, 400);
  });
  await t.test("validation and hand-edited output failures leave drafts and Git untouched", async () => {
    const head = await git("rev-parse", "HEAD");
    const broken = await (await post("/api/drafts", { ...article, slug: "invalid-link", html: '<p><img src="/images/not-here.png" alt="missing"></p>' })).json();
    assert.equal((await post(`/api/apply/${broken.id}`, { commit: true })).status, 422);
    assert.equal((await fetch(origin + `/api/drafts/${broken.id}`)).status, 200);
    const file = path.join(root, "index.html");
    const before = await readFile(file, "utf8");
    const manual = before + "\n<!-- user edit -->\n";
    await writeFile(file, manual);
    try {
      const response = await post(`/api/apply/${broken.id}`, { commit: true });
      assert.equal(response.status, 409);
      assert.match((await response.json()).error, /生成页面有单独修改/);
      assert.equal(await readFile(file, "utf8"), manual);
      assert.equal(await git("rev-parse", "HEAD"), head);
    } finally { await writeFile(file, before); }
  });
});
