import type { ThemedToken } from 'shiki/core';

export type CodeLang = 'yaml' | 'properties' | 'bash' | 'batch';

/** Browser only, so the grammars never reach the server bundle or the prerendered HTML. */
let pending: Promise<{ codeToTokens: (code: string, lang: CodeLang) => ThemedToken[][] }> | null = null;

async function load() {
  const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme, yaml, properties, bash, batch] =
    await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('shiki/themes/github-dark.mjs'),
      import('shiki/langs/yaml.mjs'),
      import('shiki/langs/properties.mjs'),
      import('shiki/langs/bash.mjs'),
      import('shiki/langs/batch.mjs'),
    ]);

  const highlighter = await createHighlighterCore({
    themes: [theme.default],
    langs: [yaml.default, properties.default, bash.default, batch.default],
    engine: createJavaScriptRegexEngine(),
  });

  return {
    codeToTokens: (code: string, lang: CodeLang) =>
      highlighter.codeToTokens(code, { lang, theme: 'github-dark' }).tokens,
  };
}

export function tokenize(code: string, lang: CodeLang): Promise<ThemedToken[][]> {
  pending ??= load();
  return pending.then(highlighter => highlighter.codeToTokens(code, lang));
}
