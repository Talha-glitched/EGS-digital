import egsFooterLogo from '../assets/logo/EGS Logo.svg';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a href="/" className="footer-logo-link" aria-label="Exhibit Graphic Sign home">
              <img src={egsFooterLogo} alt="" className="footer-logo" width={160} height={160} />
            </a>
            <p className="footer-tagline">
              A Dubai Design & production house for exhibition stands, ceremonies, retail branding, signage, and branded interiors.
            </p>
          </div>
          <div>
            <h4>Pages</h4>
            <ul>
              <li><a href="/exhibitions">Exhibitions</a></li>
              <li><a href="/events">Events</a></li>
              <li><a href="/retail">Retail</a></li>
              <li><a href="/fitouts">Fitouts</a></li>
            </ul>
          </div>
          <div>
            <h4>Proof</h4>
            <ul>
              <li><a href="/case-studies#hct-graduation-program">HCT program</a></li>
              <li><a href="/case-studies#sadia-carrefour-rollout">Sadia rollout</a></li>
              <li><a href="/case-studies#philips-global-health-riyadh">Philips Riyadh</a></li>
              <li><a href="/case-studies#kazakhstan-pavilion-gulfood">Kazakhstan Pavilion</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:info@exhibitgraphicsign.com">info@exhibitgraphicsign.com</a></li>
              <li>+971 4 238 3278</li>
              <li>+971 52 458 7992</li>
              <li>Al Qusais, Dubai</li>
            </ul>
          </div>
        </div>
        <div className="footer-big"><em>Built for</em> fixed deadlines.</div>
        <div className="footer-bottom">
          <span>© 2026 Exhibit Graphic Sign - Est. 2010</span>
          <span>UAE Design & production house</span>
        </div>
      </div>
    </footer>
  );
}
