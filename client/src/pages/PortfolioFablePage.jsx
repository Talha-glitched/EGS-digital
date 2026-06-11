import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import pageStyles from '../styles/pages/portfolio-fable.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { images } from './siteData.js';
import egsLogo from '../assets/logo/New_Logo/Logo-03.png'; // plain white variant

// Scan the graduation gallery — these are the real, accurate projects on this page
const graduationAssets = import.meta.glob('../assets/Graduation/Websites Gallery Graduations/**/*', {
  eager: true,
  import: 'default',
});

const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
const VIDEO_EXTS = ['mp4', 'mov', 'webm'];

const CAMPUS_META = {
  'abu-dhabi': { name: 'HCT Abu Dhabi', location: 'ADNEC, Abu Dhabi' },
  'dubai': { name: 'HCT Dubai', locationByYear: { 2025: 'Grand Hyatt Dubai', 2024: 'Coca-Cola Arena, Dubai' } },
  'fujairah': { name: 'HCT Fujairah', locationByYear: { 2025: 'Zayed Sports Complex, Fujairah', 2024: 'Fujairah, UAE' } },
  'ras-al-khaimah': { name: 'HCT Ras Al Khaimah', location: 'HCT RAK Campus, Ras Al Khaimah' },
  'sharjah': { name: 'HCT Sharjah', location: 'University City Hall, Sharjah' },
  'rak-aa': { name: 'RAK American Academy', location: 'Ras Al Khaimah' },
};

function campusKeyFor(folder) {
  const norm = folder.toLowerCase().trim();
  if (norm.includes('abu dhabi') || norm === 'aud') return 'abu-dhabi';
  if (norm.includes('dubai') || norm === 'dxb' || norm.includes('coca')) return 'dubai';
  if (norm.includes('fujairah')) return 'fujairah';
  if (norm.includes('ras') || norm === 'rak') return 'ras-al-khaimah';
  if (norm.includes('sharjah')) return 'sharjah';
  return null;
}

// Promo-style cuts lead each ceremony's gallery and back its hover background
const heroRank = (name) => {
  const n = name.toLowerCase();
  if (n.includes('promo')) return 0;
  if (n.includes('highlight')) return 1;
  if (n.includes('ceremony')) return 2;
  if (n.includes('teaser') || n.includes('opener')) return 3;
  return 4;
};

const gradGroups = {};

Object.entries(graduationAssets).forEach(([path, url]) => {
  if (path.includes('.DS_Store')) return;

  const prefix = '../assets/Graduation/Websites Gallery Graduations/';
  const rel = path.substring(path.indexOf(prefix) + prefix.length);
  const parts = rel.split('/');
  const filename = parts[parts.length - 1];
  const ext = filename.split('.').pop().toLowerCase();
  const isPhoto = PHOTO_EXTS.includes(ext);
  const isVideo = VIDEO_EXTS.includes(ext);
  if (!isPhoto && !isVideo) return;

  let year;
  let campus;
  if (rel.startsWith('2021 Videos')) {
    return; // video-only archive, no stills to show in the gallery
  } else if (rel.startsWith('RAK AA -Pics Vids')) {
    year = 2025;
    campus = 'rak-aa';
  } else {
    year = parseInt(parts[0], 10);
    campus = campusKeyFor(parts[1] || '');
  }
  if (!year || !campus) return;

  const key = `${campus}|${year}`;
  if (!gradGroups[key]) gradGroups[key] = [];
  gradGroups[key].push({ type: isVideo ? 'video' : 'photo', url, name: filename, year });
});

function buildClient({ id, name, category, location, year, items }) {
  const photos = items
    .filter((m) => m.type === 'photo')
    .sort((a, b) => a.name.localeCompare(b.name));
  const videos = items
    .filter((m) => m.type === 'video')
    .sort((a, b) => heroRank(a.name) - heroRank(b.name) || a.name.localeCompare(b.name));

  // Hero is the promo video when one exists, then photos, then the remaining videos
  const hero = videos[0] || photos[0] || null;
  const media = videos.length > 0 ? [videos[0], ...photos, ...videos.slice(1)] : [...photos];
  const cover = photos[0] || hero;

  return { id, name, category, location, year, media, hero, cover, meta: `${location} · ${year}` };
}

