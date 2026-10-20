import type { ThemedToken } from 'shiki/core';

export type CodeLang = 'bash' | 'kotlin';

/** Browser only, so the grammars never reach the server bundle or the prerendered HTML. */
let pending: Promise<{ codeToTokens: (code: string, lang: CodeLang) => ThemedToken[][] }> | null = null;

async function load() {
  const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme, bash, kotlin] = await Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/themes/github-dark.mjs'),
    import('shiki/langs/bash.mjs'),
    import('shiki/langs/kotlin.mjs'),
  ]);

  const highlighter = await createHighlighterCore({
    themes: [theme.default],
    langs: [bash.default, kotlin.default],
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
