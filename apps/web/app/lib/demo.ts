import type { ProjectDemo } from '~/config/projects';

// Not a file in public/: Workers assets turn `/index.html` into a redirect, which breaks relative imports.
export function demoPage(demo: ProjectDemo, text: { lang: string; starting: string; unsupported: string }): string {
  return `<!doctype html>
<html lang="${text.lang}">
<head>
<meta charset="utf-8">
<style>
html, body { margin: 0; height: 100%; overflow: hidden; background: #141414; }
#status { position: fixed; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center;
  font: 13px/1.5 system-ui, sans-serif; color: #8a8a8a; }
body.ready #status { display: none; }
</style>
</head>
<body>
<div id="status">${text.starting}</div>
<script type="module">
import init from '${demo.script}';
const status = document.getElementById('status');
new MutationObserver((_, observer) => {
  if (document.querySelector('canvas')) {
    document.body.classList.add('ready');
    observer.disconnect();
  }
}).observe(document.body, { childList: true });
init().catch(error => {
  console.error(error);
  status.textContent = ${JSON.stringify(text.unsupported)};
});
</script>
</body>
</html>`;
}
