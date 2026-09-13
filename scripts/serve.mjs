import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./build.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".png": "image/png",
  ".gif": "image/gif",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    if (
      !/^\/(?:$|index\.html$|404\.html$|assets\/|images\/|\d{4}\/|archives\/)/.test(
        pathname,
      )
    )
      throw new Error("Not found");
    let file = path.resolve(root, "." + pathname);
    if (
      (file !== path.resolve(root) && !file.startsWith(root)) ||
      pathname.split("/").some((part) => part.startsWith("."))
    )
      throw new Error("Not found");
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { Location: url.pathname + "/" + url.search });
        res.end();
        return;
      }
      file = path.join(file, "index.html");
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      await readFile(path.join(root, "404.html")).catch(() => "Not found"),
    );
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log("Carboniferous: http://127.0.0.1:4173"),
);
