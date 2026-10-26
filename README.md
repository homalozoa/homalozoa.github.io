# 海果不能吃

Homalozoa 的个人博客。随笔、Linux 与机器人。英文名为 “Homalozoa is not for eating.”。

界面取意于《无人深空》的星际风景：青灰天空、赭红峡谷、象牙白行星和细线导航。首页使用原创风景图，文章与归档延续深青底色和暖白文字。正文、原始日期、永久链接及标题锚点保留；2021 年的技术文章仍是当年的记录。

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

- `content/posts.json`：文章标题、摘要、分类、日期与永久链接。首页、归档与文章页使用相同标题；分类按钮由现有文章自动生成。
- `content/posts/*.html`：文章正文。保留 HTML 源码可以完整迁移原有代码高亮，无需重新安装旧主题。
- `scripts/build.mjs`：公共模板、引文、首页、文章页、按年/月归档及 404 页面生成。
- `assets/site.css`、`assets/site.js`：响应式样式、分类筛选、目录、代码复制与阅读进度。
- `assets/images/`：本地 WebP 风景图及生成说明。
- 根目录、`2021/`、`2026/`、`archives/` 中的 HTML：可直接发布的生成结果，请通过源文件修改并重新生成。

新增文章时，在 `content/posts/` 中创建与 `slug` 同名的 HTML，将文章信息添加到 `content/posts.json`（最新在前），运行构建与检查。`path` 填写以 `/` 开头和结尾的永久链接；`published`、`modified` 使用带时区的 ISO 8601 时间。正文顶层标题使用 `h2` 并设置唯一 `id`，即可生成目录。

首页与归档的分类筛选采用渐进增强：禁用 JavaScript 时显示全部文章。文章目录使用原生 `details`；手机初始收起，桌面初始展开。代码可以横向滚动，复制失败时提供手动选中方式。入场动画只播放一次，遵循 `prefers-reduced-motion`；打印时隐藏导航与装饰并切换为浅色正文。

## 引文

引文核对原文后转为简体字，标点按当前页面排版。作者和作品在页面可见，并附出处链接。

| 位置            | 引文                         | 出处                                                                         |
| --------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| 首页、归档、404 | 人生天地间，忽如远行客。     | 佚名，[《古诗十九首·青青陵上柏》](https://zh.wikisource.org/wiki/古詩十九首) |
| 首页题辞        | 天地有大美而不言。           | 庄子，[《庄子·知北游》](https://zh.wikisource.org/wiki/莊子/知北遊)          |
| 页脚            | 相看两不厌，只有敬亭山。     | 李白，[《独坐敬亭山》](https://zh.wikisource.org/wiki/獨坐敬亭山)            |

不将现代译者的措辞冒充为古代作者原文。

## GitHub Pages

继续兼容原来的分支根目录发布方式：GitHub 仓库的 Settings → Pages → Deploy from a branch，选择 `main` 和 `/ (root)`。根目录 `.nojekyll` 允许直接提供静态内容，不需要 Hexo、Jekyll、GitHub Actions 或运行时服务。

发布时将修改后的源文件和构建结果一并提交，再推送至仓库。当前页面始终使用 `https://homalozoa.github.io` 作为 canonical 地址。代码变更本身不会自动推送或发布。

## 资源

Space Grotesk 从 Google Fonts 获取，字体与 SIL Open Font License 保存在 `assets/fonts/`。中文衬线字使用设备本地字体。旧版 Anton 字体、`images/` 资源和根目录 `LICENSE` 保留。

首页风景由内置 ImageGen 生成，无游戏截图、商标或游戏原有角色；文件、提示词和 WebP 编码参数见 [资源说明](assets/images/README.md)。网站不请求远程图片、字体或脚本。
