import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import pageStyles from '../styles/pages/portfolio-fable.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { images } from './siteData.js';
import egsLogo from '../assets/logo/New_Logo/Logo-03.png'; // plain white variant
import lightbulbGif from '../assets/Icons/lightbulb.gif';

// Scan the graduation gallery — these are the real, accurate projects on this page
const graduationAssets = import.meta.glob('../assets/Graduation/Websites Gallery Graduations/**/*', {
  eager: true,
  import: 'default',
});

// Scan the shortlist gallery
const shortlistAssets = import.meta.glob('../assets/Existing Website Shortlist/**/*', {
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

// Ceremony stats, mirrored from the graduation-portfolio page
const GRAD_FACTS = {
  'abu-dhabi|2025': { venue: 'ADNEC Halls, Abu Dhabi', graduates: '1,668', guests: '5,000' },
  'abu-dhabi|2024': { venue: 'ADNEC Halls, Abu Dhabi', graduates: '1,500', guests: '4,500' },
  'dubai|2025': { venue: 'Grand Hyatt Dubai', graduates: '602', guests: '2,200' },
  'dubai|2024': { venue: 'Coca-Cola Arena, Dubai', graduates: '580', guests: '2,000' },
  'fujairah|2025': { venue: 'Zayed Sports Complex, Fujairah', graduates: '535', guests: '1,800' },
  'fujairah|2024': { venue: 'Fujairah, UAE', graduates: '450', guests: '1,500' },
  'ras-al-khaimah|2025': { venue: 'RAK Campus Sports Hall', graduates: '576', guests: '1,800' },
  'ras-al-khaimah|2024': { venue: 'RAK Campus Sports Hall', graduates: '480', guests: '1,600' },
  'sharjah|2025': { venue: 'University City Hall, Sharjah', graduates: '937 (2 sessions)', guests: '3,000' },
  'sharjah|2024': { venue: 'University City Hall, Sharjah', graduates: '820', guests: '2,500' },
  'rak-aa|2025': { venue: 'RAK American Academy Auditorium', graduates: '60', guests: '1,200' },
};

function buildClient({ id, name, category, location, year, items, facts }) {
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

  return { id, name, category, location, year, media, hero, cover, facts, meta: `${location} · ${year}` };
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
      category: 'graduation',
      location,
      year,
      items,
      facts: GRAD_FACTS[`${campus}|${year}`],
    });
  })
  .sort((a, b) => a.name.localeCompare(b.name) || b.year - a.year);

// Smart project details resolver based on filename and folder
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getCategorySingular(categoryKey) {
  const mapping = {
    'exhibition-stand': 'Exhibition Stand',
    'corporate-events-branding': 'Corporate Event',
    'retail-branding-displays': 'Retail Display',
    'signage-indoor-outdoor': 'Signage Project',
    'showroom-office-branding': 'Showroom Fitout',
    'large-format-printing': 'Print Project',
    'vehicle-branding': 'Vehicle Graphics',
    'product-display-stands': 'Display Stand',
    'btl-mall-installation': 'Mall Installation',
    'btl-supermarket-hypermarket': 'Supermarket Branding',
    'mall-kiosk': 'Mall Kiosk',
    'graduation': 'Graduation Ceremony',
  };
  return mapping[categoryKey] || 'Project';
}

function extractDate(filename) {
  const dateMatch = filename.match(/(201\d|202\d)[-_](\d{2})[-_](\d{2})/);
  if (dateMatch) {
    return {
      year: parseInt(dateMatch[1], 10),
      month: parseInt(dateMatch[2], 10),
      day: parseInt(dateMatch[3], 10),
      monthStr: MONTHS[parseInt(dateMatch[2], 10) - 1],
      groupKey: `${dateMatch[1]}-${dateMatch[2]}`
    };
  }
  
  const compactMatch = filename.match(/(201\d|202\d)(\d{2})(\d{2})/);
  if (compactMatch) {
    const m = parseInt(compactMatch[2], 10);
    if (m >= 1 && m <= 12) {
      return {
        year: parseInt(compactMatch[1], 10),
        month: m,
        day: parseInt(compactMatch[3], 10),
        monthStr: MONTHS[m - 1],
        groupKey: `${compactMatch[1]}-${compactMatch[2]}`
      };
    }
  }

  const yearMatch = filename.match(/(201\d|202\d)/);
  if (yearMatch) {
    return {
      year: parseInt(yearMatch[1], 10),
      month: null,
      day: null,
      monthStr: null,
      groupKey: `${yearMatch[1]}`
    };
  }

  return null;
}

