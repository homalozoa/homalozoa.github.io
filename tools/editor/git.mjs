import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const error = (message) => Object.assign(new Error(message), { status: 409 });
const splitPaths = (text) => text.split("\0").filter(Boolean);
const generatedPath = (name) => ["index.html", "404.html"].includes(name) || /^(?:archives|\d{4})\/.+\.html$/.test(name);
const siteInput = (name) => /^(?:content|assets|images)\//.test(name) || ["scripts/build.mjs", "scripts/check.py", "CNAME", ".nojekyll"].includes(name);

export function articleGit(root) {
  const git = async (...args) => (await run("git", args, { cwd: root, timeout: 30000, maxBuffer: 4 * 1024 * 1024 })).stdout;

  async function inspect(slug) {
    try {
      if (await realpath((await git("rev-parse", "--show-toplevel")).trim()) !== await realpath(root)) throw error("编辑器目录必须是博客 Git 仓库的根目录。");
      const staged = splitPaths(await git("diff", "--cached", "--name-only", "-z"));
      if (staged.some((name) => siteInput(name) || generatedPath(name))) throw error("站点文件已有暂存改动，请先完成或取消这些暂存；草稿已保留。");
      const dirty = [...new Set([
        ...splitPaths(await git("diff", "--name-only", "-z")),
        ...splitPaths(await git("ls-files", "--others", "--exclude-standard", "-z")),
      ])];
      const unrelated = dirty.filter((name) => siteInput(name) && !["content/posts.json", `content/posts/${slug}.html`].includes(name));
      if (unrelated.length) throw error(`其他站点源文件也有未提交修改，请先单独处理：\n${unrelated.join("\n")}`);
      const headPosts = JSON.parse(await git("show", "HEAD:content/posts.json"));
      const currentPosts = JSON.parse(await readFile(path.join(root, "content/posts.json"), "utf8"));
      if (JSON.stringify(headPosts.filter((post) => post.slug !== slug)) !== JSON.stringify(currentPosts.filter((post) => post.slug !== slug))) throw error("其他文章的信息也有未提交修改，请先单独处理；草稿已保留。");
      return { dirtyGenerated: dirty.filter(generatedPath), existsInGit: headPosts.some((post) => post.slug === slug) };
    } catch (cause) {
      if (cause.status) throw cause;
      throw error(`无法准备 Git 提交，草稿已保留。\n${cause.stderr || cause.message}`);
    }
  }

  async function commit(slug, files, existsInGit) {
    // --only keeps unrelated staged changes out of this article's commit.
    await inspect(slug);
    const pending = new Set([
      ...splitPaths(await git("diff", "HEAD", "--name-only", "-z")),
      ...splitPaths(await git("ls-files", "--others", "--exclude-standard", "-z")),
    ]);
    const selected = files.filter((name) => pending.has(name));
    if (!selected.length) return { commit: (await git("rev-parse", "HEAD")).trim(), created: false };
    try {
      await git("add", "--", ...selected);
      await git("diff", "--cached", "--check", "--", ...selected);
      await git("commit", "--only", "-S", "-m", `docs(content): ${existsInGit ? "update" : "add"} ${slug} article`, "--", ...selected);
    } catch (cause) {
      // Only our paths were staged here; restore their index entries for a retry.
      await git("reset", "--quiet", "HEAD", "--", ...selected).catch(() => {});
      throw error(`本地写入已完成，但 Git 签名提交失败。草稿和站点修改均已保留。\n${cause.stderr || cause.message}`);
    }
    const revision = (await git("rev-parse", "HEAD")).trim();
    try { await git("verify-commit", revision); }
    catch (cause) { throw error(`已创建提交 ${revision.slice(0, 7)}，但签名验证未通过，草稿仍保留。\n${cause.stderr || cause.message}`); }
    return { commit: revision, created: true };
  }

  return { inspect, commit };
}
