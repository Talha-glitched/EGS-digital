import { useState, useMemo, useEffect, useRef } from 'react';
import pageStyles from '../styles/pages/content-first.css?raw';
import portfolioStyles from '../styles/pages/graduation-portfolio.css?raw';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from './SiteChrome.jsx';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';

// Import Assets
import adgrad1 from '../assets/Graduation/ADGRAD1.jpg';
import adgrad2 from '../assets/Graduation/ADGRAD2.jpg';
import shj1 from '../assets/Graduation/SHJ1.jpg';
import shj2 from '../assets/Graduation/SHJ2.jpg';
import shj3 from '../assets/Graduation/SHJ3.jpg';
import operation from '../assets/Graduation/operation.jpeg';
import hctGraduationVideo from '../assets/hctgraduation.mp4';

// Project Dataset
const GRADUATION_PROJECTS = [
  {
    id: 'fujairah-2025',
    title: 'HCT Fujairah Ceremony 2025',
    year: 2025,
    shortDesc: 'Full Zayed Sports Complex ceremony production plus an urgent carpenters stage extension delivered in 10 hours before showtime.',
    location: 'Zayed Sports Complex, Fujairah',
    image: shj1,
    video: hctGraduationVideo,
    stats: '535 Graduates | 1,800 Guests',
    tags: ['Stage', 'LED & AV', 'Branding'],
    facts: {
      'Venue': 'Zayed Sports Complex, Fujairah',
      'Graduates': '535 Students',
      'Guests': '1,800 Audience members',
      'VIP Attendee': 'H.H. Sheikh Mohammed bin Hamad Al Sharqi, Crown Prince of Fujairah',
      'Stage Adaptation': '5-6 Metre Extension (Built in 10 Hours)',
    },
    scope: [
      'Stage design, structural engineering & carpentry build',
      'Full venue perimeter & facade branding',
      'LED video wall backdrops & live AV control',
      'VIP protocol seating layout & carpet run',
      'On-site event operations support & sequence callouts'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Staging & Stage Extensions',
        'desc': 'Custom carpentered staging engineered for VIP protocol and student walkthrough. At Fujairah, EGS extended the stage by 5-6 metres within a 10-hour window to accommodate late-requested photo display builds without delaying the rehearsal schedule.',
        'images': [shj1, adgrad1]
      },
      'LED & AV': {
        'title': 'LED Backdrop & AV Production',
        'desc': 'High-definition LED backdrops configured to run multi-feed displays for student names, live video broadcast, and ceremonial visual theme templates. Audio arrays tuned specifically for acoustics of larger sports halls and convention centres.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Full Venue Perimeter Branding',
        'desc': 'Consistent brand rollout across main venue facade, entry gates, registration desks, and internal walls. High-quality print finishes that photograph perfectly under stage lighting, eliminating glare in media photos.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Guest Flow & Seating Layouts',
        'desc': 'Structured guest seating plans dividing graduates, parents, and VIP protocol zones. Coordinated with floor management to direct registration flows, keeping pathways clear as thousands of visitors transition through the building.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'On-Site Operations & QC',
        'desc': 'EGS project managers and supervisors coordinating carpenters, printers, and technician crews. Operations are scheduled backwards from the fixed showtime, leaving a clear buffer window for client walk-throughs and rehearsals.',
        'images': [operation, adgrad2]
      },
      'Videos': {
        'title': 'Ceremonial Video & Playback',
        'desc': 'Playback reels and custom motion graphic templates loaded on the server. Tested for latency and timing cues to sync with student walkups and announcer callouts.',
        'images': []
      }
    }
  },
  {
    id: 'dubai-2025',
    title: 'HCT Dubai Campus Ceremony 2025',
    year: 2025,
    shortDesc: 'Premium ballroom staging and coordination for Dubai campuses at the Grand Hyatt, accommodating VIP protocol and massive visitor flow.',
    location: 'Grand Hyatt Dubai, UAE',
    image: adgrad1,
    video: hctGraduationVideo,
    stats: '602 Graduates | 2,200 Guests',
    tags: ['Stage', 'Branding', 'Seating'],
    facts: {
      'Venue': 'Grand Hyatt Dubai',
      'Graduates': '602 Students',
      'Guests': '2,200 Audience members',
      'VIP Attendee': 'H.H. Sheikh Mansoor bin Mohammed bin Rashid Al Maktoum',
      'Setup Window': 'Overnight Venue Access',
    },
    scope: [
      'Ballroom stage layout & custom VIP seating structure',
      'High-resolution LED screen backdrop installation',
      'Entrance archways & branded registration counters',
      'Audio arrays and stage lighting configuration',
      'Rehearsal timing checks & cue callouts'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Staging & VIP Backdrop',
        'desc': 'Custom ballroom stage setup with multi-level steps, designed to integrate with Hyatt venue aesthetics. Finished in premium materials with zero visible seams to support royal VIP presence.',
        'images': [adgrad1, shj1]
      },
      'LED & AV': {
        'title': 'LED Screen Backdrop & Lights',
        'desc': 'Staged multi-layered LED screens for immersive dynamic backdrops. Lighting system calibrated for crystal-clear photography of students receiving scrolls.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Ballroom Entrance & Foyer Branding',
        'desc': 'Sleek entryways, step-and-repeat media walls, and registration counters matching the institutional color theme. Large fabric banners hung from ceiling truss points.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Graduates & VIP Seating Layout',
        'desc': 'Strict seating charts managed under protocol specifications. Seat numbers and row indicators designed to direct student alignment during queue-up calls.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Overnight Install Operations',
        'desc': 'Crews mobilizing immediately upon ballroom release to install rigging, lighting, stage carpentry, and prints before the 8:00 AM protocol walkthrough.',
        'images': [operation, adgrad1]
      },
      'Videos': {
        'title': 'Dubai Ceremony Playback',
        'desc': 'Dynamic countdown reels, student name queues, and motion backdrops loaded and run during the ceremony.',
        'images': []
      }
    }
  },
  {
    id: 'sharjah-2025',
    title: 'HCT Sharjah Ceremonies 2025',
    year: 2025,
    shortDesc: 'Double ceremony production at University City Hall, handling complex back-to-back student rotations in a classical venue.',
    location: 'University City Hall, Sharjah',
    image: shj2,
    video: hctGraduationVideo,
    stats: '937 Graduates (2 sessions) | 3,000 Guests',
    tags: ['LED & AV', 'Branding', 'Behind the Scenes'],
    facts: {
      'Venue': 'University City Hall, Sharjah',
      'Graduates': '937 Students (Double Session)',
      'Guests': '3,000 Audience members total',
      'VIP Attendee': 'Sheikh Salem bin Abdulrahman / Sheikh Mohammed bin Humaid',
      'Format': 'Back-to-Back Ceremonies',
    },
    scope: [
      'Scale-matched stage layouts for double ceremonies',
      'Integrated classical lighting and stage spot configs',
      'Main lobby registration setups & visitor flow guides',
      'Custom fabricated backdrop matching auditorium dimensions',
      'On-site operations & crowd control'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Classical Stage Backdrop',
        'desc': 'Designed to complement the classical architectural style of University City Hall, merging wooden finishes with modern structural branding and seamless fabric backdrops.',
        'images': [shj2, adgrad1]
      },
      'LED & AV': {
        'title': 'Broadcast Feeds & Stage Sound',
        'desc': 'Setup of dual side-projectors and central LED walls. Sound arrays adjusted to manage echoes in the high-ceiling dome of the hall.',
        'images': [adgrad2, shj1]
      },
      'Branding': {
        'title': 'Sharjah Campus Branding',
        'desc': 'Exterior entrance flags, large lobby banners, media backdrops, and registration kiosks designed for fast student processing.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Lobby & Auditorium Queue Management',
        'desc': 'Detailed staging lines and queue barriers to coordinate back-to-back sessions: empty one ceremony audience while the second session queues in.',
        'images': [operation, shj2]
      },
      'Behind the Scenes': {
        'title': 'Crew Rotation & Reset',
        'desc': '12-hour build window and mid-day stage reset between sessions to refresh branding, clean surfaces, and replace name placards.',
        'images': [operation, adgrad2]
      },
      'Videos': {
        'title': 'Sharjah Ceremonial Videos',
        'desc': 'Official institution footage, transition graphics, and scroll presenter media loops.',
        'images': []
      }
    }
  },
  {
    id: 'rak-2025',
    title: 'HCT Ras Al Khaimah Ceremony 2025',
    year: 2025,
    shortDesc: 'Campus-wide ceremony setup featuring high-stakes stage carpentry and extensive outdoor lobby branding.',
    location: 'HCT Ras Al Khaimah Campus, UAE',
    image: shj3,
    video: hctGraduationVideo,
    stats: '576 Graduates | 1,800 Guests',
    tags: ['Stage', 'Branding'],
    facts: {
      'Venue': 'Ras Al Khaimah Campus Sports Hall',
      'Graduates': '576 Students',
      'Guests': '1,800 Audience members',
      'VIP Attendee': 'Sheikh Saqr bin Saud bin Saqr Al Qasimi',
      'Production': 'Full Venue Transformation',
    },
    scope: [
      'Sports hall flooring protection & full carpet setup',
      'Modular carpentry staging & VIP protocol stairs',
      'Outdoor entrance arches & registration desks',
      'Sound reinforcement & stage illumination design',
      'Event day operations & schedule calling'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Sports Hall Stage Transformation',
        'desc': 'Transforming a raw sports hall into a premium ceremonial stage. Fitted with structural steps and custom safety railings, and finished in dark velvet fabric overlays.',
        'images': [shj3, shj1]
      },
      'LED & AV': {
        'title': 'Video Integration & Sports Hall Acoustics',
        'desc': 'Overcoming sports hall acoustics with highly localized audio arrays. Standard LED backdrop running campus-specific student lists.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Ras Al Khaimah Outdoor Branding',
        'desc': 'Giant campus entrance arches, exterior wind-resistant banners, and interior partition walls to hide raw building structures.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Flat-Floor Seating Coordination',
        'desc': 'Deploying 1,800 seats on a flat-floor sports court with clear viewing angles and separate channels for VIP arrival lines.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Floor Protection & Install Logistics',
        'desc': 'Laying floor protection tiles across the entire sports court surface before structural staging is built or lighting trusses are erected.',
        'images': [operation, shj3]
      },
      'Videos': {
        'title': 'RAK Ceremony Loop',
        'desc': 'Custom campus video highlights and scroll collection cues.',
        'images': []
      }
    }
  },
  {
    id: 'abudhabi-2025',
    title: 'HCT Abu Dhabi Ceremony 2025',
    year: 2025,
    shortDesc: 'The largest single graduation setup of the season, managing over 1,600 graduates and 5,000 guests in a convention centre environment.',
    location: 'ADNEC, Abu Dhabi',
    image: adgrad2,
    video: hctGraduationVideo,
    stats: '1,668 Graduates | 5,000 Guests',
    tags: ['Stage', 'LED & AV', 'Branding', 'Seating'],
    facts: {
      'Venue': 'ADNEC Halls, Abu Dhabi',
      'Graduates': '1,668 Students',
      'Guests': '5,000 Audience members',
      'VIP Attendee': 'Dr. Ahmad Belhoul Al Falasi, Minister of Education',
      'Scale': '5,000 sqm Exhibition Hall Build',
    },
    scope: [
      'Mega-scale stage layout (40m width setup)',
      'Dual massive side LED screens & center high-def display',
      '5,000-seat layout configuration & floor planning',
      'Lobby registration zones & media backdrops',
      'Technical production coordination'
    ],
    tabsContent: {
      'Stage': {
        'title': '40-Metre Wide Staging',
        'desc': 'Custom wide stage designed for large student cohorts. Built using steel deck understructures and finished in EGS signature woodwork and carpeting.',
        'images': [adgrad2, shj1]
      },
      'LED & AV': {
        'title': 'Mega Video Walls & Line Array Sound',
        'desc': 'Central high-resolution LED screens flanked by secondary projection screens. Line array sound systems suspended from overhead venue trusses to reach 5,000 attendees.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Convention Foyer Branding',
        'desc': 'Branded partition walls, 12-meter tall fabric drops, photo backdrops, and media zones designed for immediate family photos.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': '5,000-Seat Floor Management',
        'desc': 'Planning and deploying 5,000 seats with strict row alignments and protocol zones. Flow pathways designed for fast, safe graduate egress.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Logistics & 48-Hour Build',
        'desc': 'Deploying a team of 45 carpenters, riggers, and installers to construct the entire setup within ADNEC\'s strict 48-hour move-in window.',
        'images': [operation, adgrad2]
      },
      'Videos': {
        'title': 'Abu Dhabi Ceremony Playback',
        'desc': 'Complex multicamera feed switcher integration, slide countdowns, and student name scrolls.',
        'images': []
      }
    }
  },
  {
    id: 'baniyas-2024',
    title: 'HCT Baniyas Ceremony 2024',
    year: 2024,
    shortDesc: 'Complete campus event staging, AV, and visitor flow management for the 2024 graduation program.',
    location: 'HCT Baniyas Campus, Abu Dhabi',
    image: operation,
    video: hctGraduationVideo,
    stats: '450 Graduates | 1,500 Guests',
    tags: ['Stage', 'Branding', 'Behind the Scenes'],
    facts: {
      'Venue': 'Baniyas Campus Auditorium',
      'Graduates': '450 Students',
      'Guests': '1,500 Audience members',
      'VIP Attendee': 'HCT Director General & Campus Leadership',
      'Production': 'Overnight Campus setup',
    },
    scope: [
      'Custom auditorium stage design & build',
      'Lobby registration desks & queue setups',
      'LED screen background & local sound tuning',
      'Campus branding boards & outdoor signages',
      'Event sequence checks & operator control'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Baniyas Auditorium Stage',
        'desc': 'Custom wooden backdrop with structural pillars built on the existing campus auditorium stage, creating a corporate institutional setup.',
        'images': [operation, adgrad1]
      },
      'LED & AV': {
        'title': 'Stage AV Integration',
        'desc': 'Local sound arrays adjusted to fit auditorium acoustics, preventing feedback during announcer speeches. Central screen displaying student reels.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Outdoor Campus Signage',
        'desc': 'Heavy-duty outdoor signage boards and flag setups directing parking traffic and guest arrivals across campus lanes.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Auditorium Seating Coordination',
        'desc': 'Seating charts color-coded by graduation discipline to guide students in order of scroll distribution.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Overnight Venue Handover',
        'desc': 'Fast overnight setup to deliver stage, screens, and branding before rehearsals begin at 9:00 AM.',
        'images': [operation, shj2]
      },
      'Videos': {
        'title': 'Baniyas 2024 Video Reels',
        'desc': 'Campus highlights reel, sponsor presentation playbacks, and scroll distribution cue videos.',
        'images': []
      }
    }
  },
  {
    id: 'sharjah-2024',
    title: 'HCT Sharjah Ceremony 2024',
    year: 2024,
    shortDesc: 'Full ceremony production at Sharjah University City Hall, managing 820 graduates and strict protocol guidelines.',
    location: 'University City Hall, Sharjah',
    image: shj1,
    video: hctGraduationVideo,
    stats: '820 Graduates | 2,500 Guests',
    tags: ['Stage', 'LED & AV', 'Branding'],
    facts: {
      'Venue': 'University City Hall, Sharjah',
      'Graduates': '820 Students',
      'Guests': '2,500 Audience members',
      'VIP Attendee': 'Sharjah Royal Family Representatives',
      'Project': 'Classical Venue Setup',
    },
    scope: [
      'Auditorium stage branding panels',
      'Central LED backdrop wall & sound tuning',
      'Lobby entry arches & registration desks',
      'VIP lounge partition setups & branding',
      'Operational support & stage callouts'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Royal Protocol Staging',
        'desc': 'A classical staging design built to accommodate local royal presence. Velvet carpeting, solid handrails, and clean lines.',
        'images': [shj1, adgrad1]
      },
      'LED & AV': {
        'title': 'Backdrop Display & Spotlights',
        'desc': 'Visual mapping of student credentials on the center LED screen, backed by soft spotlights to match video broadcast requirements.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Foyer Step-and-Repeat Walls',
        'desc': 'Giant institutional logo walls in the lobby foyer for graduation photography and media interviews.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Auditorium Seating Guides',
        'desc': 'Graduate rows marked with color codes to keep students organized as they walk up to the stage.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Rigging & Backdrop Setup',
        'desc': '24-hour setup window starting immediately upon hall release, handled by our dedicated event carpentry team.',
        'images': [operation, shj1]
      },
      'Videos': {
        'title': 'Sharjah 2024 Playback',
        'desc': 'Announcer cues, student lists, and transition audio effects.',
        'images': []
      }
    }
  },
  {
    id: 'dubai-2024',
    title: 'HCT Dubai Ceremony 2024',
    year: 2024,
    shortDesc: 'Overnight ballroom staging and lobby branding at Grand Hyatt Dubai for the 2024 cohort.',
    location: 'Grand Hyatt Dubai, UAE',
    image: adgrad1,
    video: hctGraduationVideo,
    stats: '580 Graduates | 2,000 Guests',
    tags: ['Stage', 'Branding', 'Seating'],
    facts: {
      'Venue': 'Grand Hyatt Dubai',
      'Graduates': '580 Students',
      'Guests': '2,000 Audience members',
      'VIP Attendee': 'Dubai Government Representatives',
      'Setup': 'Overnight Build (12 Hours)',
    },
    scope: [
      'Ballroom stage carpet & carpentry build',
      'Foyer registration desks & queue setups',
      'LED screen background & local sound tuning',
      'Media backdrops & step-and-repeat walls',
      'Rehearsal checks & show call support'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Grand Hyatt Ballroom Stage',
        'desc': 'Custom wooden backdrop with integrated lighting strips, designed to complement the luxury environment of the Hyatt ballroom.',
        'images': [adgrad1, shj1]
      },
      'LED & AV': {
        'title': 'LED Screen & Audio arrays',
        'desc': 'High-resolution LED walls sync\'d with local ballroom sound loops. Balanced to give clear speaker audio across the room.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Foyer Registration branding',
        'desc': 'Clean, branded registration booths and signages welcoming students and VIP guests.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Graduates Seating plans',
        'desc': 'Row planning with row tags and student name slips to ensure correct walking order during scroll delivery.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Rapid Overnight Install',
        'desc': 'Executing the entire build in less than 12 hours between venue release and morning rehearsal.',
        'images': [operation, adgrad1]
      },
      'Videos': {
        'title': 'Dubai 2024 Ceremony Reels',
        'desc': 'Official institution footage, transition graphics, and scroll presenter media loops.',
        'images': []
      }
    }
  },
  {
    id: 'sharjah-2023',
    title: 'HCT Sharjah Ceremony 2023',
    year: 2023,
    shortDesc: 'Staging, branding, and event production at University City Hall for the 2023 graduates.',
    location: 'University City Hall, Sharjah',
    image: shj2,
    video: hctGraduationVideo,
    stats: '780 Graduates | 2,200 Guests',
    tags: ['Stage', 'LED & AV', 'Branding'],
    facts: {
      'Venue': 'University City Hall, Sharjah',
      'Graduates': '780 Students',
      'Guests': '2,200 Audience members',
      'VIP Attendee': 'Sheikh Salem bin Abdulrahman Al Qasimi',
      'Project': 'Annual Ceremony Staging',
    },
    scope: [
      'Auditorium stage wooden backdrop installation',
      'Lobby entry arches & registration desks',
      'LED screen background & local sound tuning',
      'Media backdrops & step-and-repeat walls',
      'On-site event operational support'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Classic Stage Wooden Backdrop',
        'desc': 'Elegant wooden staging panels built on the hall stage, incorporating institutional emblems and decorative lighting columns.',
        'images': [shj2, adgrad1]
      },
      'LED & AV': {
        'title': 'Broadcast Video & sound checks',
        'desc': 'Calibrating the sound arrays to avoid echo under the high dome. Center LED screen running motion graphic loop.',
        'images': [adgrad2, shj1]
      },
      'Branding': {
        'title': 'University Hall Entrance Branding',
        'desc': 'Flag setups on the main entrance stairs, lobby foyer banners, and branded registration desks.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Visitor Flow & Seating plans',
        'desc': 'Lobby queue markers and seat maps separating student cohorts from families.',
        'images': [operation, shj2]
      },
      'Behind the Scenes': {
        'title': 'Stage Rigging & Setup',
        'desc': 'Installation teams running checks on stage carpentry and LED panel setups 24 hours before doors open.',
        'images': [operation, adgrad2]
      },
      'Videos': {
        'title': 'Sharjah 2023 Video Loops',
        'desc': 'Countdown video, campus presentation playback, and announcer cues.',
        'images': []
      }
    }
  },
  {
    id: 'abudhabi-2023',
    title: 'HCT Abu Dhabi Ceremony 2023',
    year: 2023,
    shortDesc: 'Convention center ceremony production at ADNEC Abu Dhabi, managing scale and protocol requirements.',
    location: 'ADNEC, Abu Dhabi',
    image: adgrad2,
    video: hctGraduationVideo,
    stats: '1,400 Graduates | 4,200 Guests',
    tags: ['Stage', 'LED & AV', 'Seating'],
    facts: {
      'Venue': 'ADNEC Halls, Abu Dhabi',
      'Graduates': '1,400 Students',
      'Guests': '4,200 Audience members',
      'VIP Attendee': 'Federal Government Representatives',
      'Scale': '4,000 sqm Exhibition Hall Build',
    },
    scope: [
      'Wide deck staging & protocol ramp build',
      'Lobby entry arches & registration desks',
      'Mega LED video walls & line array sound',
      'VIP protocol seating layout & carpet run',
      'Technical production coordination'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Mega-Scale Staging',
        'desc': 'Wide carpentered stage built to hold multiple student departments simultaneously, complete with ramps for protocol access.',
        'images': [adgrad2, shj1]
      },
      'LED & AV': {
        'title': 'Mega Screen AV Config',
        'desc': 'Line array speakers suspended from ADNEC ceilings. Central and side LED panels displaying student names and live feeds.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'ADNEC Foyer Branding',
        'desc': 'Step-and-repeat media walls and large branded divider partitions in the main convention foyer.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': '4,200 Floor Seating Setup',
        'desc': 'Arranging over 4,000 seats with perfect alignment and clear walkthrough routes for graduates.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Large Team Deployment',
        'desc': 'Coordinating 35 carpenters and installers during the 48-hour build slot in ADNEC.',
        'images': [operation, adgrad2]
      },
      'Videos': {
        'title': 'Abu Dhabi 2023 Ceremony Playback',
        'desc': 'Countdown timers, announcer scripts, and campus background videos.',
        'images': []
      }
    }
  },
  {
    id: 'dubai-2022',
    title: 'HCT Dubai Ceremony 2022',
    year: 2022,
    shortDesc: 'Overnight ballroom ceremony installation at Grand Hyatt Dubai for the 2022 graduation program.',
    location: 'Grand Hyatt Dubai, UAE',
    image: adgrad1,
    video: hctGraduationVideo,
    stats: '520 Graduates | 1,800 Guests',
    tags: ['Stage', 'Branding', 'Behind the Scenes'],
    facts: {
      'Venue': 'Grand Hyatt Dubai',
      'Graduates': '520 Students',
      'Guests': '1,800 Audience members',
      'VIP Attendee': 'Dubai Government Representatives',
      'Setup': 'Overnight Build (12 Hours)',
    },
    scope: [
      'Custom ballroom stage design & build',
      'Lobby registration desks & queue setups',
      'LED screen background & local sound tuning',
      'Media backdrops & step-and-repeat walls',
      'Rehearsal checks & show call support'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Ballroom Stage carpentry',
        'desc': 'Overnight carpentry build for the Hyatt ballroom stage, matching high-stakes government event standards.',
        'images': [adgrad1, shj1]
      },
      'LED & AV': {
        'title': 'Video & Sound Setup',
        'desc': 'Setting up central LED walls and secondary projectors, calibrated to Hyatt ballroom dimensions and lighting.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Hyatt Foyer Branding',
        'desc': 'Branded registration counters and entry arches welcomes attendees at the hotel mezzanine level.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Graduates seating lines',
        'desc': 'Aligning rows and chairs under strict government guidelines to respect student protocols.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Overnight installation crew',
        'desc': 'Riggers, printers, and carpenters working under a strict 12-hour build slot to hand over the room before morning rehearsals.',
        'images': [operation, adgrad1]
      },
      'Videos': {
        'title': 'Dubai 2022 Video Loops',
        'desc': 'Official institution footage, transition graphics, and scroll presenter media loops.',
        'images': []
      }
    }
  },
  {
    id: 'fujairah-2022',
    title: 'HCT Fujairah Ceremony 2022',
    year: 2022,
    shortDesc: 'Staging, branding, and event production at Zayed Sports Complex for the 2022 graduation program.',
    location: 'Zayed Sports Complex, Fujairah',
    image: shj1,
    video: hctGraduationVideo,
    stats: '410 Graduates | 1,500 Guests',
    tags: ['Stage', 'Branding', 'Seating'],
    facts: {
      'Venue': 'Zayed Sports Complex, Fujairah',
      'Graduates': '410 Students',
      'Guests': '1,500 Audience members',
      'VIP Attendee': 'Crown Prince of Fujairah Representative',
      'Project': 'Sports Hall setup',
    },
    scope: [
      'Sports hall flat flooring tiling & carpeting',
      'Carp carpentry staging & VIP protocol stairs',
      'Outdoor entrance arches & registration desks',
      'Sound reinforcement & stage illumination design',
      'Event day operations & schedule calling'
    ],
    tabsContent: {
      'Stage': {
        'title': 'Sports Hall Staging',
        'desc': 'Carpentry staging built from scratch in the Zayed Sports Complex hall, including custom protocol steps for VIP guests.',
        'images': [shj1, adgrad1]
      },
      'LED & AV': {
        'title': 'Sports Hall AV tuning',
        'desc': 'Acoustic tuning to manage sound reflections on flat concrete walls. Central LED backdrop wall showing ceremonial graphic files.',
        'images': [adgrad2, shj2]
      },
      'Branding': {
        'title': 'Sports Complex Exterior branding',
        'desc': 'Heavy-duty fabric arches and campus registration flags to route graduates from the gate to the hall entry.',
        'images': [shj3, operation]
      },
      'Seating': {
        'title': 'Flat-floor seat layouts',
        'desc': 'Row charts marked clearly to handle student alignment and ensure clear pathways for protocol entries.',
        'images': [operation, shj1]
      },
      'Behind the Scenes': {
        'title': 'Floor protection & Build logistics',
        'desc': 'Deploying protective court floor tiles before staging structures are built, preventing venue damages.',
        'images': [operation, shj1]
      },
      'Videos': {
        'title': 'Fujairah 2022 playback loop',
        'desc': 'Countdown visual files, name slide queues, and scroll presenter graphic loops.',
        'images': []
      }
    }
  }
];

