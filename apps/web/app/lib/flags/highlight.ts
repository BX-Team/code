/** What a piece of a start script is, for its colour. */
export type TokenKind = 'plain' | 'java' | 'heap' | 'flag' | 'value' | 'prop' | 'jar' | 'keyword' | 'comment' | 'muted';

export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = /^(while|do|done|true|echo|sleep|cd|exit|goto|timeout|pause|@echo|:start)$/;

/** `-XX:Name=value` and `-Dkey=value`: the name in one colour, the value in another. */
function split(token: string, name: TokenKind): Token[] {
  const at = token.indexOf('=');
  return at === -1
    ? [{ text: token, kind: name }]
    : [
        { text: token.slice(0, at + 1), kind: name },
        { text: token.slice(at + 1), kind: 'value' },
      ];
}

function word(token: string): Token[] {
  if (token === 'java') return [{ text: token, kind: 'java' }];
  if (token.startsWith('-Xms') || token.startsWith('-Xmx')) return [{ text: token, kind: 'heap' }];
  if (token.startsWith('-XX:')) return split(token, 'flag');
  if (token.startsWith('-D') || token.startsWith('--add-modules')) return split(token, 'prop');
  if (token === '-jar') return [{ text: token, kind: 'heap' }];
  if (/\.jar"?$/.test(token)) return [{ text: token, kind: 'jar' }];
  if (token === '\\' || token === '^' || token === '--nogui' || token === '||') return [{ text: token, kind: 'muted' }];
  if (KEYWORDS.test(token.replace(/;$/, ''))) return [{ text: token, kind: 'keyword' }];
  return [{ text: token, kind: 'plain' }];
}

/** Colours a start script line by line; whitespace is kept so the indentation survives. */
export function highlight(code: string): Token[][] {
  return code
    .replace(/\r?\n$/, '')
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || /^rem\b/i.test(trimmed)) return [{ text: line, kind: 'comment' }];
      return line.split(/(\s+)/).flatMap(part => (part.trim() ? word(part) : [{ text: part, kind: 'plain' as const }]));
    });
}
