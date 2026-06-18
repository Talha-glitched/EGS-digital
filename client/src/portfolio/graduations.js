import { buildClient, mediaTypeForFilename } from './media.js';

const graduationAssets = import.meta.glob('../assets/Graduation/Websites Gallery Graduations/**/*', {
  eager: true,
  import: 'default',
});

const CAMPUS_META = {
  'abu-dhabi': { name: 'HCT Abu Dhabi', location: 'ADNEC, Abu Dhabi' },
  dubai: { name: 'HCT Dubai', locationByYear: { 2025: 'Grand Hyatt Dubai', 2024: 'Coca-Cola Arena, Dubai' } },
  fujairah: { name: 'HCT Fujairah', locationByYear: { 2025: 'Zayed Sports Complex, Fujairah', 2024: 'Fujairah, UAE' } },
  'ras-al-khaimah': { name: 'HCT Ras Al Khaimah', location: 'HCT RAK Campus, Ras Al Khaimah' },
  sharjah: { name: 'HCT Sharjah', location: 'University City Hall, Sharjah' },
  'rak-aa': { name: 'RAK American Academy', location: 'Ras Al Khaimah' },
  'hct-graduation': { name: 'HCT Graduation Ceremonies', location: 'Dubai ExpoCity Exhibition Center' },
};

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
  'hct-graduation|2021': { venue: 'Dubai ExpoCity Exhibition Center', graduates: 'N/A', guests: 'N/A' },
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

export function buildGradClients() {
  const gradGroups = {};
  const prefix = '../assets/Graduation/Websites Gallery Graduations/';

  Object.entries(graduationAssets).forEach(([path, url]) => {
    if (path.includes('.DS_Store')) return;

    const rel = path.substring(path.indexOf(prefix) + prefix.length);
    const parts = rel.split('/');
    const filename = parts[parts.length - 1];
    const mediaType = mediaTypeForFilename(filename);
    if (!mediaType) return;

    let year;
    let campus;
    if (rel.startsWith('2021 Videos')) {
      year = 2021;
      campus = 'hct-graduation';
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
    gradGroups[key].push({ type: mediaType, url, name: filename, year });
  });

  return Object.entries(gradGroups)
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
        facts: GRAD_FACTS[key],
      });
    })
    .sort((a, b) => a.name.localeCompare(b.name) || b.year - a.year);
}