// One entry per ceremony (campus × year) so every gallery only carries
// that year's photos and that year's promo video
const GRAD_CLIENTS = Object.entries(gradGroups)
  .map(([key, items]) => {
    const [campus, yearStr] = key.split('|');
    const year = Number(yearStr);
    const meta = CAMPUS_META[campus];
    const location = meta.locationByYear?.[year] || meta.location;
    return buildClient({
      id: `grad-${campus}-${year}`,
      name: meta.name,
      category: 'graduations',
      location,
      year,
      items,
    });
  })
  .sort((a, b) => a.name.localeCompare(b.name) || b.year - a.year);

// Indicative entries for the other service categories — names, years, locations,
// and imagery are placeholders to show the shape of the page, not accurate records.
const IDEA_CLIENTS = [
  { id: 'ex-philips', name: 'Philips', category: 'exhibitions', location: 'Riyadh, KSA', year: 2024, urls: [images.phillips2, images.philipsMri, images.philips, images.philipsArab] },
  { id: 'ex-microlink', name: 'Microlink', category: 'exhibitions', location: 'Dubai, UAE', year: 2023, urls: [images.microlink] },
  { id: 'ex-hct', name: 'HCT Helsinki', category: 'exhibitions', location: 'Helsinki, Finland', year: 2024, urls: [images.hct] },
  { id: 're-sadia', name: 'Sadia', category: 'retail', location: 'Carrefour, UAE', year: 2023, urls: [images.retailSadiaChiller, images.retailSadiaBusDisplay, images.retailCampaignGraphics] },
  { id: 're-carrefour', name: 'Carrefour', category: 'retail', location: 'Dubai, UAE', year: 2023, urls: [images.retailHypermarketDisplay, images.retailMallActivation] },
  { id: 're-roast', name: 'Roast', category: 'retail', location: 'Dubai, UAE', year: 2024, urls: [images.retail] },
  { id: 'fi-velocity', name: 'Velocity', category: 'fitouts', location: 'Dubai, UAE', year: 2025, urls: [images.fitoutVelocityInterior, images.activation] },
  { id: 'fi-uniestate', name: 'Uniestate', category: 'fitouts', location: 'Dubai, UAE', year: 2024, urls: [images.fitoutReceptionArea] },
  { id: 'fi-bigfm', name: 'BIG FM', category: 'fitouts', location: 'Dubai, UAE', year: 2023, urls: [images.fitoutOfficeGraphics] },
  { id: 'fi-galadari', name: 'Galadari', category: 'fitouts', location: 'Dubai, UAE', year: 2025, urls: [images.fitoutKiosk, images.fitoutInteriorSignage] },
].map(({ urls, ...client }) =>
  buildClient({
    ...client,
    items: urls.filter(Boolean).map((url, i) => ({ type: 'photo', url, name: `${client.name} ${i + 1}`, year: client.year })),
  })
);

const ALL_CLIENTS = [
  ...IDEA_CLIENTS.filter((c) => c.category === 'exhibitions'),
  ...GRAD_CLIENTS,
  ...IDEA_CLIENTS.filter((c) => c.category === 'retail'),
  ...IDEA_CLIENTS.filter((c) => c.category === 'fitouts'),
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'exhibitions', label: 'Exhibitions' },
  { key: 'graduations', label: 'Events & Graduations' },
  { key: 'retail', label: 'Retail' },
  { key: 'fitouts', label: 'Fitouts' },
];

const YEARS = [...new Set(ALL_CLIENTS.map((c) => c.year))].sort((a, b) => b - a);

const pad2 = (n) => String(n).padStart(2, '0');

