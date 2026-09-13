"""Check generated pages, local links, anchors, and migrated article content."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
POSTS = json.loads((ROOT / 'content/posts.json').read_text())


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.references = []
        self.h1_count = 0
        self.language = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html':
            self.language = attrs.get('lang')
        if tag == 'h1':
            self.h1_count += 1
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f"Duplicate ID: {attrs['id']}"
            self.ids.add(attrs['id'])
        for name in ('href', 'src'):
            if name in attrs:
                self.references.append(attrs[name])


files = [ROOT / 'index.html', ROOT / '404.html']
files += list((ROOT / 'archives').rglob('index.html'))
files += [ROOT / post['path'].strip('/') / 'index.html' for post in POSTS]
pages = {file: Page(file.read_text()) for file in files}
for file, page in pages.items():
    assert page.language == 'zh-CN', f'{file}: incorrect document language'
    assert page.h1_count == 1, f'{file}: expected one main heading'
    assert 'main' in page.ids, f'{file}: missing main content target'
    for reference in page.references:
        url = urlsplit(reference)
        if url.scheme or url.netloc:
            continue
        if url.path:
            target = ROOT / unquote(url.path).lstrip('/') if url.path.startswith('/') else file.parent / unquote(url.path)
            if target.is_dir():
                target /= 'index.html'
        else:
            target = file
        assert target.is_file(), f'{file}: missing local reference {reference}'
        if url.fragment:
            target_page = pages.get(target) or Page(target.read_text())
            assert unquote(url.fragment) in target_page.ids, f'{file}: missing anchor {reference}'

for post in POSTS:
    source = (ROOT / 'content/posts' / (post['slug'] + '.html')).read_text()
    expected = re.sub(r'<(/?)[hH]([456])(?=[\s>])', lambda m: '<' + m[1] + 'h' + str(int(m[2]) - 2), source)
    if re.search(r'<h[23][\s>]', source, re.I):
        expected = source
    result = (ROOT / post['path'].strip('/') / 'index.html').read_text()
    assert '<article class="article-body" aria-label="文章正文">' + expected + '</article>' in result, f"Article content changed: {post['slug']}"
    for field in ('published', 'modified'):
        assert post[field] in result, f"Original timestamp lost: {post['slug']}"

css = (ROOT / 'assets/site.css').read_text()
for reference in re.findall(r'url\([\'"]?(/[^\)\'\"]+)', css):
    assert (ROOT / reference.lstrip('/')).is_file(), f'Missing CSS asset: {reference}'
assert not re.search(r'(?:hexo-configurations|/js/next-boot|/lib/velocity)', '\n'.join(file.read_text() for file in files)), 'Old theme runtime is still loaded'
print(f'Passed: {len(pages)} pages, local assets, navigation anchors, and {len(POSTS)} complete articles.')