export default function GraduationPortfolioPage() {
  const [activeYear, setActiveYear] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('Stage');
  const [activeGalleryImage, setActiveGalleryImage] = useState(null);
  const videoRef = useRef(null);

  // Filter projects based on Year and Search query
  const filteredProjects = useMemo(() => {
    return GRADUATION_PROJECTS.filter((project) => {
      const matchesYear = activeYear === 'All' || String(project.year) === activeYear;
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.stats.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesYear && matchesSearch;
    });
  }, [activeYear, searchQuery]);

  // Page lifecycle title and scroll reveal animations configuration
  const revealSelector = [
    '.content-page .chip',
    '.content-page .hero-copy h1',
    '.content-page .hero-copy .lede',
    '.filter-search-container',
    '.footer-grid > *',
    '.footer-big',
    '.footer-bottom'
  ].join(', ');

  usePageLifecycle('Graduation Portfolio | EGS Ceremony Staging Dubai & UAE', {
    revealSelector,
  });

  // Modal handlers
  const handleOpenModal = (project) => {
    setSelectedProject(project);
    setActiveModalTab('Stage');
    setActiveGalleryImage(null);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setActiveModalTab('Stage');
    setActiveGalleryImage(null);
  };

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Auto-update active gallery image when modal tab changes
  useEffect(() => {
    if (selectedProject && activeModalTab !== 'Videos') {
      const tabData = selectedProject.tabsContent[activeModalTab];
      if (tabData && tabData.images && tabData.images.length > 0) {
        setActiveGalleryImage(tabData.images[0]);
      } else {
        setActiveGalleryImage(selectedProject.image);
      }
    }
  }, [activeModalTab, selectedProject]);

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
                <div className="dossier" data-label="Institutional Track Record">
                  <div className="dossier-row">
                    <span className="k">Total Ceremonies</span>
                    <span className="v">25+ Grand Ceremonies</span>
                  </div>
                  <div className="dossier-row">
                    <span className="k">Graduates Setup</span>
                    <span className="v">12,000+ Students</span>
                  </div>
                  <div className="dossier-row">
                    <span className="k">Ceremony Locations</span>
                    <span className="v">All major UAE Emirates</span>
                  </div>
                  <div className="dossier-row">
                    <span className="k">Key Partner Trust</span>
                    <span className="v">7 consecutive years</span>
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
                {['All', '2025', '2024', '2023', '2022'].map((year) => (
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
                  placeholder="Search ceremony, location, or tag..."
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
                filteredProjects.map((project) => (
                  <article
                    key={project.id}
                    className="portfolio-card"
                    onClick={() => handleOpenModal(project)}
                  >
                    <div className="portfolio-card-media">
                      <img src={project.image} alt={project.title} loading="lazy" />
                      <span className="card-year-badge">{project.year}</span>
                    </div>

                    <div className="portfolio-card-body">
                      <h3>{project.title}</h3>
                      <div className="portfolio-card-location">
                        📍 <span>{project.location}</span>
                      </div>
                      <p className="portfolio-card-desc">{project.shortDesc}</p>
                      
                      <div className="portfolio-card-stats">
                        📊 <span>{project.stats}</span>
                      </div>

                      <div className="portfolio-card-tags">
                        {project.tags.map((tag) => (
                          <span key={tag} className="card-service-tag">{tag}</span>
                        ))}
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
        {selectedProject && (
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
                  <h2>{selectedProject.title}</h2>
                  <div className="modal-header-meta">
                    <span className="modal-location-badge">📍 {selectedProject.location}</span>
                    <span className="modal-year-badge">{selectedProject.year}</span>
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
                
                {/* Left Column: Visual Showcase & Tabs */}
                <div className="modal-showcase-column">
                  <div className="modal-media-viewport">
                    {activeModalTab === 'Videos' ? (
                      <video
                        ref={videoRef}
                        src={selectedProject.video}
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={activeGalleryImage || selectedProject.image}
                        alt={`${selectedProject.title} category visual`}
                      />
                    )}
                  </div>

                  {/* Category Tabs */}
                  <div className="modal-category-tabs">
                    {['Stage', 'LED & AV', 'Branding', 'Seating', 'Behind the Scenes', 'Videos'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`category-tab-btn ${activeModalTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveModalTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab Details */}
                  <div className="modal-tab-content-panel">
                    {activeModalTab === 'Videos' ? (
                      <div>
                        <h4>Ceremony Highlights Reel</h4>
                        <p>Watch EGS's official ceremony video highlights showcasing stage execution, crowd dynamics, VIP seating, and live LED media backdrop transitions in real-time.</p>
                      </div>
                    ) : (
                      selectedProject.tabsContent[activeModalTab] && (
                        <div>
                          <h4>{selectedProject.tabsContent[activeModalTab].title}</h4>
                          <p>{selectedProject.tabsContent[activeModalTab].desc}</p>
                          
                          {/* Mini Gallery Grid */}
                          {selectedProject.tabsContent[activeModalTab].images && 
                           selectedProject.tabsContent[activeModalTab].images.length > 0 && (
                            <div className="modal-tab-gallery-grid">
                              {selectedProject.tabsContent[activeModalTab].images.map((img, index) => (
                                <div
                                  key={index}
                                  className={`modal-tab-gallery-item ${activeGalleryImage === img ? 'active' : ''}`}
                                  onClick={() => setActiveGalleryImage(img)}
                                >
                                  <img src={img} alt={`Gallery item ${index + 1}`} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Right Column: Facts Dossier & Scope of Work */}
                <div className="modal-facts-column">
                  
                  {/* Quick Facts */}
                  <div>
                    <span className="facts-section-title">Quick Facts</span>
                    <div className="dossier" data-label="Ceremony Profile">
                      {Object.entries(selectedProject.facts).map(([key, val]) => (
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
                      {selectedProject.scope.map((item, index) => (
                        <div key={index} className="modal-scope-item">
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
