# Purple Rain — After the Encore

A self-contained browser action and music game with five linked missions: a motorcycle ride, backstage equipment collection, a scored first set, a storm ride, and the final encore.

## Play locally

On macOS, double-click PLAY.command, or run `python3 launch.py`. Python 3 is required. Keep the terminal window open while playing. The game needs an HTTP server; do not open index.html directly from the filesystem.

## Upload to GitHub

1. Create or open the repository you want to use.
2. Choose **Add file → Upload files** and upload the **contents of this folder**, including index.html, the JavaScript and CSS files, assets/ and vendor/. Keep the folder structure. Extract the ZIP first if you are using the archive.
3. Commit the upload. No npm install or build step is needed.
4. To publish with GitHub Pages, go to **Settings → Pages**, choose **Deploy from a branch**, select your branch (usually main) and **/(root)**, then Save. GitHub shows the published address when deployment finishes.

[GitHub Pages publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Controls

- Bike: A/D or left/right steer, W/up accelerates, S/down or Space brakes.
- Backstage: WASD/arrows move, E collects nearby gear or enters the stage.
- Music: D/F/J/K or the four touch lanes; hit notes at the bright line.
- Escape pauses. Completed missions and best scores save in the browser.

Normal performances require 40% note accuracy; Easy 25%, Expert 60%. Practice offers full soundtrack tracks. YouTube streams in its visible official player and needs internet. Original synthesized tracks work offline; no commercial audio files are bundled.

## Graphics

Settings → Graphics quality → 4K Ultra targets a 3840×2160-equivalent render buffer, subject to GPU limits. Auto follows the display; Performance reduces the pixel budget. The text interface scales with the display. The poster and character images remain HD assets; they are not native 4K photography. Characters use photo-derived cutouts in 3D environments.

## Sources and credits

Three.js is included under its MIT license. Barlow Condensed and Inter fonts include their OFL licenses in vendor/. Image provenance, generation prompts and actual dimensions are recorded in references/HD-ARTWORK.md and references/POSTER-SOURCE.md.

Photographic references:
- [Prince stage photograph](https://www.rrauction.com/auctions/lot-detail/338185705132466-prince-1984-purple-rain-tour-original-vintage-photograph/)
- [Morris Day portrait](https://www.forbes.com/sites/derekscancarelli/2019/10/29/morris-day-on-his-life-with-prince-from-purple-rain-to-a-godly-ultimatum/)
- [The Time color photograph](https://www.purplefam.fr/minneapolis-sound-the-time/)
- [The Time press photograph](https://lansuresmusicparaphernalia.blogspot.com/2014/06/morris-day-time-press-kits-memorabilia.html)
- [Original theatrical poster](https://www.impawards.com/1984/purple_rain.html)

An unofficial tribute with original game missions. Not a licensed film adaptation. Third-party photography and music retain their respective owners' rights. This folder contains no hosting credentials or private Site configuration.
