import { useState, useMemo, useEffect, useRef } from 'react';
import pageStyles from '../styles/pages/content-first.css?raw';
import portfolioStyles from '../styles/pages/graduation-portfolio.css?raw';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from './SiteChrome.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import hero2021 from '../assets/Graduation/2021-hero.jpg';

// Scan all files in the graduation assets gallery
const graduationAssets = import.meta.glob('../assets/Graduation/Websites Gallery Graduations/**/*', {
  eager: true,
  import: 'default'
});

// Build projects map by year and campus key
const projectsMap = {};

Object.entries(graduationAssets).forEach(([path, url]) => {
  if (path.includes('.DS_Store')) return;

  const prefix = '../assets/Graduation/Websites Gallery Graduations/';
  const relativePath = path.substring(path.indexOf(prefix) + prefix.length);
  const parts = relativePath.split('/');

  let year = null;
  let campusFolder = null;
  const filename = parts[parts.length - 1];

  if (relativePath.startsWith('2021 Videos')) {
    year = 2021;
    campusFolder = 'hct';
  } else if (relativePath.startsWith('RAK AA -Pics Vids')) {
    year = 2025;
    campusFolder = 'rak-aa';
  } else {
    year = parseInt(parts[0], 10);
    const folder = parts[1] || '';
    const norm = folder.toLowerCase().trim();
    if (norm.includes('abu dhabi') || norm === 'aud') {
      campusFolder = 'abu-dhabi';
    } else if (norm.includes('dubai') || norm === 'dxb' || norm.includes('coca')) {
      campusFolder = 'dubai';
    } else if (norm.includes('fujairah')) {
      campusFolder = 'fujairah';
    } else if (norm.includes('ras') || norm === 'rak') {
      campusFolder = 'ras-al-khaimah';
    } else if (norm.includes('sharjah')) {
      campusFolder = 'sharjah';
    } else {
      campusFolder = folder;
    }
  }

  if (!year || !campusFolder || !filename) return;

  const ext = filename.split('.').pop().toLowerCase();
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
  const isPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);

  if (!isVideo && !isPhoto) return;

  const key = `${year}-${campusFolder}`;
  if (!projectsMap[key]) {
    projectsMap[key] = {
      year,
      campusFolder,
      photos: [],
      videos: []
    };
  }

  if (isVideo) {
    projectsMap[key].videos.push({ name: filename, url });
  } else {
    projectsMap[key].photos.push({ name: filename, url });
  }
});

