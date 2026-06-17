import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import pageStyles from '../styles/pages/portfolio-fable.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { images } from './siteData.js';
import egsLogo from '../assets/logo/New_Logo/Logo-03.png'; // plain white variant
import lightbulbGif from '../assets/Icons/lightbulb.gif';
import audGraduation from '../assets/Graduation/Websites Gallery Graduations/2025/AUD/DSC02388.JPG';
import fuGraduationSpeaker from '../assets/Existing Website Shortlist/FU-Graduation/DSC08234.jpg.jpeg';
import { ALL_CLIENTS, CATEGORIES, YEARS, filterClients } from '../portfolio/buildIndex.js';


const pad2 = (n) => String(n).padStart(2, '0');

const ABOUT_SLIDES = [
  {
    id: 'intro',
    stageLabel: 'THE EGS EDGE',
    headline: 'WHY CLIENTS CHOOSE EGS',
    copy: 'We bring design, production, and installation together to create branded spaces that are built well, delivered reliably, and made to stand out.',
    images: [audGraduation],
    values: [
      { title: 'Craft', text: 'We care about the finish, the details, and the quality people notice up close.' },
      { title: 'Clarity', text: 'We keep the process transparent, from timelines and budgets to production updates.' },
      { title: 'Reliability', text: 'We respect deadlines because exhibitions, launches, and events do not wait.' },
      { title: 'Creativity', text: 'We find practical, creative ways to bring each brand idea to life.' },
      { title: 'Value', text: 'We focus on impact, durability, and cost-effectiveness without cutting corners.' }
    ]
  },
  {
    id: 'usps',
    images: [fuGraduationSpeaker],
    pillars: [
      {
        title: 'End-to-End Responsibility',
        description: 'Design, printing, and fabrication managed directly inside our Dubai production facility, with logistics, installation, and snag closure overseen by a single team.'
      },
      {
        title: '14 Years of Experience',
        description: 'We have pressure-tested execution consistently over 14 years as a trusted corporate space supplier and event contractor across the UAE and GCC, adapting structures overnight when timelines are critical.'
      },
      {
        title: 'UAE-Wide & GCC Scale',
        description: 'Sourcing, transporting, and installing on-site at any major regional venue, delivering consistent quality for multinational market leaders like Philips, Abbott, GSK, and HCT.'
      },
      {
        title: 'Cost-Effective Builds',
        description: 'Maximizing visual impact and durability within your target budget without compromise.'
      }
    ]
  }
];


const BOTTOM_NAV_ITEMS = [
  { label: 'THE EDGE', slideIdx: 0 },
  { label: 'CAPABILITIES', slideIdx: 1 }
];

