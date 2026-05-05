# Video Hero + GSAP Navbar (Portable Implementation Guide)

This repo contains two reusable UI pieces you can port into another website:

- **Video hero**: `client/src/components/HomeHero.jsx` + `client/src/components/HomeHero.css`
- **Navbar (GSAP card menu)**: `client/src/components/Navbar.jsx` + `client/src/components/Navbar.css`

Below is the fastest way to re-implement them elsewhere.

---

## 1) Dependencies

### React sites (recommended)

- **GSAP** (navbar animation)
- **Motion** (hero text reveal)

Install:

```bash
npm i gsap motion
```

Notes:
- `Navbar.jsx` imports `gsap` from `gsap`.
- `HomeHero.jsx` imports `motion` from `motion/react`.

### Non-React sites

- Use **GSAP** for the navbar only.
- The hero “reveal” can be done with CSS or GSAP (example included below).

---

## 2) Shared CSS tokens you must bring over

Both components depend on the design tokens (CSS variables) defined in:

- `client/src/styles/shared.css`

Minimum you should copy into your global CSS:
- `:root` variables (`--paper`, `--ink`, `--terracotta`, `--serif`, `--sans`, `--gutter`, etc.)
- Base element resets (`*`, `body`, `a`, `button`, etc.)

If you skip this, the navbar and hero will still render, but colors/fonts/sizing will be wrong.

---

## 3) Implementing the Video Hero

### What to copy

- `client/src/components/HomeHero.jsx`
- `client/src/components/HomeHero.css`
- Your video file (e.g. `hero.mp4`)
- Your poster image (e.g. `hero.jpg` / `hero.jpeg`)

In this repo, the defaults are:
- Video: `client/src/assets/hctgraduation.mp4`
- Poster: `client/src/assets/HCT.jpeg`

### Key markup/attributes (why they matter)

The `<video>` element in `HomeHero.jsx` uses:
- `autoPlay` + `muted`: required for autoplay to work on most browsers.
- `playsInline`: prevents iOS from forcing fullscreen playback.
- `preload="metadata"`: avoids downloading the full file immediately.
- `loop`: keeps it running (remove if you want one-time playback).

If you port this hero and autoplay doesn’t work, it’s almost always because **`muted` is missing**.

### React usage

Example (same pattern used in `client/src/pages/HomePage.jsx`):

```jsx
import HomeHero from './components/HomeHero.jsx';
import heroVideo from './assets/hero.mp4';
import heroPoster from './assets/hero.jpg';

export default function Page() {
  return (
    <>
      <HomeHero
        videoSrc={heroVideo}
        posterSrc={heroPoster}
        kicker="Dubai / UAE production house"
        title="Shaping Brand Moments across the Gulf."
        services={[
          'Exhibitions & Museums',
          'Product Launches',
          'Graduation Ceremonies',
        ]}
      />
    </>
  );
}
```

### Plain HTML/CSS usage (no React)

HTML:

```html
<section class="egs-home-video-hero" aria-label="Hero">
  <video
    class="egs-home-video-media"
    src="/assets/hero.mp4"
    poster="/assets/hero.jpg"
    autoplay
    muted
    loop
    playsinline
    preload="metadata"
    aria-hidden="true"
  ></video>
  <div class="egs-home-video-shade" aria-hidden="true"></div>
  <div class="egs-home-video-copy">
    <span class="egs-home-video-kicker">Dubai / UAE production house</span>
    <h1 class="egs-home-video-heading">Shaping Brand Moments across the Gulf.</h1>
    <div class="egs-home-video-services">
      <span class="egs-home-video-service-rotator" aria-hidden="true">
        <span style="animation-delay:0s">Exhibitions & Museums</span>
        <span style="animation-delay:3.33s">Product Launches</span>
        <span style="animation-delay:6.66s">Graduation Ceremonies</span>
      </span>
      <span class="egs-home-video-service-a11y">
        Exhibitions and museums, product launches, and graduation ceremonies.
      </span>
    </div>
  </div>
</section>
```

CSS:
- Copy `client/src/components/HomeHero.css` as-is.

---

## 4) Implementing the GSAP Navbar (Card Menu)

### What to copy

- `client/src/components/Navbar.jsx`
- `client/src/components/Navbar.css`
- Ensure your global CSS includes the shared tokens (`shared.css`) so `var(--ink)`, `var(--paper)`, etc. work.

### How it works (high level)

`Navbar.jsx` builds a GSAP timeline that:
- Sets the nav container to a collapsed height (`64px`)
- Expands the nav height to fit the card grid (dynamic height on mobile)
- Animates each card upward + fades in with a stagger