// Metadata config map for campuses and years
const CAMPUS_METADATA = {
  'rak-aa': {
    title: 'RAK American Academy Ceremony 2025',
    location: 'Ras Al Khaimah, UAE',
    institution: 'RAK American Academy',
    shortDesc: 'Premium school graduation setup featuring custom stage backdrop woodwork, carpeting, registration lobby, and VIP protocol routing.',
    venue: 'RAK American Academy Auditorium',
    vip: 'Royal Family Representatives',
    stats: '60 Graduates | 1,200 Guests'
  },
  'abu-dhabi': {
    title: 'HCT Abu Dhabi Ceremony',
    location: 'ADNEC, Abu Dhabi',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: 'Mega-scale staging and high-definition LED video wall production at ADNEC.',
    venue: 'ADNEC Halls, Abu Dhabi',
    vip: 'Dr. Ahmad Belhoul Al Falasi, Minister of Education',
    stats: '1,668 Graduates | 5,000 Guests'
  },
  'dubai': {
    title: 'HCT Dubai Ceremony',
    location: 'Dubai, UAE',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: 'Premium ballroom staging and venue branding coordination for HCT Dubai campuses.',
    venue: 'Grand Hyatt Dubai, UAE',
    vip: 'H.H. Sheikh Mansoor bin Mohammed bin Rashid Al Maktoum',
    stats: '602 Graduates | 2,200 Guests'
  },
  'fujairah': {
    title: 'HCT Fujairah Ceremony',
    location: 'Fujairah, UAE',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: 'Complete campus ceremony production plus custom carpentered staging built for the HCT Fujairah graduation program.',
    venue: 'Zayed Sports Complex, Fujairah',
    vip: 'H.H. Sheikh Mohammed bin Hamad Al Sharqi, Crown Prince of Fujairah',
    stats: '535 Graduates | 1,800 Guests'
  },
  'ras-al-khaimah': {
    title: 'HCT Ras Al Khaimah Ceremony',
    location: 'HCT Ras Al Khaimah Campus, UAE',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: 'Campus-wide ceremony setup featuring high-stakes stage carpentry and extensive outdoor lobby branding.',
    venue: 'Ras Al Khaimah Campus Sports Hall',
    vip: 'Sheikh Saqr bin Saud bin Saqr Al Qasimi',
    stats: '576 Graduates | 1,800 Guests'
  },
  'sharjah': {
    title: 'HCT Sharjah Ceremony',
    location: 'University City Hall, Sharjah',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: 'Double ceremony production and visitor flow management at University City Hall.',
    venue: 'University City Hall, Sharjah',
    vip: 'Sheikh Salem bin Abdulrahman / Sheikh Mohammed bin Humaid',
    stats: '937 Graduates (2 sessions) | 3,000 Guests'
  },
  'hct-2021': {
    title: 'HCT Graduation Ceremony 2021',
    location: 'HCT Campuses, UAE',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: 'Official graduation ceremony video highlights for HCT campuses across the UAE for the class of 2021.',
    venue: 'HCT Campuses, UAE',
    vip: 'HCT Leadership & Government Officials',
    stats: 'Class of 2021'
  }
};

const getCampusMetadata = (campusKey, year) => {
  if (campusKey === 'hct' && year === 2021) {
    return CAMPUS_METADATA['hct-2021'];
  }
  
  const meta = CAMPUS_METADATA[campusKey] || {
    title: `HCT ${campusKey.toUpperCase()} Ceremony ${year}`,
    location: 'UAE',
    institution: 'Higher Colleges of Technology (HCT)',
    shortDesc: `HCT graduation ceremony production in ${year}.`,
    venue: `${campusKey.toUpperCase()} Campus`,
    vip: 'Institutional Leadership',
    stats: 'Graduation Ceremony'
  };

  // Customize dynamic attributes per year
  if (campusKey === 'abu-dhabi') {
    return {
      ...meta,
      title: `HCT Abu Dhabi Ceremony ${year}`,
      shortDesc: `Mega-scale staging and high-definition LED video wall production at ADNEC for the HCT Abu Dhabi ${year} cohort.`,
      vip: year === 2025 ? 'Dr. Ahmad Belhoul Al Falasi, Minister of Education' : 'HCT Director General & Campus Leadership',
      stats: year === 2025 ? '1,668 Graduates | 5,000 Guests' : '1,500 Graduates | 4,500 Guests'
    };
  }

  if (campusKey === 'dubai') {
    return {
      ...meta,
      title: `HCT Dubai Ceremony ${year}`,
      location: year === 2025 ? 'Grand Hyatt Dubai, UAE' : 'Coca-Cola Arena, Dubai',
      venue: year === 2025 ? 'Grand Hyatt Dubai' : 'Coca-Cola Arena, Dubai',
      shortDesc: `Premium ballroom staging and venue branding coordination for HCT Dubai campuses at ${year === 2025 ? 'Grand Hyatt' : 'Coca-Cola Arena'}.`,
      vip: year === 2025 ? 'H.H. Sheikh Mansoor bin Mohammed bin Rashid Al Maktoum' : 'Dubai Government Representatives',
      stats: year === 2025 ? '602 Graduates | 2,200 Guests' : '580 Graduates | 2,000 Guests'
    };
  }

  if (campusKey === 'fujairah') {
    return {
      ...meta,
      title: `HCT Fujairah Ceremony ${year}`,
      location: year === 2025 ? 'Zayed Sports Complex, Fujairah' : 'Fujairah, UAE',
      shortDesc: `Complete campus ceremony production plus custom carpentered staging built for the HCT Fujairah ${year} ceremony.`,
      stats: year === 2025 ? '535 Graduates | 1,800 Guests' : '450 Graduates | 1,500 Guests'
    };
  }

  if (campusKey === 'ras-al-khaimah') {
    return {
      ...meta,
      title: `HCT Ras Al Khaimah Ceremony ${year}`,
      shortDesc: `Campus-wide ceremony setup featuring high-stakes stage carpentry and extensive outdoor lobby branding for HCT RAK in ${year}.`,
      stats: year === 2025 ? '576 Graduates | 1,800 Guests' : '480 Graduates | 1,600 Guests'
    };
  }

  if (campusKey === 'sharjah') {
    return {
      ...meta,
      title: `HCT Sharjah Ceremony ${year}`,
      shortDesc: `Double ceremony production and visitor flow management at University City Hall for HCT Sharjah ${year}.`,
      stats: year === 2025 ? '937 Graduates (2 sessions) | 3,000 Guests' : '820 Graduates | 2,500 Guests'
    };
  }

  return meta;
};