function BgImage({ src }) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setIsPortrait(img.naturalHeight > img.naturalWidth);
    };
  }, [src]);

  if (isPortrait) {
    return (
      <div className="pf-bg-portrait-wrap">
        <img src={src} className="pf-bg-portrait-blur" alt="" />
        <img src={src} className="pf-bg-portrait-clean" alt="" />
      </div>
    );
  }

  return <img src={src} className="pf-bg-landscape" alt="" />;
}

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
  return client.cover ? <BgImage src={client.cover.url} /> : null;
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
    if (v.paused) v.play().catch(() => { });
    else v.pause();
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const toggleMute = () => {
    setMuted((m) => !m);
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
  const [activeCat, setActiveCat] = useState('about-us');
  const [activeYear, setActiveYear] = useState('all');
  const [loaderStep, setLoaderStep] = useState('blank'); // 'blank', 'logo-fade-in', 'logo-shrink', 'quote-fade-in', 'quote-fade-out', 'overlay-fade-out', 'done'
  const [aboutScrolled, setAboutScrolled] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const aboutRef = useRef(null);
  const lastWheelTime = useRef(0);

  const getPillNumbers = (activeIdx, total) => {
    return [0, 1];
  };

  const translateX = useMemo(() => {
    return activeSlideIdx * 100;
  }, [activeSlideIdx]);

  const scrollToSlide = (targetIdx) => {
    setActiveSlideIdx(targetIdx);
  };

  useEffect(() => {
    const t0 = setTimeout(() => setLoaderStep('logo-fade-in'), 500);
    const t1 = setTimeout(() => setLoaderStep('logo-shrink'), 1500);
    const t2 = setTimeout(() => setLoaderStep('quote-fade-in'), 1800);
    const t3 = setTimeout(() => setLoaderStep('quote-fade-out'), 4000);
    const t4 = setTimeout(() => setLoaderStep('overlay-fade-out'), 4500);
    const t5 = setTimeout(() => setLoaderStep('done'), 5000);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  // Keyboard navigation: ArrowUp/Right = next slide, ArrowDown/Left = prev slide
  useEffect(() => {
    if (activeCat !== 'about-us') return undefined;

    const onKey = (e) => {
      const now = performance.now();
      if (now - lastWheelTime.current < 450) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => {
          if (prev < 2) return prev + 1;
          setActiveCat('all');
          return prev;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCat]);

  // Mouse wheel slide switching
  useEffect(() => {
    const el = aboutRef.current;
    if (!el || activeCat !== 'about-us') return undefined;

    const handleWheel = (e) => {
      e.preventDefault();

      const now = performance.now();
      if (now - lastWheelTime.current < 450) return;

      const dx = e.deltaX;
      const dy = e.deltaY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 15;

      if (Math.max(absX, absY) < threshold) return;

      const goForward = dx > 0 || (absY > absX && dy > 0);
      const goBackward = dx < 0 || (absY > absX && dy < 0);

      if (goForward) {
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => {
          if (prev < 2) return prev + 1;
          setActiveCat('all');
          return prev;
        });
      } else if (goBackward) {
        lastWheelTime.current = now;
        setActiveSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [activeCat]);

  // Mobile touch swipe slide switching
  useEffect(() => {
    const el = aboutRef.current;
    if (!el || activeCat !== 'about-us') return undefined;

    let touchStartX = null;
    let touchStartY = null;

    const onTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (touchStartX === null || touchStartY === null) return;
      const dx = touchStartX - e.touches[0].clientX;
      const dy = touchStartY - e.touches[0].clientY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > absY && absX > 10) {
        e.preventDefault();
      }

      if (Math.max(absX, absY) > 40) {
        const now = performance.now();
        if (now - lastWheelTime.current > 450) {
          if (absX > absY) {
            if (dx > 0) {
              lastWheelTime.current = now;
              setActiveSlideIdx((prev) => {
                if (prev < 2) return prev + 1;
                setActiveCat('all');
                return prev;
              });
            } else {
              lastWheelTime.current = now;
              setActiveSlideIdx((prev) => (prev > 0 ? prev - 1 : prev));
            }
          }
        }
        touchStartX = null;
        touchStartY = null;
      }
    };

    const onTouchEnd = () => {
      touchStartX = null;
      touchStartY = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [activeCat]);

  const [viewerIdx, setViewerIdx] = useState(null); // project index in the filtered list
  const [mediaIdx, setMediaIdx] = useState(0); // media index inside the open project
  const [navDir, setNavDir] = useState(0); // -1 came from below, 1 came from above
  const [hoverClient, setHoverClient] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [islandOffset, setIslandOffset] = useState({ x: 0, y: 0 });
  const [moreServicesOpen, setMoreServicesOpen] = useState(false);

  useEffect(() => {
    const isSecondary = !['about-us', 'all', 'graduation', 'exhibition-stand', 'corporate-events-branding'].includes(activeCat);
    if (isSecondary) {
      setMoreServicesOpen(true);
    }
  }, [activeCat]);

  const handleIslandMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const shiftX = (x / (rect.width / 2)) * 25;
    const shiftY = (y / (rect.height / 2)) * 25;
    setIslandOffset({ x: shiftX, y: shiftY });
  };

  const handleIslandMouseLeave = () => {
    setIslandOffset({ x: 0, y: 0 });
  };

  const viewerRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const activeIdxRef = useRef(0);
  const clientsRef = useRef([]);
  const engine = useRef({ offset: 0, target: 0, lastInput: 0 });
  const wheelGate = useRef(0);
  const touchStart = useRef(null);


  const clients = useMemo(
    () => filterClients({ category: activeCat, year: activeYear }),
    [activeCat, activeYear]
  );

  const displayClients = useMemo(() => {
    return clients;
  }, [clients]);

  clientsRef.current = displayClients;

  const activeClient = displayClients.length ? displayClients[Math.min(activeIdx, displayClients.length - 1)] : null;
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

  usePageLifecycle('Exhibition & Event Staging Portfolio | EGS Dubai & UAE', {
    description:
      'Explore the EGS interactive client work index across the UAE, featuring custom exhibition stands, graduation ceremonies, retail branding, and corporate fitouts.',
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
    const cyclic = false;

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
    itemRefs.current.length = displayClients.length;
    const eng = engine.current;
    eng.offset = 0;
    eng.target = 0;
    eng.lastInput = 0;
    activeIdxRef.current = 0;
    setActiveIdx(0);
    layoutItems();
  }, [displayClients]);

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
        const cyclic = false;

        if (!cyclic) {
          eng.target = Math.max(-(n - 1) * h, Math.min(0, eng.target));
        }
        if (performance.now() - eng.lastInput > 100) {
          const snapped = Math.round(eng.target / h) * h;
          eng.target += (snapped - eng.target) * 0.55;
        }
        eng.offset += (eng.target - eng.offset) * 0.38;
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
      eng.target -= d * 0.35;
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
      eng.target += (y - touchY) * 0.75;
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
  }, [activeCat, displayClients]);

  const viewerProject = viewerIdx !== null ? clients[viewerIdx] : null;

  const openViewer = (client) => {
    setHoverClient(null);
    setMediaIdx(0);
    setNavDir(0);
    const originalId = client.id.split('-dup-')[0];
    const origIndex = clients.findIndex((c) => c.id === originalId);
    setViewerIdx(Math.max(0, origIndex));
  };
  const closeViewer = () => setViewerIdx(null);

  // vertical axis: previous / next project (wraps around the list)
  const goProject = (dir) => {
    if (clients.length === 0) return;
    setMediaIdx(0);
    setNavDir(dir);
    setViewerIdx((i) => (i === null ? i : (i + dir + clients.length) % clients.length));
  };

  // horizontal axis: through the open project's photos and videos (wraps)
  const stepMedia = (dir) => {
    if (!viewerProject) return;
    const len = viewerProject.media.length;
    setMediaIdx((m) => (m + dir + len) % len);
  };

  // keyboard: left/right = media, up/down = project, esc = close (when viewer open)
  // keyboard: up/down = scroll list, enter = open project (when viewer closed & list open)
  useEffect(() => {
    const onKey = (e) => {
      if (viewerIdx !== null) {
        if (e.key === 'Escape') {
          setViewerIdx(null);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepMedia(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepMedia(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          goProject(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          goProject(-1);
        }
      } else if (activeCat !== 'about-us') {
        const n = displayClients.length;
        if (n > 0) {
          const items = itemRefs.current;
          const h = items[0]?.offsetHeight || 40;
          const idx = activeIdxRef.current;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = Math.min(idx + 1, n - 1);
            engine.current.target = -nextIdx * h;
            engine.current.lastInput = performance.now();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = Math.max(idx - 1, 0);
            engine.current.target = -prevIdx * h;
            engine.current.lastInput = performance.now();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeClient = displayClients[idx];
            if (activeClient) {
              openViewer(activeClient);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    if (viewerIdx !== null) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerIdx, activeCat, displayClients]);

  // play only the media currently in frame
  useEffect(() => {
    if (viewerIdx === null) return;
    document.querySelectorAll('.pf-viewer-cell').forEach((cell, i) => {
      const video = cell.querySelector('video');
      if (!video) return;
      if (i === mediaIdx) video.play().catch(() => { });
      else video.pause();
    });
  }, [viewerIdx, mediaIdx]);

  // wheel: dominant axis decides — down/up changes project, left/right changes
  // media. Attached natively with passive:false so preventDefault stops the
  // browser back/forward swipe gesture on horizontal scrolls.
  useEffect(() => {
    if (viewerIdx === null) return undefined;
    const el = viewerRef.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
      const now = performance.now();
      if (now - wheelGate.current < 550) return;
      const ax = Math.abs(e.deltaX);
      const ay = Math.abs(e.deltaY);
      if (Math.max(ax, ay) < 12) return;
      wheelGate.current = now;
      if (ax > ay) stepMedia(e.deltaX > 0 ? 1 : -1);
      else goProject(e.deltaY > 0 ? 1 : -1);
    };
    const onTouchMove = (e) => e.preventDefault();

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerIdx, clients]);

  const onViewerTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onViewerTouchEnd = (e) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    if (Math.abs(dx) > Math.abs(dy)) stepMedia(dx < 0 ? 1 : -1);
    else goProject(dy < 0 ? 1 : -1);
  };

  return (
    <>
      <style>{pageStyles}</style>

      <div className="pf-page">
        {/* Persistent Centered/Top Logo Wrapper */}
        <div className={`pf-persistent-logo-wrap ${loaderStep} ${activeCat === 'about-us' ? 'is-about' : 'is-projects'}`}>
          <Link to="/" className="pf-persistent-logo-link" aria-label="EGS home">
            <img src={egsLogo} alt="EGS — Exhibit Graphic Sign" />
          </Link>
          {activeCat !== 'about-us' && loaderStep === 'done' && (
            <button
              type="button"
              className="pf-go-back-btn"
              onClick={() => {
                setActiveCat('about-us');
                setHoverClient(null);
                setAboutScrolled(false);
                setActiveSlideIdx(0);
              }}
              aria-label="Go back to About Us"
            >
              <span className="pf-back-arrow">↑</span> Go back
            </button>
          )}
        </div>

        {/* Loading Screen Overlay */}
        {loaderStep !== 'done' && (
          <div className={`pf-loader-overlay ${loaderStep === 'overlay-fade-out' ? 'fade-out' : ''}`}>
            {(loaderStep === 'quote-fade-in' || loaderStep === 'quote-fade-out') && (
              <div className={`pf-loader-quote-container ${loaderStep === 'quote-fade-out' ? 'fade-out' : ''}`}>
                <img src={lightbulbGif} className="pf-loader-gif" alt="Lightbulb animation" />
                <div className="pf-loader-quote">
                  “An idea is only as good as its execution.”
                </div>
              </div>
            )}
          </div>
        )}

        {/* Always-on background for the selected job */}
        <div className="pf-bg" aria-hidden="true">
          <div className={`pf-bg-layer ${bgVisible ? 'is-visible' : ''}`}>
            {bgShown && <BgMedia client={bgShown} key={bgShown.id} />}
          </div>
        </div>

        <div className={`pf-layout ${activeCat === 'about-us' ? 'about-mode' : ''}`}>
          <aside className={`pf-nav-col ${activeCat === 'about-us' ? 'is-hidden' : ''}`}>

            <div className="pf-nav-section">
              <button
                type="button"
                className={`pf-nav-about-btn ${activeCat === 'about-us' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCat('about-us');
                  setHoverClient(null);
                }}
              >
                About Us
              </button>
            </div>

            <nav aria-label="Service categories" className="pf-nav-section">
              <span className="pf-side-label">Services</span>
              <div className="pf-cats">
                {(() => {
                  const primaryKeys = ['all', 'graduation', 'exhibition-stand', 'corporate-events-branding'];
                  const primaryCats = CATEGORIES.filter((cat) => primaryKeys.includes(cat.key));
                  const secondaryCats = CATEGORIES.filter((cat) => !primaryKeys.includes(cat.key));
                  const allowedAll = ['graduation', 'exhibition-stand', 'corporate-events-branding'];
                  const getCatCount = (catKey) => {
                    if (catKey === 'all') {
                      return ALL_CLIENTS.filter((c) => allowedAll.includes(c.category)).length;
                    }
                    return ALL_CLIENTS.filter((c) => c.category === catKey).length;
                  };

                  return (
                    <>
                      {primaryCats.map((cat) => {
                        const count = getCatCount(cat.key);
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            className={`pf-cat ${activeCat === cat.key ? 'active' : ''}`}
                            onClick={() => {
                              setActiveCat(cat.key);
                              setActiveYear('all');
                            }}
                          >
                            {cat.label}
                            <span className="pf-cat-count">{count}</span>
                          </button>
                        );
                      })}

                      {secondaryCats.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="pf-more-services-toggle"
                            onClick={() => setMoreServicesOpen((prev) => !prev)}
                            aria-expanded={moreServicesOpen}
                          >
                            More Services
                            <span className={`pf-more-services-icon ${moreServicesOpen ? 'is-open' : ''}`}>▼</span>
                          </button>
                          <div className={`pf-more-cats-container ${moreServicesOpen ? 'is-open' : ''}`}>
                            <div style={{ minHeight: '0' }}>
                              <div className="pf-more-cats-inner">
                                {secondaryCats.map((cat) => {
                                  const count = getCatCount(cat.key);
                                  return (
                                    <button
                                      key={cat.key}
                                      type="button"
                                      className={`pf-cat ${activeCat === cat.key ? 'active' : ''}`}
                                      onClick={() => {
                                        setActiveCat(cat.key);
                                        setActiveYear('all');
                                      }}
                                    >
                                      {cat.label}
                                      <span className="pf-cat-count">{count}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </nav>

            {activeCat !== 'about-us' && (
              <nav aria-label="Year filter" className="pf-nav-section">
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
            )}

            <div className="pf-side-contact">
              <span className="pf-side-label">Contact</span>
              <a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a>
              <a href="tel:+97142383278">+971 4 238 3278</a>
              <a href="tel:+971524587992">+971 52 458 7992</a>
              <span>Al Qusais, Dubai, UAE</span>
              <span className="pf-side-copy">© 2026 Exhibit Graphic Sign, Est. 2010</span>
            </div>
          </aside>

          {activeCat === 'about-us' ? (
            <section
              ref={aboutRef}
              className="pf-about-section"
            >
              <div className="pf-about-viewport-scroll">
                <div className="pf-horizontal-scroll-sticky">
                  <div
                    className="pf-horizontal-scroll-track"
                    style={{ transform: `translate3d(-${translateX}vw, 0px, 0px)` }}
                  >
                    {ABOUT_SLIDES.map((slide, idx) => {
                      if (slide.id === 'intro') {
                        return (
                          <div
                            key={slide.id}
                            className={`pf-about-slide pf-slide-intro ${idx === activeSlideIdx ? 'is-active' : ''}`}
                          >
                            {/* Slide Background Image Layer */}
                            <div className="pf-slide-bg-image-wrapper">
                              <img src={slide.images[0]} className="pf-slide-bg-image" alt="" />
                            </div>

                            <div className="pf-slide-intro-container">
                              {/* Top Left Title Group */}
                              <div className="pf-intro-top-left">
                                <h2 className="pf-slide-headline">THE WAY<br />WE WORK</h2>
                              </div>

                              {/* Middle/Left Image */}
                              <div className="pf-intro-media">
                                <img
                                  src={slide.images[0]}
                                  className="pf-intro-img"
                                  alt="EGS Graduation Ceremony"
                                  loading="eager"
                                />
                              </div>

                              {/* Right Column: Core Values list */}
                              <div className="pf-intro-right-col">
                                <span className="pf-intro-values-title">CORE VALUES</span>
                                <div className="pf-intro-values-list">
                                  {slide.values.map((val) => (
                                    <div className="pf-intro-value-item" key={val.title}>
                                      <strong className="pf-intro-val-name">{val.title}</strong>
                                      <p className="pf-intro-val-desc">{val.text}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="pf-intro-passion-subtext">
                                  WE BUILD WITH PASSION &amp; UNCOMPROMISING DETAIL
                                </div>
                              </div>

                              {/* Bottom Right: Contact Us Hovering Island */}
                              <div
                                className="pf-contact-island"
                                onMouseMove={handleIslandMouseMove}
                                onMouseLeave={handleIslandMouseLeave}
                                style={{
                                  transform: `translate3d(${islandOffset.x}px, ${islandOffset.y}px, 0)`
                                }}
                              >
                                <div className="pf-contact-island-collapsed">
                                  <span>CONTACT</span>
                                  <span className="pf-contact-arrow-circle">→</span>
                                </div>
                                <div className="pf-contact-island-expanded">
                                  <div className="pf-contact-details">
                                    <span className="pf-contact-label">EMAIL</span>
                                    <a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a>
                                    <span className="pf-contact-label">PHONE</span>
                                    <a href="tel:+97142383278">+971 4 238 3278</a>
                                    <a href="tel:+971524587992">+971 52 458 7992</a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (slide.id === 'usps') {
                        return (
                          <div
                            key={slide.id}
                            className={`pf-about-slide pf-slide-usps ${idx === activeSlideIdx ? 'is-active' : ''}`}
                          >
                            {/* Slide Background Image Layer */}
                            <div className="pf-slide-bg-image-wrapper">
                              <img src={slide.images[0]} className="pf-slide-bg-image" alt="" />
                            </div>

                            <div className="pf-slide-usps-container">
                              {/* Left column content wrapper */}
                              <div className="pf-usps-left-col">
                                {/* Top Left: Detailing info */}
                                <div className="pf-usps-top-left">
                                  <span className="pf-usps-section-tag">OUR UNIQUE SELLING PROPOSITIONS</span>
                                  <h2 className="pf-slide-headline">
                                    WE DESIGN, FABRICATE, AND INSTALL YOUR SPACES ACROSS THE UAE
                                  </h2>
                                </div>

                                {/* MECE Columns (Middle Left) */}
                                <div className="pf-usps-columns">
                                  {slide.pillars.map((pillar, pIdx) => (
                                    <div className="pf-usps-pillar" key={pIdx}>
                                      <span className="pf-usps-pillar-num">0{pIdx + 1}</span>
                                      <strong className="pf-usps-pillar-title">{pillar.title}</strong>
                                      <p className="pf-usps-pillar-desc">{pillar.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Middle/Right Offset Images */}
                              <div className="pf-usps-media">
                                <img
                                  src={slide.images[0]}
                                  className="pf-usps-img-single"
                                  alt="EGS Graduation Ceremony Speaker"
                                  loading="lazy"
                                />
                              </div>

                              {/* Horizontal scroll hint */}
                              <div className="pf-usps-scroll-hint">
                                <span>Next for projects</span>
                                <span className="pf-scroll-arrow-right">→</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}

                    {/* Transition panel revealed when scrolling past slide 2 */}
                    <div className="pf-about-slide pf-slide-reveal-panel">
                      <div className="pf-reveal-panel-content">
                        <span className="pf-reveal-label">NEXT UP</span>
                        <h3 className="pf-reveal-title">VIEW PROJECTS</h3>
                        <div className="pf-reveal-indicator">
                          <span className="pf-reveal-arrow-right">→</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Progress/Navigation Bar */}
                  <div className="pf-bottom-nav-bar">
                    <div className="pf-bottom-nav-container">
                      <div className="pf-bottom-nav-items">
                        {BOTTOM_NAV_ITEMS.map((item, idx) => {
                          const isActive = activeSlideIdx === item.slideIdx;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              className={`pf-bottom-nav-item ${isActive ? 'is-active' : ''}`}
                              onClick={() => scrollToSlide(item.slideIdx)}
                            >
                              <span className="pf-nav-text">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pf-bottom-nav-pill">
                        {getPillNumbers(activeSlideIdx, ABOUT_SLIDES.length).map((idx) => {
                          const isActive = idx === activeSlideIdx;
                          return (
                            <span
                              key={idx}
                              className={`pf-pill-num ${isActive ? 'is-active' : ''}`}
                              onClick={() => scrollToSlide(idx)}
                            >
                              {pad2(idx + 1)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <main className="pf-list" ref={listRef}>
              <div className="pf-list-track">
                {displayClients.length === 0 ? (
                  <p className="pf-item" style={{ top: '45%' }}>No projects for this filter</p>
                ) : (
                  displayClients.map((client, i) => (
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
                      <span className="pf-item-name">
                        {client.name}
                        <span className="pf-item-year"> · {client.year}</span>
                      </span>
                      <span className="pf-item-meta">{client.location}</span>
                    </button>
                  ))
                )}
              </div>
            </main>
          )}
        </div>

        {/* Fullscreen gallery: scroll down = next project, left/right = media */}
        {viewerProject && (
          <div
            ref={viewerRef}
            className="pf-viewer"
            role="dialog"
            aria-modal="true"
            aria-label={`${viewerProject.name} gallery`}
            onTouchStart={onViewerTouchStart}
            onTouchEnd={onViewerTouchEnd}
          >
            <div
              className="pf-viewer-progress"
              style={{ transform: `scaleX(${(mediaIdx + 1) / viewerProject.media.length})` }}
            />

            <button
              type="button"
              className="pf-viewer-hint-top"
              onClick={() => goProject(-1)}
            >
              Previous project
            </button>

            <div className="pf-viewer-head">
              <div className="pf-viewer-titles">
                <span className="pf-viewer-title">{viewerProject.name}</span>
                <span className="pf-viewer-sub">{viewerProject.meta}</span>
              </div>
              <span className="pf-viewer-counter">
                {pad2(mediaIdx + 1)} / {pad2(viewerProject.media.length)}
              </span>
              <button type="button" className="pf-viewer-close" onClick={closeViewer} aria-label="Close gallery">
                ✕
              </button>
            </div>

            {viewerProject.facts && (
              <aside className="pf-viewer-facts">
                <div>
                  <span>Venue</span>
                  <strong>{viewerProject.facts.venue}</strong>
                </div>
                <div>
                  <span>Graduates</span>
                  <strong>{viewerProject.facts.graduates}</strong>
                </div>
                <div>
                  <span>Guests</span>
                  <strong>{viewerProject.facts.guests}</strong>
                </div>
              </aside>
            )}

            <div
              className={`pf-viewer-stage ${navDir === 1 ? 'nav-dir-next' : navDir === -1 ? 'nav-dir-prev' : 'nav-dir-none'
                }`}
              key={viewerProject.id}
            >
              <div className="pf-viewer-strip" style={{ transform: `translateX(-${mediaIdx * 100}%)` }}>
                {viewerProject.media.map((item, index) => (
                  <div className="pf-viewer-cell" key={`${item.url}-${index}`}>
                    {item.type === 'video' ? (
                      <GalleryVideo src={item.url} name={item.name} />
                    ) : (
                      <img
                        src={item.url}
                        alt={`${viewerProject.name} — ${item.name}`}
                        loading={index < 2 ? 'eager' : 'lazy'}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {viewerProject.media.length > 1 && (
              <>
                <button
                  type="button"
                  className="pf-arrow pf-arrow-left"
                  onClick={() => stepMedia(-1)}
                  aria-label="Previous media"
                >
                  <svg viewBox="0 0 64 12" aria-hidden="true">
                    <path d="M64 6H2M8 1L2 6l6 5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="pf-arrow pf-arrow-right"
                  onClick={() => stepMedia(1)}
                  aria-label="Next media"
                >
                  <svg viewBox="0 0 64 12" aria-hidden="true">
                    <path d="M0 6h62M56 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </button>
              </>
            )}

            <button type="button" className="pf-viewer-hint" onClick={() => goProject(1)}>
              Next project
            </button>
          </div>
        )}
      </div>
    </>
  );
}
