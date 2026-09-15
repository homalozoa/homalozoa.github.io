# 海果不能吃

Homalozoa X 的个人博客，收集那些暂时说不出用途的观察、疑问与兴趣。英文名为 “Homalozoa is not for eating.”。界面以少量后现代色块、线条和几何图形作为装饰；文章页提供目录、代码复制和阅读进度。

本站从旧 Hexo / NexT 静态输出迁移而来。两篇历史文章的正文、代码、发布时间、修改时间和永久链接均保留；正文标题从 `h4` 调整为 `h2`，原有标题锚点不变。文章仍是 2021 年的记录，重构不代表技术内容已更新。

## 本地开发

需要 Node.js 20 或更高版本，无 npm 依赖，无需安装。检查脚本使用 Python 3 标准库。

```sh
npm run dev
```

打开 http://127.0.0.1:4173。开发服务器仅监听本机，仅提供公开页面与静态资源，不暴露 Git 和源文件。服务器启动时自动生成页面；修改模板或文章后运行 `npm run build` 并刷新页面。修改 CSS 或浏览器脚本后直接刷新。

```sh
npm run build
npm run check
```

检查涵盖所有页面、站内路径、标题锚点、字体与图片引用、历史正文和时间信息的保留情况。

## 写作与维护

- `content/posts.json`：文章标题、摘要、分类、日期与永久链接。可选的 `cardTitle` 数组控制首页标题分行；省略时直接使用文章标题。分类不限于技术；其他分类默认使用文章序号封面，不会套用 Linux 或 ROS 的图案。
- `content/posts/*.html`：文章正文。保留 HTML 源码可以完整迁移原有代码高亮，无需重新安装旧主题。
- `scripts/build.mjs`：公共模板、首页、文章页、按年/月归档及 404 页面生成。
- `assets/site.css`、`assets/site.js`：网站样式及文章页渐进增强。
- 根目录、`2021/`、`archives/` 中的 HTML：可直接发布的生成结果，请通过源文件修改并重新生成。

新增文章时，在 `content/posts/` 中创建与 `slug` 同名的 HTML，将文章信息添加到 `content/posts.json`（最新在前），运行构建与检查。`path` 填写以 `/` 开头和结尾的永久链接；`published`、`modified` 使用带时区的 ISO 8601 时间。正文顶层标题使用 `h2` 并设置唯一 `id`，即可生成目录。

## GitHub Pages

继续兼容原来的分支根目录发布方式：GitHub 仓库的 Settings → Pages → Deploy from a branch，选择 `main` 和 `/ (root)`。根目录 `.nojekyll` 允许直接提供静态内容，不需要 Hexo、Jekyll、GitHub Actions 或运行时服务。

发布时将修改后的源文件和构建结果一并提交，再推送至仓库。当前页面始终使用 `https://homalozoa.github.io` 作为 canonical 地址。代码变更本身不会自动推送或发布。

## 资源

字体 Anton 与 Space Grotesk 从 Google Fonts 获取，已保存在 `assets/fonts/`，各自 SIL Open Font License 同目录保留。

## 视觉与操作原则

首页以内容为主，只保留珊瑚橙、钴蓝和黄绿色的几何装饰。标题和最近文章在首屏内即可出现，正文使用正常字体、行距和列宽；移动端改为单列，整页没有水平滚动。除滚动和链接状态外不使用持续动画。

旧站 `images/` 资源和根目录 `LICENSE` 保留。

## 首页引文

首页题辞节选自 Octavia E. Butler 的《播种者寓言》（_Parable of the Sower_, 1993）。英文依据 [Hachette 出版社页面](https://www.hachette.co.nz/octavia-e-butler/parable-of-the-sower-the-new-york-times-bestseller) 核对，中文为本站译文，不冒用已出版中译本的措辞或译者署名。页面显示作者、作品、年份与出处链接。
