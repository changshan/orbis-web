export function renderEntry(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/assets/global.css" />
<title>Orbis</title>
</head>
<body class="entry">
<main>
<h1>ORBIS</h1>
<p><a href="/zh/product/">中文</a> · <a href="/en/product/">English</a></p>
</main>
<script src="/assets/lang.js" defer></script>
</body>
</html>`;
}
