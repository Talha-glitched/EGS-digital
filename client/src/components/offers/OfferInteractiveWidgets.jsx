import { useState } from 'react';
import { useInquiryModal } from '../../context/InquiryModalContext.jsx';

/**
 * Offer 01: Interactive 10-Point Buildability Risk Scanner
 */
export function AuditRadarWidget() {
  const { openInquiry } = useInquiryModal();
  const [checkedItems, setCheckedItems] = useState([0, 1, 3]);

  const checklist = [
    { title: 'Structural & Ceiling Hang Points', desc: 'Overhead truss load limits & venue rigging permits' },
    { title: 'Material Durability & Reflections', desc: 'High-gloss floor scratch resistance under 10k+ steps' },
    { title: 'Aisle Sightlines & Logo Heights', desc: 'Visibility from 30m down main trade show hall concourse' },
    { title: 'Hidden Storage & AV Access', desc: 'Secure luggage, spare collateral, and breaker box ventilation' },
    { title: '48-Hour Installation Window', desc: 'Modular pre-fabrication vs slow on-site millwork joinery' },
  ];

  const toggleCheck = (idx) => {
    setCheckedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const riskScore = Math.max(10, 100 - checkedItems.length * 18);

  return (
    <div className="offer-widget-card">
      <div className="offer-widget-head">
        <div className="widget-chip">Live Interactive Simulator</div>
        <h4>Pre-Fabrication Risk Assessment</h4>
        <p>Select the areas you have already verified with UAE venue engineers:</p>
      </div>

      <div className="audit-checklist-grid">
        {checklist.map((item, idx) => {
          const isChecked = checkedItems.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              className={`audit-check-item ${isChecked ? 'active' : ''}`}
              onClick={() => toggleCheck(idx)}
            >
              <div className="checkbox-box">{isChecked ? '✓' : ''}</div>
              <div className="check-copy">
                <span className="check-title">{item.title}</span>
                <span className="check-sub">{item.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="audit-score-bar">
        <div className="score-label">
          <span>Unmitigated On-Site Risk Level:</span>
          <strong>{riskScore}% {riskScore > 50 ? '(High Risk of Costly On-Site Fixes)' : '(Manageable)'}</strong>
        </div>
        <div className="score-track">
          <div
            className="score-fill"
            style={{
              width: `${riskScore}%`,
              background: riskScore > 50 ? 'var(--ochre)' : 'var(--olive)',
            }}
          />
        </div>
      </div>

      <div className="widget-cta-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openInquiry('exhibitions')}
        >
          Request AED 500 Stand Audit
          <span className="arrow">→</span>
        </button>
        <span className="widget-footnote">100% credited against fabrication if built with EGS.</span>
      </div>
    </div>
  );
}

/**
 * Offer 02: Interactive Experience Flow Simulator
 */
export function InteractiveGameSimulator() {
  const { openInquiry } = useInquiryModal();
  const [activeTab, setActiveTab] = useState('quiz');

  const modes = {
    quiz: {
      title: '60-Second Touchscreen Industry Quiz',
      step1: 'Attract: Eye-catching countdown timer & leaderboard at stand perimeter',
      step2: 'Engage: 3 quick questions testing visitor industry knowledge',
      step3: 'Educate: Reveal product solution on final answer screen',
      step4: 'Reward: Digital voucher unlocked upon business email entry',
      stat: '4.2x higher qualified lead capture vs passive brochure trays',
    },
    spin: {
      title: 'Digital Prize Spin Wheel (Registration-Gated)',
      step1: 'Attract: High-brightness LED wheel animation with audio cues',
      step2: 'Engage: Visitor scans badge or types details to trigger 1 spin',
      step3: 'Educate: Prize tiers mapped to conversation depth with sales rep',
      step4: 'Reward: Premium giveaways only given to validated prospects',
      stat: '100% elimination of wasted freebies to casual passersby',
    },
    discovery: {
      title: 'Interactive 3-Step Solution Matcher',
      step1: 'Attract: "What is your biggest operational bottleneck?" prompt',
      step2: 'Engage: Visitor selects industry & challenge on 43" kiosk',
      step3: 'Educate: System highlights the exact matching service module',
      step4: 'Reward: Instant PDF specification dispatched to their WhatsApp/email',
      stat: 'Reps start dialogues with pre-qualified customer intent',
    },
  };

  const current = modes[activeTab];

  return (
    <div className="offer-widget-card">
      <div className="offer-widget-head">
        <div className="widget-chip">Experience Engine</div>
        <h4>ATTRACT → ENGAGE → EDUCATE → REWARD</h4>
        <p>Preview how interactive activations turn idle aisle traffic into engaged brand dialogues:</p>
      </div>

      <div className="widget-tabs">
        <button
          type="button"
          className={`widget-tab ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          Touchscreen Quiz
        </button>
        <button
          type="button"
          className={`widget-tab ${activeTab === 'spin' ? 'active' : ''}`}
          onClick={() => setActiveTab('spin')}
        >
          Smarter Spin Wheel
        </button>
        <button
          type="button"
          className={`widget-tab ${activeTab === 'discovery' ? 'active' : ''}`}
          onClick={() => setActiveTab('discovery')}
        >
          60s Solution Finder
        </button>
      </div>

      <div className="experience-flow-box">
        <h5>{current.title}</h5>
        <div className="flow-steps-grid">
          <div className="flow-step-box">
            <span className="step-num">01</span>
            <span className="step-tag">Attract</span>
            <p>{current.step1.split(': ')[1]}</p>
          </div>
          <div className="flow-step-box">
            <span className="step-num">02</span>
            <span className="step-tag">Engage</span>
            <p>{current.step2.split(': ')[1]}</p>
          </div>
          <div className="flow-step-box">
            <span className="step-num">03</span>
            <span className="step-tag">Educate</span>
            <p>{current.step3.split(': ')[1]}</p>
          </div>
          <div className="flow-step-box">
            <span className="step-num">04</span>
            <span className="step-tag">Reward</span>
            <p>{current.step4.split(': ')[1]}</p>
          </div>
        </div>
        <div className="flow-stat-chip">
          <strong>Outcome:</strong> {current.stat}
        </div>
      </div>

      <div className="widget-cta-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openInquiry('exhibitions')}
        >
          Add Interactive Game to Stand
          <span className="arrow">→</span>
        </button>
        <span className="widget-footnote">Packages typically from AED 3,500 – AED 7,500.</span>
      </div>
    </div>
  );
}

/**
 * Offer 03: Live Visitor Analytics Dashboard Mockup
 */
export function AnalyticsDashboardWidget() {
  const { openInquiry } = useInquiryModal();
  const [selectedDay, setSelectedDay] = useState('all');

  const data = {
    all: {
      registered: '648',
      hotLeads: '184',
      avgDwellTime: '6.4 mins',
      topProduct: 'Enterprise Infrastructure (42%)',
      peakHour: '1:00 PM – 3:30 PM',
      giveawaysIssued: '320 (100% verified)',
    },
    day1: {
      registered: '192',
      hotLeads: '51',
      avgDwellTime: '5.8 mins',
      topProduct: 'Cloud Solutions (38%)',
      peakHour: '2:00 PM – 4:00 PM',
      giveawaysIssued: '94 (100% verified)',
    },
    day2: {
      registered: '286',
      hotLeads: '92',
      avgDwellTime: '7.1 mins',
      topProduct: 'Enterprise Infrastructure (46%)',
      peakHour: '11:30 AM – 2:30 PM',
      giveawaysIssued: '148 (100% verified)',
    },
    day3: {
      registered: '170',
      hotLeads: '41',
      avgDwellTime: '6.0 mins',
      topProduct: 'Managed Security (35%)',
      peakHour: '1:00 PM – 3:00 PM',
      giveawaysIssued: '78 (100% verified)',
    },
  };

  const curr = data[selectedDay];

  return (
    <div className="offer-widget-card">
      <div className="offer-widget-head">
        <div className="widget-chip">Management Dashboard Preview</div>
        <h4>Real-Time Stand ROI & Lead Metrics</h4>
        <p>Toggle exhibition days to simulate post-show visitor intelligence:</p>
      </div>

      <div className="widget-tabs">
        {['all', 'day1', 'day2', 'day3'].map((day) => (
          <button
            key={day}
            type="button"
            className={`widget-tab ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day === 'all' ? 'Entire Show (3 Days)' : `Day ${day.replace('day', '')}`}
          </button>
        ))}
      </div>

      <div className="analytics-metrics-grid">
        <div className="metric-box highlight">
          <span className="metric-k">Verified Registrations</span>
          <span className="metric-v">{curr.registered}</span>
          <span className="metric-sub">Digital badge scans & forms</span>
        </div>
        <div className="metric-box highlight">
          <span className="metric-k">Sales-Ready Hot Leads</span>
          <span className="metric-v">{curr.hotLeads}</span>
          <span className="metric-sub">Tagged by booth reps</span>
        </div>
        <div className="metric-box">
          <span className="metric-k">Avg Dwell Time</span>
          <span className="metric-v">{curr.avgDwellTime}</span>
          <span className="metric-sub">On-stand engagement</span>
        </div>
        <div className="metric-box">
          <span className="metric-k">Top Solution Interest</span>
          <span className="metric-v" style={{ fontSize: '15px' }}>{curr.topProduct}</span>
          <span className="metric-sub">From interactive selections</span>
        </div>
        <div className="metric-box">
          <span className="metric-k">Peak Traffic Window</span>
          <span className="metric-v" style={{ fontSize: '16px' }}>{curr.peakHour}</span>
          <span className="metric-sub">Staffing optimization</span>
        </div>
        <div className="metric-box">
          <span className="metric-k">Tracked Giveaways</span>
          <span className="metric-v">{curr.giveawaysIssued}</span>
          <span className="metric-sub">Zero untracked wastage</span>
        </div>
      </div>

      <div className="widget-cta-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openInquiry('exhibitions')}
        >
          Setup Visitor Analytics For Stand
          <span className="arrow">→</span>
        </button>
        <span className="widget-footnote">Includes tablet hardware, offline sync & CRM exports.</span>
      </div>
    </div>
  );
}

/**
 * Offer 04: Value Engineering Budget Recovery Calculator
 */
export function ValueEngineeringCalculator() {
  const { openInquiry } = useInquiryModal();
  const [approvedQuote, setApprovedQuote] = useState(180000);
  const [targetBudget, setTargetBudget] = useState(140000);

  const budgetGap = Math.max(0, approvedQuote - targetBudget);
  const recoveryPercent = approvedQuote > 0 ? Math.round((budgetGap / approvedQuote) * 100) : 0;

  return (
    <div className="offer-widget-card">
      <div className="offer-widget-head">
        <div className="widget-chip">Cost Recovery Simulator</div>
        <h4>Value Engineering Without Value Destruction</h4>
        <p>Adjust your current quote and target budget to see how we bridge the gap:</p>
      </div>

      <div className="slider-group-box">
        <div className="slider-item">
          <div className="slider-label-row">
            <span>Approved Design Quotation:</span>
            <strong>AED {Number(approvedQuote).toLocaleString()}</strong>
          </div>
          <input
            type="range"
            min="60000"
            max="400000"
            step="5000"
            value={approvedQuote}
            onChange={(e) => setApprovedQuote(Number(e.target.value))}
            className="budget-slider"
          />
        </div>

        <div className="slider-item">
          <div className="slider-label-row">
            <span>Available Management Budget:</span>
            <strong>AED {Number(targetBudget).toLocaleString()}</strong>
          </div>
          <input
            type="range"
            min="40000"
            max={approvedQuote}
            step="5000"
            value={Math.min(targetBudget, approvedQuote)}
            onChange={(e) => setTargetBudget(Number(e.target.value))}
            className="budget-slider"
          />
        </div>
      </div>

      <div className="budget-gap-result">
        <div className="gap-stat">
          <span className="gap-k">Target Cost Recovery Needed:</span>
          <span className="gap-v">AED {budgetGap.toLocaleString()} ({recoveryPercent}%)</span>
        </div>
        <div className="levers-summary">
          <span className="levers-title">How EGS production engineers bridge this gap:</span>
          <div className="levers-chips">
            <span className="lever-pill">✓ Structural joinery pre-assembly</span>
            <span className="lever-pill">✓ Backlit fabric graphic conversion</span>
            <span className="lever-pill">✓ Venue rigging height optimization</span>
            <span className="lever-pill">✓ Rented certified LED video walls</span>
            <span className="lever-pill safeguard">★ Main branding & reception 100% protected</span>
          </div>
        </div>
      </div>

      <div className="widget-cta-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openInquiry('exhibitions')}
        >
          Send Design & Target Budget for Review
          <span className="arrow">→</span>
        </button>
        <span className="widget-footnote">Send your 3D render + existing quote for a line-item review.</span>
      </div>
    </div>
  );
}

/**
 * Offer 05: UAE Partner & White-Label Blueprint
 */
export function UaePartnerBlueprintWidget() {
  const { openInquiry } = useInquiryModal();
  const [selectedVenue, setSelectedVenue] = useState('dwtc');

  const venues = {
    dwtc: {
      name: 'Dubai World Trade Centre (DWTC)',
      buildup: 'Strict 48-72h access windows',
      permits: 'Civil defense fire-retardant certification & structural engineering stamps required',
      perk: 'EGS local Al Qusais fabrication workshop is 15 minutes from DWTC gates.',
    },
    adnec: {
      name: 'ADNEC Abu Dhabi',
      buildup: 'Security badging & heavy vehicle gate passes',
      permits: 'ADNEC contractor compliance & floor load distribution calculations',
      perk: 'Full UAE logistics fleet for direct Abu Dhabi highway transit and standby crew.',
    },
    dec: {
      name: 'Dubai Exhibition Centre (DEC / Expo City)',
      buildup: 'Specific height restrictions and electrical connection protocols',
      permits: 'DEC operations review & sustainable material compliance',
      perk: 'Extensive Expo City pavilion build and teardown experience.',
    },
  };

  const currentVenue = venues[selectedVenue];

  return (
    <div className="offer-widget-card">
      <div className="offer-widget-head">
        <div className="widget-chip">White-Label UAE Execution</div>
        <h4>Designed Anywhere. Delivered Flawlessly in the UAE.</h4>
        <p>Select your exhibition venue to see local execution protocols:</p>
      </div>

      <div className="widget-tabs">
        <button
          type="button"
          className={`widget-tab ${selectedVenue === 'dwtc' ? 'active' : ''}`}
          onClick={() => setSelectedVenue('dwtc')}
        >
          DWTC Dubai
        </button>
        <button
          type="button"
          className={`widget-tab ${selectedVenue === 'adnec' ? 'active' : ''}`}
          onClick={() => setSelectedVenue('adnec')}
        >
          ADNEC Abu Dhabi
        </button>
        <button
          type="button"
          className={`widget-tab ${selectedVenue === 'dec' ? 'active' : ''}`}
          onClick={() => setSelectedVenue('dec')}
        >
          Expo City / DEC
        </button>
      </div>

      <div className="venue-protocol-box">
        <h5>{currentVenue.name} Execution Blueprint</h5>
        <div className="protocol-items">
          <div className="protocol-item">
            <strong>Access & Buildup:</strong>
            <span>{currentVenue.buildup}</span>
          </div>
          <div className="protocol-item">
            <strong>Permits & Approvals:</strong>
            <span>{currentVenue.permits}</span>
          </div>
          <div className="protocol-item highlight">
            <strong>EGS Advantage:</strong>
            <span>{currentVenue.perk}</span>
          </div>
        </div>
      </div>

      <div className="pre-arrival-banner">
        <strong>Pre-Arrival Assurance:</strong> High-definition video & snagging photos sent to your overseas agency before your flight lands in the UAE.
      </div>

      <div className="widget-cta-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openInquiry('exhibitions')}
        >
          Discuss Your UAE Stand Production
          <span className="arrow">→</span>
        </button>
        <span className="widget-footnote">White-label NDA agreements available for overseas agencies.</span>
      </div>
    </div>
  );
}

/**
 * Offer 06: Exhibition Rescue Hotline WhatsApp Dispatcher
 */
export function RescueHotlineWidget() {
  const [selectedItems, setSelectedItems] = useState(['Urgent Printing (Brochures / Cards)']);
  const [customDetail, setCustomDetail] = useState('');

  const emergencyCategories = [
    'Urgent Printing (Brochures / Cards)',
    'Last-Minute Replacement Graphics',
    'Additional LED Screen / TV Display',
    'Extra Barstools / Tables / Chairs',
    'Product Display Plinth / Acrylic Stand',
    'HDMI Cable / Adapter / Electronics',
  ];

  const toggleItem = (item) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const whatsappMessage = encodeURIComponent(
    `URGENT EXHIBITION RESCUE:\nItems needed: ${selectedItems.join(', ')}${
      customDetail ? `\nDetails: ${customDetail}` : ''
    }\nPlease confirm fastest availability and delivery to venue.`
  );

  const directLink = `https://wa.me/971524587992?text=${whatsappMessage}`;

  return (
    <div className="offer-widget-card rescue-widget">
      <div className="offer-widget-head">
        <div className="widget-chip urgent">24/7 Rapid Response Dispatch</div>
        <h4>Forgot Something? Call One Number.</h4>
        <p>Select what you need right now to generate an instant emergency dispatch message:</p>
      </div>

      <div className="rescue-chips-grid">
        {emergencyCategories.map((item) => {
          const isSelected = selectedItems.includes(item);
          return (
            <button
              key={item}
              type="button"
              className={`rescue-pill ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleItem(item)}
            >
              {isSelected ? '✓ ' : '+ '}
              {item}
            </button>
          );
        })}
      </div>

      <div className="custom-input-wrap">
        <input
          type="text"
          placeholder="Add specific detail (e.g. Hall 4, Stand B22, Need 500 brochures by 9am tomorrow)..."
          value={customDetail}
          onChange={(e) => setCustomDetail(e.target.value)}
          className="rescue-input"
        />
      </div>

      <div className="widget-cta-row">
        <a
          href={directLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary rescue-cta-btn"
        >
          <span className="wa-icon">💬</span>
          Dispatch Urgent Request via WhatsApp (+971 52 458 7992)
          <span className="arrow">→</span>
        </a>
        <span className="widget-footnote">Fastest practical solution sourced, produced, or rented immediately.</span>
      </div>
    </div>
  );
}
