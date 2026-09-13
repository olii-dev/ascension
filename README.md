# ASCENSION

A realtime WebGL demoscene production. Five scenes, one procedural techno
track, zero loaded assets - every visual is a shader, every sound is an
oscillator, the text is rasterised at runtime.

- Live: https://olii-dev.github.io/ascension/
- Runs at 60fps on a laptop from 2019. Mobile works, headphone recommended.

## The show

| #  | Scene           | What it is                                            |
|----|-----------------|-------------------------------------------------------|
| S1 | Starfield Warp  | 20,000 GPU-recycled points flying past the camera     |
| S2 | Tunnel Vision   | Catmull-Rom tube, scrolling neon grid, banking camera |
| S3 | Sunset Flyover  | Raymarched fbm terrain with fog and a low sun         |
| S4 | Greetings       | Scroller credit, chromatic-split text on a waving plane |
| S5 | Ascension       | 256-plasma finale, additive torus knots, title card   |

The 57.6s loop is clocked off `AudioContext.currentTime` - a kick-drum sample
schedule drives scene cuts, not `requestAnimationFrame` drift. The music is
133 BPM A-minor techno composed in `js/audio.js`: synthesised kick, noise
snare/hats, filtered saw bass, square-wave arpeggio, band-passed riser and
crash.

## Controls

- click / tap / any key: start
- R: record a 12s webm screener (proves it is realtime)
- esc: release pointer if you hit fullscreen elsewhere

## Tech notes (honest ones)

- ES modules + import map for three.js from unpkg. No build step, no bundler.
- Post pipeline is one raw fullscreen-quad pass: lens curvature, chromatic
  aberration, scanlines, phosphor mask, vignette, dither. No postprocessing lib.
- Crossfade renders both scenes into separate render targets and mixes them in
  the post pass, so the two never fight over a shared depth buffer.
- Each scene owns its resources and disposes them via `dispose()`; lazy-built
  on first use, kept warm after so the loop never reallocates.
- Audio scheduler is pure `buildEvents()` so it is testable off-browser
  (`npm test` runs node --check on every file plus scheduling assertions).

## Screenshots

Drop frames from the screener here once captured (ascension-screener.webm -> ffmpeg -i in.webm f%03d.jpg).
