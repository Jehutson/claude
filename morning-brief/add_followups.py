#!/usr/bin/env python3
"""Add the Follow-ups checklist to a rendered Morning Brief.

usage: add_followups.py BRIEF.html TASKS.json OUT.html

TASKS.json: {"date": "YYYY-MM-DD", "tasks": [{"id", "text", "href", "meta", "done", "since"}]}

The output is written in the exact document shape the `artifact` capability
publishes, so the page can republish itself when a box is ticked. Publish it
with capabilities {"artifact": {}}.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKELETON = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport '
            'content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'
            ':root{color-scheme:light}body{margin:0;padding:0;font:14px -apple-system,'
            'BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}'
            '[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>')


def main(src, tasks_path, out):
    html = Path(src).read_text()
    state = json.loads(Path(tasks_path).read_text())

    title = re.search(r'<title>.*?</title>', html, re.S).group(0)
    # The brief's own stylesheet is the one defining the --bg token.
    styles = re.findall(r'<style[^>]*>.*?</style>', html, re.S)
    css = next(s for s in styles if '--bg' in s)
    css = re.sub(r'\s*/\* Follow-ups checklist.*?(?=</style>)', '', css, flags=re.S)  # idempotent
    css = re.sub(r'^<style[^>]*>', '<style id="brief-css">', css)
    css = css.replace('</style>', '\n' + (HERE / 'followups.css').read_text() + '</style>')

    top = re.search(r'<div class="band top">.*?</div></div>\s*(?=<div class="band bottom">)', html, re.S).group(0).strip()
    bottom_start = html.index('<div class="band bottom">')
    bottom_end = html.index('</div></div>', html.rindex('</section>')) + len('</div></div>')
    bottom = html[bottom_start:bottom_end]
    bottom = re.sub(r'\s*<section id="fu">.*?</section>', '', bottom, flags=re.S)  # idempotent
    i = bottom.rindex('</div></div>')
    bottom = bottom[:i] + '\n' + (HERE / 'followups.html').read_text().strip() + '\n' + bottom[i:]

    data = json.dumps(state, ensure_ascii=False).replace('<', '\\u003c')
    js = (HERE / 'followups.js').read_text()
    doc = (SKELETON + '\n' + title + '\n' + css + '\n' + top + '\n' + bottom + '\n'
           + '<script type="application/json" id="fu-data">' + data + '</script>\n'
           + '<script>' + js + '</script>\n</body></html>')
    Path(out).write_text(doc)


if __name__ == '__main__':
    main(*sys.argv[1:4])