function BgMedia({ client }) {
  if (!client) return null;
  if (client.hero?.type === 'video') {
    return (
      <video
        src={client.hero.url}
        muted
        autoPlay
        loop
        playsInline
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
  return client.cover ? <img src={client.cover.url} alt="" /> : null;
}

// Minimal player: play/pause + seek + sound only — no settings, no download
function GalleryVideo({ src, name }) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    setMuted((m) => {
      if (v) v.muted = !m;
      return !m;
    });
  };

  return (
    <div className={`pf-video ${playing ? '' : 'is-paused'}`} onContextMenu={(e) => e.preventDefault()}>
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload noplaybackrate"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (trackRef.current && v.duration) {
            trackRef.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
          }
        }}
      />
      <span className="pf-video-center" aria-hidden="true">▶</span>
      <div className="pf-video-ui">
        <button
          type="button"
          className="pf-video-btn pf-video-play"
          onClick={togglePlay}
          aria-label={playing ? `Pause ${name}` : `Play ${name}`}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="pf-video-track" onClick={seek} aria-hidden="true">
          <span className="pf-video-track-fill" ref={trackRef} />
        </div>
        <button type="button" className="pf-video-btn" onClick={toggleMute}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
    </div>
  );
}

export default function PortfolioFablePage() {
  const [activeCat, setActiveCat] = useState('all');
  const [activeYear, setActiveYear] = useState('all');
  const [viewer, setViewer] = useState(null); // { name, sub, media }
  const [viewerIndex, setViewerIndex] = useState(0);
  const [hoverClient, setHoverClient] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const activeIdxRef = useRef(0);
  const clientsRef = useRef([]);
  const engine = useRef({ offset: 0, target: 0, lastInput: 0 });
  const scrollRef = useRef(null);
  const progressRef = useRef(null);
  const sectionRefs = useRef([]);

  const clients = useMemo(
    () =>
      ALL_CLIENTS.filter(
        (c) =>
          (activeCat === 'all' || c.category === activeCat) &&
          (activeYear === 'all' || c.year === activeYear)
      ),
    [activeCat, activeYear]
  );
  clientsRef.current = clients;

  const activeClient = clients.length ? clients[Math.min(activeIdx, clients.length - 1)] : null;
  const displayClient = hoverClient || activeClient || ALL_CLIENTS[0];

  // Background: quick fade to black, swap the media, then fade the next job in
  const [bgShown, setBgShown] = useState(ALL_CLIENTS[0]);
  const [bgVisible, setBgVisible] = useState(true);

  useEffect(() => {
    if (!displayClient || displayClient.id === bgShown?.id) return undefined;
    setBgVisible(false);
    const t = setTimeout(() => {
      setBgShown(displayClient);
      setBgVisible(true);
    }, 240);
    return () => clearTimeout(t);
  }, [displayClient, bgShown]);

  usePageLifecycle('Portfolio | EGS — Exhibit Graphic Sign', {
    description:
      'Client index of EGS production work across the UAE — exhibition stands, graduation ceremonies, retail rollouts, and fitouts.',
  });

  // Lay every item out around the center line. The list cycles (modular wrap)
  // only when it is tall enough to hide the seam outside the masked viewport;
  // short filtered lists clamp instead so rows never visibly repeat.
  const layoutItems = () => {
    const list = listRef.current;
    const items = itemRefs.current;
    const n = clientsRef.current.length;
    const eng = engine.current;
    if (!list || n === 0 || !items[0]) return;
    if (list.scrollTop !== 0) list.scrollTop = 0; // focus can nudge overflow:hidden containers

    const h = items[0].offsetHeight || 1;
    const ch = list.clientHeight;
    const total = n * h;
    const cyclic = total >= ch + h * 2;

    for (let i = 0; i < n; i += 1) {
      const node = items[i];
      if (!node) continue;
      let y = i * h + eng.offset;
      if (cyclic) {
        y = ((y % total) + total) % total;
        if (y > total / 2) y -= total;
      }
      node.style.transform = `translateY(${ch / 2 - h / 2 + y}px)`;
    }
  };

  // Reset the carousel whenever the filtered list changes
  useEffect(() => {
    itemRefs.current.length = clients.length;
    const eng = engine.current;
    eng.offset = 0;
    eng.target = 0;
    eng.lastInput = 0;
    activeIdxRef.current = 0;
    setActiveIdx(0);
    layoutItems();
  }, [clients]);

  // Carousel loop: ease toward the target, snap to the nearest row when idle
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const list = listRef.current;
      const items = itemRefs.current;
      const n = clientsRef.current.length;
      const eng = engine.current;
      if (list && n > 0 && items[0]) {
        const h = items[0].offsetHeight || 1;
        const ch = list.clientHeight;
        const total = n * h;
        const cyclic = total >= ch + h * 2;

        if (!cyclic) {
          eng.target = Math.max(-(n - 1) * h, Math.min(0, eng.target));
        }
        if (performance.now() - eng.lastInput > 120) {
          const snapped = Math.round(eng.target / h) * h;
          eng.target += (snapped - eng.target) * 0.2;
        }
        eng.offset += (eng.target - eng.offset) * 0.12;
        layoutItems();

        const raw = Math.round(-eng.offset / h);
        const idx = cyclic ? ((raw % n) + n) % n : Math.min(Math.max(raw, 0), n - 1);
        if (idx !== activeIdxRef.current) {
          activeIdxRef.current = idx;
          setActiveIdx(idx);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel and touch input, speed-capped per event and per frame
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const eng = engine.current;

    const capLead = () => {
      const h = itemRefs.current[0]?.offsetHeight || 40;
      const maxLead = h * 3;
      eng.target = Math.max(eng.offset - maxLead, Math.min(eng.offset + maxLead, eng.target));
    };

    const onWheel = (e) => {
      e.preventDefault();
      const d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      eng.target -= Math.max(-60, Math.min(60, d * 0.5));
      capLead();
      eng.lastInput = performance.now();
    };

    let touchY = null;
    const onTouchStart = (e) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (touchY === null) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      eng.target += y - touchY;
      touchY = y;
      capLead();
      eng.lastInput = performance.now();
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    list.addEventListener('wheel', onWheel, { passive: false });
    list.addEventListener('touchstart', onTouchStart, { passive: true });
    list.addEventListener('touchmove', onTouchMove, { passive: false });
    list.addEventListener('touchend', onTouchEnd);
    return () => {
      list.removeEventListener('wheel', onWheel);
      list.removeEventListener('touchstart', onTouchStart);
      list.removeEventListener('touchmove', onTouchMove);
      list.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openViewer = (client) => {
    setHoverClient(null);
    setViewerIndex(0);
    setViewer({ name: client.name, sub: client.meta, media: client.media });
  };
  const closeViewer = () => setViewer(null);

  // Scroll-driven gallery: track the section in view, reveal media,
  // autoplay/pause videos, and drive keyboard navigation.
  useEffect(() => {
    if (!viewer) return undefined;

    const root = scrollRef.current;
    if (root) root.scrollTop = 0;
    const sections = sectionRefs.current.filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.dataset.index);
          const video = entry.target.querySelector('video');
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            setViewerIndex(idx);
            if (video) video.play().catch(() => {});
          } else if (video) {
            video.pause();
          }
        });
      },
      { root, threshold: 0.5 }
    );
    sections.forEach((section) => observer.observe(section));

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setViewer(null);
        return;
      }
      let dir = 0;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') dir = 1;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') dir = -1;
      if (!dir || !root || sections.length === 0) return;
      e.preventDefault();
      const current = Math.round(root.scrollTop / root.clientHeight);
      const target = Math.min(Math.max(current + dir, 0), sections.length - 1);
      sections[target].scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [viewer]);

  const handleViewerScroll = (e) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    if (progressRef.current && max > 0) {
      progressRef.current.style.transform = `scaleX(${el.scrollTop / max})`;
    }
  };

  return (
    <>
      <style>{pageStyles}</style>

      <div className="pf-page">
        {/* Always-on background for the selected job */}
        <div className="pf-bg" aria-hidden="true">
          <div className={`pf-bg-layer ${bgVisible ? 'is-visible' : ''}`}>
            {bgShown && <BgMedia client={bgShown} key={bgShown.id} />}
          </div>
        </div>

        <div className="pf-layout">
          <aside className="pf-side">
            <Link to="/" className="pf-side-logo" aria-label="EGS home">
              <img src={egsLogo} alt="EGS — Exhibit Graphic Sign" />
            </Link>

            <p className="pf-side-blurb">
              Dubai production partner for high-stakes physical brand moments
              since 2010. We build custom exhibition stands, graduation
              ceremonies, retail activations, and office fitouts in the UAE.
            </p>

            <nav aria-label="Service categories">
              <span className="pf-side-label">Services</span>
              <div className="pf-cats">
                {CATEGORIES.map((cat) => {
                  const count =
                    cat.key === 'all'
                      ? ALL_CLIENTS.length
                      : ALL_CLIENTS.filter((c) => c.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      className={`pf-cat ${activeCat === cat.key ? 'active' : ''}`}
                      onClick={() => setActiveCat(cat.key)}
                    >
                      {cat.label}
                      <span className="pf-cat-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <nav aria-label="Year filter">
              <span className="pf-side-label">Year</span>
              <div className="pf-years">
                <button
                  type="button"
                  className={`pf-year ${activeYear === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveYear('all')}
                >
                  All
                </button>
                {YEARS.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={`pf-year ${activeYear === year ? 'active' : ''}`}
                    onClick={() => setActiveYear(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </nav>

            {/* Contact — gathered from across the site, lives in the rail */}
            <div className="pf-side-contact">
              <span className="pf-side-label">Contact</span>
              <a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a>
              <a href="tel:+97142383278">+971 4 238 3278</a>
              <a href="https://wa.me/971565348700" target="_blank" rel="noopener noreferrer">
                +971 56 534 8700 (WhatsApp)
              </a>
              <span>Al Qusais, Dubai, UAE</span>
              <span className="pf-side-copy">© 2026 Exhibit Graphic Sign, Est. 2010</span>
            </div>
          </aside>

          <main className="pf-list" ref={listRef}>
            <div className="pf-list-track">
              {clients.length === 0 ? (
                <p className="pf-item" style={{ top: '45%' }}>No projects for this filter</p>
              ) : (
                clients.map((client, i) => (
                  <button
                    key={client.id}
                    type="button"
                    className={`pf-item ${i === activeIdx ? 'is-active' : ''}`}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    onClick={() => openViewer(client)}
                    onMouseEnter={() => setHoverClient(client)}
                    onMouseLeave={() => setHoverClient(null)}
                    onFocus={() => setHoverClient(client)}
                    onBlur={() => setHoverClient(null)}
                  >
                    <span className="pf-item-name">{client.name}</span>
                    <span className="pf-item-meta">{client.meta}</span>
                  </button>
                ))
              )}
            </div>
          </main>
        </div>

        {/* Fullscreen scroll-through project gallery */}
        {viewer && (
          <div className="pf-viewer" role="dialog" aria-modal="true" aria-label={`${viewer.name} gallery`}>
            <div className="pf-viewer-progress" ref={progressRef} />

            <div className="pf-viewer-head">
              <div className="pf-viewer-titles">
                <span className="pf-viewer-title">{viewer.name}</span>
                <span className="pf-viewer-sub">{viewer.sub}</span>
              </div>
              <span className="pf-viewer-counter">
                {pad2(viewerIndex + 1)} / {pad2(viewer.media.length)}
              </span>
              <button type="button" className="pf-viewer-close" onClick={closeViewer} aria-label="Close gallery">
                ✕
              </button>
            </div>

            <div className="pf-viewer-scroll" ref={scrollRef} onScroll={handleViewerScroll}>
              {viewer.media.map((item, index) => (
                <section
                  key={`${item.url}-${index}`}
                  className="pf-viewer-item"
                  data-index={index}
                  ref={(el) => {
                    sectionRefs.current[index] = el;
                  }}
                >
                  <div className="pf-viewer-media">
                    {item.type === 'video' ? (
                      <GalleryVideo src={item.url} name={item.name} />
                    ) : (
                      <img
                        src={item.url}
                        alt={`${viewer.name} — ${item.name}`}
                        loading={index < 2 ? 'eager' : 'lazy'}
                      />
                    )}
                  </div>
                </section>
              ))}
            </div>

            {viewer.media.length > 1 && (
              <div className={`pf-viewer-hint ${viewerIndex > 0 ? 'is-hidden' : ''}`}>Scroll</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