Key classes used by JS/CSS:
- `.egs-navbar` (animated height)
- `.egs-navbar-content` (visibility/pointer-events toggled)
- `.egs-nav-card` (each animated card)

### React usage

In this repo, the homepage uses:

- `client/src/pages/HomePage.jsx` → `<Navbar active="home" />`

Minimal usage:

```jsx
import { Navbar } from './components/Navbar.jsx';

export default function Page() {
  return (
    <>
      <Navbar active="home" />
      {/* rest of your page */}
    </>
  );
}
```

### Customizing the menu items

`Navbar.jsx` accepts an `items` prop. Each item becomes a card:

```js
[
  {
    label: 'Services',
    bgColor: 'var(--ink)',
    textColor: 'var(--paper)',
    links: [{ label: 'Exhibitions', href: '/exhibitions', ariaLabel: 'Open exhibitions page' }]
  }
]
```

React example:

```jsx
<Navbar
  active="home"
  cta="Start a project"
  items={[
    {
      label: 'Services',
      bgColor: 'var(--ink)',
      textColor: 'var(--paper)',
      links: [
        { label: 'Exhibitions', href: '/exhibitions', ariaLabel: 'Open exhibitions page' },
        { label: 'Events', href: '/events', ariaLabel: 'Open events page' },
      ],
    },
  ]}
/>
```

### Plain HTML/JS version (GSAP only)

If you want this outside React, you’ll need to recreate:
- A button that toggles “expanded”
- A GSAP timeline that animates nav height and card entry

Skeleton:

```html
<div class="egs-navbar-container">
  <nav class="egs-navbar" style="background: var(--paper)" aria-label="Primary navigation">
    <div class="egs-navbar-top">
      <button class="egs-hamburger-menu" aria-label="Open menu" aria-expanded="false">
        <span class="egs-hamburger-line"></span>
        <span class="egs-hamburger-line"></span>
      </button>
      <a href="/" class="egs-navbar-logo" aria-label="Home">
        <span class="egs-navbar-wordmark"><span>Exhibit Graphic</span><em>Sign</em></span>
      </a>
      <a href="/contact" class="egs-navbar-cta-button">Send a brief <span>→</span></a>
    </div>

    <div class="egs-navbar-content" aria-hidden="true">
      <article class="egs-nav-card" style="background:var(--ink);color:var(--paper)">
        <div class="egs-nav-card-label">Services</div>
        <div class="egs-nav-card-links">
          <a class="egs-nav-card-link" href="/exhibitions"><span>↗</span>Exhibitions</a>
        </div>
      </article>
      <!-- repeat for 3 cards -->
    </div>
  </nav>
</div>
```

JS (conceptual):

```js
// Requires gsap loaded on the page.
const nav = document.querySelector('.egs-navbar');
const button = document.querySelector('.egs-hamburger-menu');
const content = document.querySelector('.egs-navbar-content');
const cards = Array.from(document.querySelectorAll('.egs-nav-card'));

gsap.set(nav, { height: 64, overflow: 'hidden' });
gsap.set(cards, { y: 38, opacity: 0 });

const tl = gsap.timeline({ paused: true })
  .to(nav, { height: 300, duration: 0.42, ease: 'power3.out' })
  .to(cards, { y: 0, opacity: 1, duration: 0.42, ease: 'power3.out', stagger: 0.075 }, '-=0.14');

let expanded = false;
button.addEventListener('click', () => {
  expanded = !expanded;
  button.setAttribute('aria-expanded', String(expanded));
  content.classList.toggle('visible', expanded);
  content.setAttribute('aria-hidden', String(!expanded));
  expanded ? tl.play(0) : tl.reverse();
});
```

CSS:
- Copy `client/src/components/Navbar.css` as-is.

---

## 5) Recommended integration order (so it “just works”)

- Add `shared.css` tokens to your global stylesheet.
- Add `Navbar.css` and `HomeHero.css`.
- Drop `<Navbar />` at the top of your page layout.
- Drop `<HomeHero />` directly under it.
- Confirm your video file path resolves and is encoded as H.264/AAC MP4 for broad support.

---

## 6) Common issues / fixes

- **Video won’t autoplay**: ensure `muted` is present, and the file is served over `https` in production.
- **iOS plays fullscreen**: ensure `playsInline` / `playsinline` is present.
- **Navbar expands but cards don’t show**: `.egs-navbar-content` must toggle the `visible` class and `aria-hidden`.
- **Colors/fonts look wrong**: you didn’t copy the `:root` variables from `shared.css`.