function getProjectDetails(filename, folderName, categoryKey) {
  const nameLower = filename.toLowerCase();
  let projectName = '';
  let location = 'Dubai, UAE';
  let year = 2024;
  let facts = null;
  let groupKey = '';

  if (nameLower.includes('philips') || nameLower.includes('phillips')) {
    projectName = 'Philips Stand';
    groupKey = 'philips-stand';
    if (nameLower.includes('mri')) {
      projectName = 'Philips MRI Room';
      groupKey = 'philips-mri';
    }
    if (nameLower.includes('arab health')) {
      projectName = 'Philips Arab Health';
      location = 'DWTC, Dubai';
      groupKey = 'philips-arab-health';
    }
    if (nameLower.includes('pairs')) {
      projectName = 'Philips Paris';
      groupKey = 'philips-paris';
    }
    if (nameLower.includes('meydan')) {
      projectName = 'Philips Meydan Event';
      location = 'Meydan, Dubai';
      groupKey = 'philips-meydan';
    }
  } else if (nameLower.includes('velocity')) {
    projectName = 'Velocity Showroom';
    year = 2025;
    groupKey = 'velocity-showroom';
  } else if (nameLower.includes('uniestate') || nameLower.includes('uni estate')) {
    projectName = 'Uniestate Office';
    year = 2024;
    groupKey = 'uniestate-office';
  } else if (nameLower.includes('big fm') || nameLower.includes('bigfm')) {
    projectName = 'BIG FM Office';
    year = 2023;
    groupKey = 'bigfm-office';
  } else if (nameLower.includes('coop') || nameLower.includes('co-op')) {
    projectName = 'Union Coop Supermarket';
    year = 2016;
    groupKey = 'union-coop';
  } else if (nameLower.includes('geant') || nameLower.includes('géant')) {
    projectName = 'Géant Hypermarket';
    year = 2016;
    groupKey = 'geant-hypermarket';
  } else if (nameLower.includes('carrefour')) {
    projectName = 'Carrefour Rollout';
    year = 2023;
    groupKey = 'carrefour-rollout';
  } else if (nameLower.includes('sadia')) {
    projectName = 'Sadia Brand Display';
    year = 2023;
    groupKey = 'sadia-display';
  } else if (nameLower.includes('dunkin')) {
    projectName = 'Dunkin\' Kiosk';
    year = 2024;
    groupKey = 'dunkin-kiosk';
  } else if (nameLower.includes('bubble tea')) {
    projectName = 'Bubble Tea Kiosk';
    year = 2023;
    groupKey = 'bubble-tea-kiosk';
  } else if (nameLower.includes('crepe')) {
    projectName = 'Crepe & Go Kiosk';
    year = 2023;
    groupKey = 'crepe-go-kiosk';
  } else if (nameLower.includes('galadari')) {
    projectName = 'Galadari Kiosk';
    year = 2025;
    location = 'Dubai Mall, UAE';
    groupKey = 'galadari-kiosk';
  } else if (nameLower.includes('vitro')) {
    projectName = 'Vitro Printing';
    groupKey = 'vitro-printing';
  } else if (nameLower.includes('emi cool') || nameLower.includes('emicool')) {
    projectName = 'Emicool Showroom';
    groupKey = 'emicool-showroom';
  } else if (nameLower.includes('fosroc')) {
    projectName = 'Fosroc Stand';
    groupKey = 'fosroc-stand';
  } else if (nameLower.includes('buser')) {
    projectName = 'Buser Stand';
    groupKey = 'buser-stand';
  } else if (nameLower.includes('cares')) {
    projectName = 'Cares Stand';
    groupKey = 'cares-stand';
  } else if (nameLower.includes('fakhruddin')) {
    projectName = 'Fakhruddin Office';
    groupKey = 'fakhruddin-office';
  } else if (nameLower.includes('hum yum')) {
    projectName = 'Hum Yum Dubai Mall';
    location = 'Dubai Mall, UAE';
    groupKey = 'hum-yum';
  } else if (nameLower.includes('van spark')) {
    projectName = 'Van Spark Branding';
    groupKey = 'van-spark';
  } else if (nameLower.includes('hct') || nameLower.includes('helsinki')) {
    projectName = 'HCT Showcase';
    groupKey = 'hct-showcase';
  }

  if (!projectName) {
    const cleanBase = filename
      .replace(/\.[^/.]+$/, "") 
      .replace(/[\d\s\(\)\-\_]+$/, "") 
      .replace(/^(IMG|DSC|MAC|WhatsApp Image)\b.*/i, "") 
      .trim();

    const testBase = cleanBase.replace(/copy/i, '').trim();
    const hasLetters = /[a-zA-Z]/.test(testBase);
    if (cleanBase && cleanBase.length > 2 && hasLetters) {
      projectName = cleanBase.split(/[\s\-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      groupKey = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
  }

  const parsedDate = extractDate(filename);
  if (parsedDate) {
    year = parsedDate.year;
    if (!projectName) {
      const categorySingular = getCategorySingular(categoryKey);
      if (parsedDate.monthStr) {
        projectName = `${categorySingular} - ${parsedDate.monthStr} ${parsedDate.year}`;
      } else {
        projectName = `${categorySingular} - ${parsedDate.year}`;
      }
      groupKey = `date-${categoryKey}-${parsedDate.groupKey}`;
    }
  }

  if (!projectName) {
    const categorySingular = getCategorySingular(categoryKey);
    projectName = `${categorySingular} Showcase`;
    groupKey = `showcase-${categoryKey}-${year}`;
  }

  return { name: projectName, location, year, facts, groupKey };
}

const CUSTOM_LABELS = {
  'graduation': 'Graduation Ceremonies',
  'exhibition-stand': 'Exhibition Stands',
  'corporate-events-branding': 'Corporate Events Branding',
  'retail-branding-displays': 'Retail Branding & Displays',
  'signage-indoor-outdoor': 'Signage Indoor & Outdoor',
  'showroom-office-branding': 'Showroom & Office Branding',
  'large-format-printing': 'Large Format Printing',
  'vehicle-branding': 'Vehicle Branding',
  'product-display-stands': 'Product Display Stands',
  'btl-mall-installation': 'BTL Mall Installations',
  'btl-supermarket-hypermarket': 'BTL Supermarket & Hypermarket',
  'mall-kiosk': 'Mall Kiosks',
};

const categoriesMap = {
  'graduation': { key: 'graduation', label: CUSTOM_LABELS['graduation'], sortOrder: 0.5 }
};

const projectGroups = {};

// Parse shortlist assets
Object.entries(shortlistAssets).forEach(([path, url]) => {
  if (path.includes('.DS_Store')) return;

  const prefix = '../assets/Existing Website Shortlist/';
  if (!path.startsWith(prefix)) return;
  const relPath = path.substring(prefix.length);
  const parts = relPath.split('/');
  if (parts.length < 2) return;
  const folderName = parts[0];
  const filename = parts[parts.length - 1];
  const ext = filename.split('.').pop().toLowerCase();
  
  const isPhoto = PHOTO_EXTS.includes(ext);
  const isVideo = VIDEO_EXTS.includes(ext);
  if (!isPhoto && !isVideo) return;
  
  let categoryKey = folderName.toLowerCase().replace(/^\d+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  
  // Map FU-Graduation into graduation category key
  if (categoryKey === 'fu-graduation') {
    categoryKey = 'graduation';
  }
  
  const categoryName = CUSTOM_LABELS[categoryKey] || folderName.replace(/^\d+/, '').replace(/-/g, ' ').trim();
  
  const sortMatch = folderName.match(/^(\d+)/);
  const sortOrder = sortMatch ? parseInt(sortMatch[1], 10) : 999;
  
  if (!categoriesMap[categoryKey]) {
    categoriesMap[categoryKey] = {
      key: categoryKey,
      label: categoryName,
      sortOrder,
    };
  }
  
  let pName = '';
  let pLoc = 'Dubai, UAE';
  let pYear = 2024;
  let pFacts = null;
  let details;
  
  if (folderName === 'FU-Graduation') {
    pName = 'Fujairah University Graduation';
    pLoc = 'Fujairah, UAE';
    pYear = 2026;
    pFacts = { venue: 'Fujairah University', graduates: 'Class of 2026', guests: '2,500' };
    details = { groupKey: 'fu-graduation' };
  } else {
    details = getProjectDetails(filename, folderName, categoryKey);
    pName = details.name;
    pLoc = details.location;
    pYear = details.year;
    pFacts = details.facts;
  }
  
  const projectKey = `${categoryKey}|${details.groupKey}`;
  if (!projectGroups[projectKey]) {
    projectGroups[projectKey] = {
      id: `shortlist-${categoryKey}-${details.groupKey}`,
      name: pName,
      category: categoryKey,
      location: pLoc,
      year: pYear,
      facts: pFacts,
      items: []
    };
  }
  
  projectGroups[projectKey].items.push({
    type: isVideo ? 'video' : 'photo',
    url,
    name: filename,
    year: pYear
  });
});

const SHORTLIST_CLIENTS = Object.values(projectGroups).map(group => buildClient(group));

// Newest work first
const ALL_CLIENTS = [...SHORTLIST_CLIENTS, ...GRAD_CLIENTS].sort(
  (a, b) => b.year - a.year || a.name.localeCompare(b.name)
);

const CATEGORY_ORDER = {
  'graduation': 1,
  'exhibition-stand': 2,
  'corporate-events-branding': 3
};

const CATEGORIES = [
  { key: 'all', label: 'All Services' },
  ...Object.values(categoriesMap).sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.key] || 999;
    const orderB = CATEGORY_ORDER[b.key] || 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.sortOrder - b.sortOrder;
  })
];

const YEARS = [...new Set(ALL_CLIENTS.map((c) => c.year))].sort((a, b) => b - a);

const pad2 = (n) => String(n).padStart(2, '0');

const ABOUT_SLIDES = [
  {
    id: 'intro',
    stageLabel: 'THE EGS EDGE',
    headline: 'WHY CLIENTS CHOOSE EGS',
    copy: 'We bring design, production, and installation together to create branded spaces that are built well, delivered reliably, and made to stand out.',
    images: [images.phillips2],
    values: [
      { title: 'Craft', text: 'We care about the finish, the details, and the quality people notice up close.' },
      { title: 'Clarity', text: 'We keep the process transparent, from timelines and budgets to production updates.' },
      { title: 'Reliability', text: 'We respect deadlines because exhibitions, launches, and events do not wait.' },
      { title: 'Ingenuity', text: 'We find practical, creative ways to bring each brand idea to life.' },
      { title: 'Value', text: 'We focus on impact, durability, and cost-effectiveness without cutting corners.' }
    ]
  },
  {
    id: 'usps',
    images: [images.fitoutKiosk, images.retailMallActivation],
    pillars: [
      {
        title: 'In-House Fabrication',
        description: 'Design, printing, and fabrication managed directly inside our Dubai production facility.'
      },
      {
        title: '14 Years of Experience',
        description: 'Trusted corporate space supplier and event contractor across the UAE and GCC since 2010.'
      },
      {
        title: 'Pressure-Tested Execution',
        description: 'Sourcing materials and adapting physical structures overnight when timelines are critical.'
      },
      {
        title: 'End-to-End Responsibility',
        description: 'Design, production, logistics, installation, and snag closure managed by a single team.'
      },
      {
        title: 'Tier-1 Brand Portfolio',
        description: 'Consistent delivery for multinational market leaders like Philips, Abbott, GSK, and HCT.'
      },
      {
        title: 'UAE-Wide & GCC Scale',
        description: 'Sourcing, transporting, and installing on-site at any major regional venue.'
      },
      {
        title: 'Bespoke Customization',
        description: 'Millwork, custom finishes, and configurations tailored precisely to brand guidelines.'
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
    if (v.paused) v.play().catch(() => {});
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
  const [aboutScrollProgress, setAboutScrollProgress] = useState(0);
  const aboutRef = useRef(null);
  const lastWheelTime = useRef(0);
  const scrollTimeoutRef = useRef(null);
  const transitionedInThisGestureRef = useRef(false);

  const activeSlideIdx = useMemo(() => {
    // 3 stops total (index 0, 1, or 2).
    return Math.min(2, Math.max(0, Math.round(aboutScrollProgress * 2)));
  }, [aboutScrollProgress]);

const getPillNumbers = (activeIdx, total) => {
  return [0, 1];
};

  const translateX = useMemo(() => {
    // 3 slide panels, so translate goes from 0vw to 200vw
    return aboutScrollProgress * 200;
  }, [aboutScrollProgress]);

  const scrollToSlide = (targetIdx) => {
    const el = aboutRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const targetProgress = targetIdx / 2;
    el.scrollTo({
      top: targetProgress * maxScroll,
      behavior: 'smooth',
    });
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

  useEffect(() => {
    const el = aboutRef.current;
    if (!el || activeCat !== 'about-us') return undefined;

    const handleWheel = (e) => {
      const isMobile = window.innerWidth <= 860;
      if (isMobile) return; // let native scroll handle it on mobile

      e.preventDefault();

      // Clear the timeout for resetting gesture state
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce: when scroll wheel activity stops for 250ms, reset the gesture lock
      scrollTimeoutRef.current = setTimeout(() => {
        transitionedInThisGestureRef.current = false;
        scrollTimeoutRef.current = null;
      }, 250);

      // If we already transitioned in this continuous gesture/swipe, ignore further input
      if (transitionedInThisGestureRef.current) {
        return;
      }

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      const currentScroll = el.scrollTop;
      const slide1Scroll = 0.5 * maxScroll;
      const slide2Scroll = maxScroll;

      // Identify current slide index
      let currentIdx = 0;
      if (currentScroll > (slide1Scroll + slide2Scroll) / 2) {
        currentIdx = 2;
      } else if (currentScroll > slide1Scroll / 2) {
        currentIdx = 1;
      }

      if (e.deltaY > 0) {
        // Scrolling down
        if (currentIdx === 0) {
          transitionedInThisGestureRef.current = true;
          setAboutScrolled(true);
          el.scrollTo({
            top: slide1Scroll,
            behavior: 'smooth',
          });
        } else if (currentIdx === 1) {
          transitionedInThisGestureRef.current = true;
          el.scrollTo({
            top: slide2Scroll,
            behavior: 'smooth',
          });
        } else if (currentIdx === 2) {
          transitionedInThisGestureRef.current = true;
          setActiveCat('graduation');
          setAboutScrollProgress(0);
          setAboutScrolled(false);
        }
      } else if (e.deltaY < 0) {
        // Scrolling up
        if (currentIdx === 2) {
          transitionedInThisGestureRef.current = true;
          el.scrollTo({
            top: slide1Scroll,
            behavior: 'smooth',
          });
        } else if (currentIdx === 1) {
          transitionedInThisGestureRef.current = true;
          setAboutScrolled(false);
          el.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [activeCat]);

  const [viewerIdx, setViewerIdx] = useState(null); // project index in the filtered list
  const [mediaIdx, setMediaIdx] = useState(0); // media index inside the open project
  const [navDir, setNavDir] = useState(0); // -1 came from below, 1 came from above
  const [hoverClient, setHoverClient] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const viewerRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const activeIdxRef = useRef(0);
  const clientsRef = useRef([]);
  const engine = useRef({ offset: 0, target: 0, lastInput: 0 });
  const wheelGate = useRef(0);
  const touchStart = useRef(null);
  const aboutTouchY = useRef(null);

  const handleAboutScroll = (e, isLayout) => {
    const isMobile = window.innerWidth <= 860;
    if (isLayout !== isMobile) return;
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const progress = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
    setAboutScrollProgress(progress);

    if (el.scrollTop > 20) {
      setAboutScrolled(true);
    } else {
      setAboutScrolled(false);
    }

    // Auto-transition to projects listing when scrolled past the buffer on desktop
    // Disabled on desktop to allow explicit step navigation to slide 3.

  };

  const handleAboutWheel = (e, isLayout) => {
    const isMobile = window.innerWidth <= 860;
    if (isLayout !== isMobile) return;
    const el = e.currentTarget;
    if (e.deltaY > 0) {
      setAboutScrolled(true);
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
      if (isAtBottom && isMobile) {
        setActiveCat('graduation');
      }
    } else if (e.deltaY < 0) {
      if (el.scrollTop <= 5) {
        setAboutScrolled(false);
      }
    }
  };

  const handleAboutTouchStart = (e, isLayout) => {
    const isMobile = window.innerWidth <= 860;
    if (isLayout !== isMobile) return;
    aboutTouchY.current = e.touches[0].clientY;
  };

  const handleAboutTouchMove = (e, isLayout) => {
    const isMobile = window.innerWidth <= 860;
    if (isLayout !== isMobile) return;
    if (aboutTouchY.current === null) return;
    const dy = aboutTouchY.current - e.touches[0].clientY;
    const el = e.currentTarget;
    if (dy > 10) {
      setAboutScrolled(true);
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
      if (isAtBottom && isMobile) {
        setActiveCat('graduation');
        aboutTouchY.current = null;
      }
    } else if (dy < -10) {
      if (el.scrollTop <= 5) {
        setAboutScrolled(false);
      }
    }
  };

  const handleAboutTouchEnd = (e, isLayout) => {
    const isMobile = window.innerWidth <= 860;
    if (isLayout !== isMobile) return;
    aboutTouchY.current = null;
  };

  const clients = useMemo(
    () =>
      ALL_CLIENTS.filter(
        (c) =>
          (activeCat === 'all' || c.category === activeCat) &&
          (activeYear === 'all' || c.year === activeYear)
      ),
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

  // keyboard: left/right = media, up/down = project, esc = close
  useEffect(() => {
    if (viewerIdx === null) return undefined;
    const onKey = (e) => {
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
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerIdx, clients]);

  // play only the media currently in frame
  useEffect(() => {
    if (viewerIdx === null) return;
    document.querySelectorAll('.pf-viewer-cell').forEach((cell, i) => {
      const video = cell.querySelector('video');
      if (!video) return;
      if (i === mediaIdx) video.play().catch(() => {});
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
                setAboutScrollProgress(0);
                setTimeout(() => {
                  if (aboutRef.current) {
                    aboutRef.current.scrollTop = 0;
                  }
                }, 50);
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

        <div
          className={`pf-layout ${activeCat === 'about-us' ? 'about-mode' : ''}`}
          onScroll={(e) => handleAboutScroll(e, true)}
          onWheel={(e) => handleAboutWheel(e, true)}
          onTouchStart={(e) => handleAboutTouchStart(e, true)}
          onTouchMove={(e) => handleAboutTouchMove(e, true)}
          onTouchEnd={(e) => handleAboutTouchEnd(e, true)}
        >
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
                {CATEGORIES.map((cat) => {
                  const count = cat.key === 'all' ? ALL_CLIENTS.length : ALL_CLIENTS.filter((c) => c.category === cat.key).length;
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
              <a href="https://wa.me/971565348700" target="_blank" rel="noopener noreferrer">
                +971 56 534 8700 (WhatsApp)
              </a>
              <span>Al Qusais, Dubai, UAE</span>
              <span className="pf-side-copy">© 2026 Exhibit Graphic Sign, Est. 2010</span>
            </div>
          </aside>

          {activeCat === 'about-us' ? (
            <section
              ref={aboutRef}
              className="pf-about-section"
              onScroll={(e) => handleAboutScroll(e, false)}
              onWheel={(e) => handleAboutWheel(e, false)}
              onTouchStart={(e) => handleAboutTouchStart(e, false)}
              onTouchMove={(e) => handleAboutTouchMove(e, false)}
              onTouchEnd={(e) => handleAboutTouchEnd(e, false)}
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
                                <span className="pf-slide-stage">DISCOVER</span>
                                <h2 className="pf-slide-headline">THE WAY<br />WE WORK</h2>
                              </div>

                              {/* Middle/Left Image */}
                              <div className="pf-intro-media">
                                <img
                                  src={slide.images[0]}
                                  className="pf-intro-img"
                                  alt="EGS Exhibition Stand"
                                  loading="eager"
                                />
                              </div>

                              {/* Bottom Middle Headline */}
                              <div className="pf-intro-bottom-mid">
                                <h3 className="pf-intro-passion-headline">
                                  WE BUILD WITH PASSION &amp;<br />UNCOMPROMISING DETAIL
                                </h3>
                              </div>

                              {/* Bottom Left Copy */}
                              <div className="pf-intro-bottom-left">
                                <span className="pf-intro-visit-tag">THE MANIFESTO</span>
                                <p className="pf-intro-visit-copy">
                                  Every stand, kiosk, display, and branded space is built to help clients show up clearly, confidently, and professionally.
                                </p>
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
                              </div>

                              {/* Bottom Right: Contact Button */}
                              <div className="pf-intro-bottom-right">
                                <a
                                  href="mailto:info@exhibitgraphicsign.com"
                                  className="pf-intro-contact-btn"
                                >
                                  <span>CONTACT</span>
                                  <span className="pf-contact-arrow-circle">→</span>
                                </a>
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
                                  <span className="pf-usps-section-tag">CAPABILITY MANIFESTO</span>
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

                                {/* Bottom Left Title Group */}
                                <div className="pf-usps-bottom-left">
                                  <span className="pf-slide-stage">OPERATIONAL PILLARS</span>
                                  <h2 className="pf-slide-headline">
                                    WE DESIGN, FABRICATE, AND INSTALL YOUR SPACES ACROSS THE UAE
                                  </h2>
                                </div>
                              </div>

                              {/* Middle/Right Offset Images */}
                              <div className="pf-usps-media">
                                <img
                                  src={slide.images[0]}
                                  className="pf-usps-img img-top"
                                  alt="EGS Kiosk Build"
                                  loading="lazy"
                                />
                                <img
                                  src={slide.images[1]}
                                  className="pf-usps-img img-bottom"
                                  alt="EGS Mall Installation"
                                  loading="lazy"
                                />
                              </div>

                              {/* Keep scrolling hint */}
                              <div className="pf-usps-scroll-hint">
                                <span>Keep scrolling for projects</span>
                                <span className="pf-scroll-arrow-down">↓</span>
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
                      <span className="pf-item-name">{client.name}</span>
                      <span className="pf-item-meta">{client.meta}</span>
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
              className={`pf-viewer-stage ${
                navDir === 1 ? 'nav-dir-next' : navDir === -1 ? 'nav-dir-prev' : 'nav-dir-none'
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