// Map scanner results into GRADUATION_PROJECTS
const GRADUATION_PROJECTS = Object.entries(projectsMap).map(([key, data]) => {
  const { year, campusFolder, photos, videos } = data;

  // Clone lists to apply modifications
  let customVideos = [...videos];
  let customPhotos = [...photos];

  // Specific removals
  if (year === 2025 && campusFolder === 'dubai') {
    customVideos = customVideos.filter(v => v.name !== 'Dxb Promo.mp4');
  }
  if (year === 2024 && campusFolder === 'fujairah') {
    customVideos = customVideos.filter(v => v.name !== '20240929_103534.mp4');
  }

  // Sort photos alphabetically
  customPhotos.sort((a, b) => a.name.localeCompare(b.name));

  // Sort videos (default alphabetical)
  customVideos.sort((a, b) => a.name.localeCompare(b.name));

  // Apply custom video sorting overrides
  if (year === 2025 && campusFolder === 'abu-dhabi') {
    // Hero: "HCT Abu Dhabi Promo.mp4", Last: "20251113_124651.mp4"
    const heroVideo = customVideos.find(v => v.name === 'HCT Abu Dhabi Promo.mp4');
    const lastVideo = customVideos.find(v => v.name === '20251113_124651.mp4');
    const restVideos = customVideos.filter(v => v.name !== 'HCT Abu Dhabi Promo.mp4' && v.name !== '20251113_124651.mp4');
    
    customVideos = [];
    if (heroVideo) customVideos.push(heroVideo);
    customVideos.push(...restVideos);
    if (lastVideo) customVideos.push(lastVideo);
  }

  if (year === 2025 && campusFolder === 'rak-aa') {
    // Last: "RAK Stage Setup - Timelapse.mp4"
    const lastVideo = customVideos.find(v => v.name === 'RAK Stage Setup - Timelapse.mp4');
    const restVideos = customVideos.filter(v => v.name !== 'RAK Stage Setup - Timelapse.mp4');
    
    customVideos = [];
    customVideos.push(...restVideos);
    if (lastVideo) customVideos.push(lastVideo);
  }

  if (year === 2024 && campusFolder === 'fujairah') {
    // Hero: "Fujairah Highlights.mp4"
    const heroVideo = customVideos.find(v => v.name === 'Fujairah Highlights.mp4');
    const restVideos = customVideos.filter(v => v.name !== 'Fujairah Highlights.mp4');
    
    customVideos = [];
    if (heroVideo) customVideos.push(heroVideo);
    customVideos.push(...restVideos);
  }

  const meta = getCampusMetadata(campusFolder, year);

  // Group photos and videos into a single mediaItems list
  const mediaItems = [];
  customVideos.forEach(v => {
    mediaItems.push({ type: 'video', url: v.url, name: v.name });
  });
  customPhotos.forEach(p => {
    mediaItems.push({ type: 'photo', url: p.url, name: p.name });
  });

  let image = customPhotos.length > 0 ? customPhotos[0].url : null;
  if (year === 2021) {
    image = hero2021;
  }
  const video = customVideos.length > 0 ? customVideos[0].url : null;

  return {
    id: `${campusFolder}-${year}`,
    title: meta.title,
    year,
    campus: campusFolder,
    shortDesc: meta.shortDesc,
    location: meta.location,
    image,
    video,
    stats: meta.stats,
    tags: campusFolder === 'rak-aa' ? ['Stage', 'Branding', 'Woodwork'] : ['Stage', 'LED & AV', 'Branding'],
    facts: {
      'Venue': meta.venue,
      'Graduates': meta.stats.includes('|') ? meta.stats.split('|')[0].trim() : meta.stats,
      'Guests': meta.stats.includes('|') ? meta.stats.split('|')[1].trim() : 'Audience',
      'VIP Attendee': meta.vip,
      'Institution': meta.institution
    },
    scope: meta.institution.includes('HCT') ? [
      'Custom stage design, structural engineering & carpentry build',
      'High-resolution LED video wall backdrops & live AV control',
      'VIP protocol seating layouts & carpet runs',
      'Venue facade & entry perimeter branding setup',
      'On-site production operation & timing coordination'
    ] : [
      'Custom stage backdrop woodwork & carpentry setup',
      'Lobby registration counters & print signage installation',
      'Auditorium sound tuning & lighting configuration',
      'VIP protocol seating & carpet alignment',
      'On-site event operations & cue sheets orchestration'
    ],
    mediaItems
  };
});

