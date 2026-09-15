// All articles, links, and the table of contents work without JavaScript.
const article = document.querySelector(".article-body");
if (article) {
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  document.body.append(status);

  for (const figure of article.querySelectorAll("figure.highlight")) {
    const pre = figure.querySelector(".code pre");
    if (!pre) continue;
    const caption = document.createElement("figcaption");
    const label = document.createElement("span");
    label.textContent =
      [...figure.classList].find((value) => value !== "highlight") || "CODE";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "复制代码";
    copy.addEventListener("click", async () => {
      const lines = [...pre.querySelectorAll(":scope > .line")];
      const code = lines.length
        ? lines.map((line) => line.textContent).join("\n")
        : pre.textContent;
      try {
        await navigator.clipboard.writeText(code);
        copy.textContent = "已复制 ✓";
        status.textContent = "代码已复制到剪贴板";
      } catch {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = "请手动复制";
        status.textContent = "已选中代码，请按系统复制快捷键";
      }
      setTimeout(() => {
        copy.textContent = "复制代码";
      }, 2200);
    });
    caption.append(label, copy);
    figure.prepend(caption);
    const table = figure.querySelector("table");
    const viewport = document.createElement("div");
    viewport.className = "code-viewport";
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", "代码，可横向滚动");
    table.before(viewport);
    viewport.append(table);
  }

  const toc = document.querySelector(".toc");
  if (toc && window.matchMedia("(max-width: 900px)").matches) toc.open = false;
  const tocLinks = [...(toc?.querySelectorAll("a") ?? [])];
  const headings = [...article.querySelectorAll("h2[id]")];
  const progress = document.querySelector(".reading-progress span");
  let scheduled = false;
  const updateReading = () => {
    const start = article.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(1, article.offsetHeight - window.innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, (window.scrollY - start) / distance))})`;
    let current;
    for (const heading of headings)
      if (heading.getBoundingClientRect().top <= 160) current = heading.id;
    for (const link of tocLinks) {
      if (decodeURIComponent(link.hash.slice(1)) === current)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    scheduled = false;
  };
  const scheduleUpdate = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateReading);
    }
  };
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateReading();
}
