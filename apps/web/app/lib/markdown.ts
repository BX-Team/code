/** Release notes are written as markdown with raw HTML in them, so everything rendered
 *  here goes through DOMPurify — `style` included: notes may not restyle the page. */

import DOMPurify from 'dompurify';
import type { RendererRule } from 'markdown-it';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, linkify: true, breaks: false });

/** Alignment arrives as an inline style, which the sanitiser drops; `align` survives. */
const cellAlign: RendererRule = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];
  const style = token?.attrGet('style');
  if (token && style) {
    const align = /text-align:\s*(left|center|right)/.exec(style)?.[1];
    token.attrs = (token.attrs ?? []).filter(([name]) => name !== 'style');
    if (align) token.attrSet('align', align);
  }
  return self.renderToken(tokens, idx, options);
};
md.renderer.rules.th_open = cellAlign;
md.renderer.rules.td_open = cellAlign;

const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/|data:)/i;

/** `- [x] done` is markdown-it's plain text; a rendered list shows it as a checkbox. */
function rewriteTaskLists(root: DocumentFragment) {
  for (const item of root.querySelectorAll('li')) {
    const holder = item.firstElementChild?.tagName === 'P' ? item.firstElementChild : item;
    const text = holder?.firstChild;
    if (!holder || !text || text.nodeType !== Node.TEXT_NODE) continue;
    const match = /^\[([ xX])]\s+/.exec(text.nodeValue ?? '');
    if (!match) continue;

    text.nodeValue = (text.nodeValue ?? '').slice(match[0].length);
    // Attributes, not properties: this tree is serialised back to a string.
    const box = document.createElement('input');
    box.setAttribute('type', 'checkbox');
    box.setAttribute('disabled', '');
    if (match[1]?.toLowerCase() === 'x') box.setAttribute('checked', '');
    holder.insertBefore(box, holder.firstChild);
    item.classList.add('task');
  }
}

/** Notes are not repository content, so nothing resolves against a checkout. */
export function renderNotes(source: string): string {
  if (!DOMPurify.isSupported) return `<pre>${md.utils.escapeHtml(source)}</pre>`;

  const fragment = DOMPurify.sanitize(md.render(source), {
    RETURN_DOM_FRAGMENT: true,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  });

  for (const link of fragment.querySelectorAll('a')) {
    if (!ABSOLUTE.test(link.getAttribute('href') ?? '')) continue;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }

  rewriteTaskLists(fragment);

  const holder = document.createElement('div');
  holder.append(fragment);
  return holder.innerHTML;
}