// Sort projects by year descending, then alphabetically by title
GRADUATION_PROJECTS.sort((a, b) => {
  if (b.year !== a.year) return b.year - a.year;
  return a.title.localeCompare(b.title);
});

export default function GraduationPortfolioPage() {
  const [activeYear, setActiveYear] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [cinemaIndex, setCinemaIndex] = useState(null);

  // Filter projects based on Year and Search query
  const filteredProjects = useMemo(() => {
    return GRADUATION_PROJECTS.filter((project) => {
      const matchesYear = activeYear === 'All' || String(project.year) === activeYear;
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.stats.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesYear && matchesSearch;
    });
  }, [activeYear, searchQuery]);

  // Page lifecycle title and scroll reveal animations configuration
  const revealSelector = [
    '.content-page .chip',
    '.content-page .hero-copy h1',
    '.content-page .hero-copy .lede',
    '.filter-search-container',
    '.portfolio-card',
    '.footer-grid > *',
    '.footer-big',
    '.footer-bottom'
  ].join(', ');

  usePageLifecycle('Graduation Portfolio | EGS Ceremony Staging Dubai & UAE', {
    revealSelector,
    description: 'Explore our extensive portfolio of graduation ceremonies produced for the Higher Colleges of Technology (HCT) and schools across Dubai, Abu Dhabi, and the Northern Emirates.',
    ogImage: 'https://exhibitgraphicsign.com/wp-content/uploads/2024/05/HCT-Finland-Helsinki-1.jpeg',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "EGS Graduation Ceremony Portfolio",
      "description": "Explore the extensive physical staging, AV, and venue branding portfolio for university and school graduation ceremonies executed across the UAE.",
      "url": "https://exhibitgraphicsign.com/graduation-portfolio",
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "item": {
              "@type": "Event",
              "name": "HCT Abu Dhabi Graduation Ceremony",
              "description": "Mega-scale staging and high-definition LED video wall production at ADNEC for HCT Abu Dhabi.",
              "location": {
                "@type": "Place",
                "name": "ADNEC, Abu Dhabi",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Abu Dhabi",
                  "addressCountry": "AE"
                }
              }
            }
          },
          {
            "@type": "ListItem",
            "position": 2,
            "item": {
              "@type": "Event",
              "name": "HCT Dubai Graduation Ceremony",
              "description": "ballroom staging and venue branding coordination for HCT Dubai campuses at Grand Hyatt Dubai.",
              "location": {
                "@type": "Place",
                "name": "Grand Hyatt Dubai",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Dubai",
                  "addressCountry": "AE"
                }
              }
            }
          },
          {
            "@type": "ListItem",
            "position": 3,
            "item": {
              "@type": "Event",
              "name": "HCT Fujairah Graduation Ceremony",
              "description": "Complete campus ceremony production plus custom carpentered staging built at Zayed Sports Complex.",
              "location": {
                "@type": "Place",
                "name": "Zayed Sports Complex, Fujairah",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Fujairah",
                  "addressCountry": "AE"
                }
              }
            }
          },
          {
            "@type": "ListItem",
            "position": 4,
            "item": {
              "@type": "Event",
              "name": "HCT Ras Al Khaimah Graduation Ceremony",
              "description": "Campus-wide ceremony setup featuring stage carpentry and outdoor lobby branding.",
              "location": {
                "@type": "Place",
                "name": "Ras Al Khaimah Campus Sports Hall",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Ras Al Khaimah",
                  "addressCountry": "AE"
                }
              }
            }
          },
          {
            "@type": "ListItem",
            "position": 5,
            "item": {
              "@type": "Event",
              "name": "HCT Sharjah Graduation Ceremony",
              "description": "Double ceremony production and visitor flow management at University City Hall, Sharjah.",
              "location": {
                "@type": "Place",
                "name": "University City Hall, Sharjah",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Sharjah",
                  "addressCountry": "AE"
                }
              }
            }
          }
        ]
      }
    }
  });

  // Modal handlers
  const handleOpenModal = (project) => {
    setSelectedProject(project);
    setCinemaIndex(null);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setCinemaIndex(null);
  };

  // Close modal/cinema when pressing Escape, navigate with Arrow keys in Cinema mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (cinemaIndex !== null) {
          setCinemaIndex(null);
        } else {
          handleCloseModal();
        }
      } else if (cinemaIndex !== null && selectedProject) {
        if (e.key === 'ArrowLeft') {
          setCinemaIndex((prev) => (prev === 0 ? selectedProject.mediaItems.length - 1 : prev - 1));
        } else if (e.key === 'ArrowRight') {
          setCinemaIndex((prev) => (prev === selectedProject.mediaItems.length - 1 ? 0 : prev + 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cinemaIndex, selectedProject]);

  // Sync scroll lock on body when modal is open
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProject]);

  // Track the last active project to support fluid close animations without React null-errors
  const lastProjectRef = useRef(null);
  if (selectedProject) {
    lastProjectRef.current = selectedProject;
  }
  const modalProject = selectedProject || lastProjectRef.current || GRADUATION_PROJECTS[0];

  return (
    <>
      <style>{pageStyles}</style>
      <style>{portfolioStyles}</style>

      <div className="content-page graduation-portfolio-page" style={{ '--accent': '#482683' }}>
        <Navbar active="events" cta="Send us your brief" overlay />

        {/* Hero Section */}
        <section className="content-hero">
          <div className="container">
            <div className="hero-board">
              <div className="hero-copy">
                <div>
                  <div className="chip-row">
                    <span className="chip"><span className="chip-dot" />Ceremony Portfolio</span>
                    <span className="chip"><span className="chip-dot" />Institutional Proof</span>
                  </div>
                  <h1 className="wide-title">Lasting moments.</h1>
                  <p className="lede">Browse through our high-stakes graduation ceremonies, stage setups, and AV production work across the UAE.</p>
                </div>
              </div>
              
              <div className="archive-board reveal">
                <div className="hero-stats-grid">
                  <div className="stat-card">
                    <div className="stat-num">
                      25<span className="stat-unit">+</span>
                    </div>
                    <span className="stat-label">Grand Ceremonies</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">
                      12,000<span className="stat-unit">+</span>
                    </div>
                    <span className="stat-label">Graduates Staged</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">
                      7<span className="stat-unit">+ Yrs</span>
                    </div>
                    <span className="stat-label">Consecutive Trust</span>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num">
                      All <span className="stat-unit">UAE</span>
                    </div>
                    <span className="stat-label">Emirates Staged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar Row */}
        <section className="filter-search-container">
          <div className="container">
            <div className="filter-search-inner">
              {/* Year Filter Buttons */}
              <div className="filters-group">
                {['All', '2025', '2024', '2021'].map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={`filter-btn ${activeYear === year ? 'active' : ''}`}
                    onClick={() => setActiveYear(year)}
                  >
                    {year === 'All' ? 'Filter - All' : year}
                  </button>
                ))}
              </div>

              {/* Search Bar Input */}
              <div className="search-box-wrap">
                <input
                  type="text"
                  placeholder="Search ceremony, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-field"
                  aria-label="Search portfolio"
                />
                <span className="search-icon-btn" aria-hidden="true">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="clear-search-btn"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio Cards Grid Section */}
        <section className="portfolio-gallery-section">
          <div className="container">
            <div className="portfolio-grid">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => (
                  <article
                    key={project.id}
                    className="portfolio-card"
                    style={{ '--reveal-delay': `${(index % 4) * 80}ms` }}
                    onClick={() => handleOpenModal(project)}
                  >
                    <div className="portfolio-card-inner">
                      <div className="portfolio-card-media">
                        {project.image ? (
                          <img src={project.image} alt={project.title} loading="lazy" />
                        ) : (
                          <div className="empty-image-placeholder">
                            <span className="placeholder-year">Class of {project.year}</span>
                            <span className="play-icon-overlay">▶ Video Highlights</span>
                          </div>
                        )}
                        <span className="card-year-badge">{project.year}</span>
                      </div>

                      <div className="portfolio-card-body">
                        <h3>{project.title}</h3>
                        <div className="portfolio-card-location">
                          📍 <span>{project.location}</span>
                        </div>
                        
                        <div className="portfolio-card-stats">
                          🎓 <span>{project.facts['Graduates'] || 'HCT Graduates'}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="no-results-box">
                  <h3>No ceremonies matched your criteria</h3>
                  <p>Try clearing your search query or choosing another year filter.</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setActiveYear('All');
                      setSearchQuery('');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <Footer />

        {/* Dynamic Detail Modal */}
        {(selectedProject || lastProjectRef.current) && (
          <div
            className={`portfolio-modal-overlay ${selectedProject ? 'is-open' : ''}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <div className="portfolio-modal-container" role="dialog" aria-modal="true">
              
              {/* Modal Header */}
              <div className="portfolio-modal-header">
                <div className="modal-header-left">
                  <h2>{modalProject.title}</h2>
                  <div className="modal-header-meta">
                    <span className="modal-location-badge">📍 {modalProject.location}</span>
                    <span className="modal-year-badge">{modalProject.year}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="modal-close-btn"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="portfolio-modal-body">
                
                {/* Top Section: Hero Viewport and Facts Dossier (2 columns) */}
                <div className="modal-top-section">
                  <div 
                    className="modal-media-viewport"
                    onClick={() => {
                      if (modalProject.mediaItems.length > 0) {
                        setCinemaIndex(0);
                      }
                    }}
                  >
                    {modalProject.video ? (
                      <video
                        key={modalProject.video}
                        src={modalProject.video}
                        controls
                        autoPlay
                        muted
                        playsInline
                        loop
                      />
                    ) : modalProject.image ? (
                      <img
                        src={modalProject.image}
                        alt={`${modalProject.title} cover`}
                      />
                    ) : (
                      <div className="empty-image-placeholder-large">
                        <span>Class of {modalProject.year}</span>
                        <span>▶ Click below to watch videos</span>
                      </div>
                    )}
                    
                    <div className="media-viewport-overlay">
                      <span>🔍 Click to enter Cinema Mode</span>
                    </div>
                  </div>

                  {/* Right Column: Facts Dossier & Scope of Work */}
                  <div className="modal-facts-column">
                    
                    {/* Quick Facts */}
                    <div>
                      <span className="facts-section-title">Quick Facts</span>
                      <div className="dossier" data-label="Ceremony Profile">
                        {Object.entries(modalProject.facts).map(([key, val]) => (
                          <div className="dossier-row" key={key}>
                            <span className="k">{key}</span>
                            <span className="v">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scope of Work */}
                    <div>
                      <span className="facts-section-title">Scope of Work</span>
                      <div className="modal-scope-list">
                        {modalProject.scope.map((item, index) => (
                          <div key={index} className="modal-scope-item">
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Section: Full-Width Ceremony Gallery Grid */}
                <div className="modal-media-grid-section">
                  <span className="media-grid-title">Ceremony Gallery ({modalProject.mediaItems.length} items)</span>
                  <div className="modal-media-grid">
                    {modalProject.mediaItems.map((item, index) => (
                      <div
                        key={index}
                        className="modal-media-grid-item"
                        onClick={() => setCinemaIndex(index)}
                      >
                        {item.type === 'video' ? (
                          <div className="grid-item-video-wrapper">
                            <video src={item.url} preload="metadata" muted playsInline />
                            <div className="video-play-overlay">
                              <span className="play-icon">▶</span>
                              <span className="video-duration">{item.name.replace(/\.[^/.]+$/, "")}</span>
                            </div>
                          </div>
                        ) : (
                          <img src={item.url} alt={`${modalProject.title} media ${index + 1}`} loading="lazy" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Cinema Lightbox Overlay */}
        {cinemaIndex !== null && selectedProject && selectedProject.mediaItems[cinemaIndex] && (
          <div 
            className="cinema-lightbox-overlay"
            onClick={() => setCinemaIndex(null)}
          >
            <div className="cinema-lightbox-container" onClick={(e) => e.stopPropagation()}>
              <button 
                type="button" 
                className="cinema-close-btn" 
                onClick={() => setCinemaIndex(null)}
                aria-label="Close Cinema Mode"
              >
                ✕
              </button>

              <button 
                type="button" 
                className="cinema-arrow-btn prev" 
                onClick={(e) => {
                  e.stopPropagation();
                  setCinemaIndex((prev) => (prev === 0 ? selectedProject.mediaItems.length - 1 : prev - 1));
                }}
                aria-label="Previous Media"
              >
                ⟨
              </button>

              <div className="cinema-lightbox-content">
                {selectedProject.mediaItems[cinemaIndex].type === 'video' ? (
                  <video
                    key={selectedProject.mediaItems[cinemaIndex].url}
                    src={selectedProject.mediaItems[cinemaIndex].url}
                    controls
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img 
                    src={selectedProject.mediaItems[cinemaIndex].url} 
                    alt={`${selectedProject.title} large gallery`} 
                  />
                )}
              </div>

              <button 
                type="button" 
                className="cinema-arrow-btn next" 
                onClick={(e) => {
                  e.stopPropagation();
                  setCinemaIndex((prev) => (prev === selectedProject.mediaItems.length - 1 ? 0 : prev + 1));
                }}
                aria-label="Next Media"
              >
                ⟩
              </button>

              <div className="cinema-lightbox-footer">
                <span className="cinema-media-name">{selectedProject.mediaItems[cinemaIndex].name.replace(/\.[^/.]+$/, "")}</span>
                <span className="cinema-counter">{cinemaIndex + 1} / {selectedProject.mediaItems.length}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
