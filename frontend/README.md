# Evolution Field Guide frontend

A static, client-rendered browser for the repository's Markdown guide. The
interface uses hash-based routes so direct page and heading links work on GitHub
Pages regardless of the repository's deployment subpath.

## Local development

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

The `predev` hook validates the repository's local links and copies Markdown and
media into a generated `public/content/` tree before Vite starts.

## Floating livestream player

The **Floating video** setting in the top navigation defaults to on for desktop
readers and off for mobile or coarse-pointer readers, then remembers the chosen
setting in the browser. When enabled, YouTube livestream and timestamp links
open in a movable, resizable in-page player. YouTube’s unobstructed native
control area provides playback, volume, captions, the current timestamp, and
YouTube navigation. The custom overlay adds widely spaced back/forward
ten-second buttons and close. With a fine pointer, it stays visible while the
player is hovered and fades one second after the pointer leaves; touch and
keyboard interactions use the same one-second timer. Outside the explicit
custom controls, the YouTube iframe owns the video surface so its native mouse,
playback, timeline, caption, settings, and fullscreen interactions remain
unobstructed. Dragging starts from the persistent grab bar and can then continue
across or beyond the player; the top-left resize handle also remains available
while the overlay is hidden. Modified clicks such as Command-click and
Ctrl-click retain normal browser link behaviour.

The YouTube IFrame API is loaded only after a reader opens a video. At that
point the browser connects to YouTube and the embedded playback is subject to
YouTube's availability and privacy practices.

## Validation and production build

```bash
npm test
npm run build
npm run preview
```

`npm run build` performs the following steps:

1. discovers every repository Markdown file outside `frontend/`;
2. generates routes, headings, search metadata, and folder indexes;
3. copies local Markdown, images, and `LICENSE` without changing them;
4. checks exact-case local paths, directory links, image targets, and heading
   fragments;
5. type-checks the React application and creates `dist/`.

Generated content, `node_modules/`, and `dist/` are intentionally ignored by
Git. Repository Markdown and lesson-local images remain the source of truth.

## GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` builds and deploys the site
using GitHub's official Pages artifact actions. In the repository settings,
select **GitHub Actions** as the Pages source. Vite uses relative asset URLs and
the app uses hash routes, so no repository-name base path needs to be hardcoded.
