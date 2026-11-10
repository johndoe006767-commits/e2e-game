# Anatomy in Place

[Play the game on GitHub Pages](https://johndoe006767-commits.github.io/e2e-game/).

Drag 25 organs and muscle groups onto a 3D skeleton. Turn the body to reach posterior structures; release a piece near its checkpoint to place it. Faster matches earn more points, and a wrong placement deducts half a point. Includes audio, fullscreen play, a completion celebration and a layout for 3840×2160 displays.

## Play locally

On Windows, install Node.js 22.12 or later, download and extract the repository, and double-click **Start Game.bat**. **Stop Game.bat** stops the local server. The launchers serve the included production build from `dist/` and do not require npm installation.

## Development and publishing

Run `npm ci`, then `npm run dev`. Build with `npm run build`. The page uses relative asset paths so the same build runs locally and at the GitHub project URL.

GitHub Pages serves the root of the `gh-pages` branch. To update it, rebuild, commit the source and `dist/` on `main`, push `main`, and run `git subtree push --prefix dist origin gh-pages`.

Anatomy and audio attribution: see [credits](public/credits.html) and [licenses](licenses/).
