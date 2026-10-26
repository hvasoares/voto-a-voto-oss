import { withBase } from './paths'

export interface ShellOptions {
  base: string
  title: string
  /** Markup for #app. */
  body: string
  slotId: string
  route: string
}

/** The static HTML document around every page. Same file layout on GitHub Pages and locally. */
export function shell(o: ShellOptions): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  return `<!doctype html>
<html lang="pt-BR" data-base="${esc(o.base)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)} · Voto a Voto</title>
<link rel="stylesheet" href="${withBase(o.base, 'assets/app.css')}">
</head>
<body>
<div id="app" data-slot="${esc(o.slotId)}" data-route="${esc(o.route)}">${o.body}</div>
<script type="module" src="${withBase(o.base, 'assets/app.js')}"></script>
</body>
</html>
`
}
