export function renderNotFound(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/assets/global.css" />
<title>Page not found | Orbis</title>
</head>
<body class="entry">
<main>
<h1>页面不存在 / Page not found</h1>
<p><a href="/zh/">中文</a> · <a href="/en/">English</a></p>
</main>
</body>
</html>`;
}
