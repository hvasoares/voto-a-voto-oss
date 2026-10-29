/** The forbidden typography patterns of the type scale contract (#87); read by type-guard.test.ts and docs-drift.test.ts (#130). */
export const RULES: { what: string; re: RegExp }[] = [
  { what: 'an arbitrary text size (text-[13px])', re: /\btext-\[\s*\d[\d.]*(px|rem|em)\s*\]/ },
  { what: 'an arbitrary line height (leading-[18px])', re: /\bleading-(\[\s*\d[\d.]*(px|rem|em)\s*\]|none\b|tight\b|snug\b|normal\b|relaxed\b|loose\b|\d)/ },
  { what: 'a Tailwind named size (text-sm, text-xl...)', re: /(?<![\w-])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/ },
  { what: 'an old named size (text-title, text-body...)', re: /(?<![\w-])text-(title|section|lead|body|small|tiny)(?![\w-])/ },
  { what: 'a weight other than 400 and 700 (font-medium, font-semibold...)', re: /(?<![\w-])font-(thin|extralight|light|medium|semibold|extrabold|black)(?![\w-])/ },
  { what: 'font-weight 300, 500, 600, 800 or 900', re: /font-?[wW]eight:?\s*['"]?\s*[0-9]*(300|500|600|800|900)\b/ },
  { what: 'a pixel font size in CSS (font-size: 13px)', re: /font-size:\s*\d[\d.]*(px|rem|em)/ },
  { what: 'a px/rem size in a font shorthand (font: 700 13px ...)', re: /\bfont:\s*['\"]?\d+\s+\d[\d.]*(px|rem|em)\b/ },
  { what: 'a px line height in CSS (line-height: 18px)', re: /line-height:\s*\d[\d.]*(px|rem|em)/ },
  { what: 'a literal font size on an SVG text (fontSize={12}, font-size="12")', re: /fontSize=\{\s*\d|font-size="\d|fontSize:\s*\d/ },
  { what: 'an old size token (--fs-*, --sketch-text-*)', re: /--fs-|--sketch-text-/ },
]
