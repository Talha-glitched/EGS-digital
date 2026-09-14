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
              A Dubai Design &amp; production house for exhibition stands, ceremonies, retail branding, signage, and branded interiors.
            </p>
          </div>
          <div>
            <h4>Pages</h4>
            <ul>
              <li><a href="/exhibitions">Exhibitions</a></li>
              <li><a href="/venues/dwtc-exhibition-stand-builder">Venues (DWTC &amp; ADNEC)</a></li>
              <li><a href="/events">Events &amp; Graduations</a></li>
              <li><a href="/retail">Retail Rollouts</a></li>
              <li><a href="/fitouts">Fitouts &amp; Signage</a></li>
              <li><a href="/blog">Blog &amp; Guides</a></li>
            </ul>
          </div>
          <div>
            <h4>Proof</h4>
            <ul>
              <li><a href="/case-studies/hct-nationwide-graduation-ceremonies">HCT Convocation</a></li>
              <li><a href="/case-studies/sadia-33-store-overnight-carrefour-rollout">Sadia 33 Stores</a></li>
              <li><a href="/case-studies/philips-global-health-riyadh-healthcare-booth">Philips Riyadh</a></li>
              <li><a href="/case-studies/kazakhstan-pavilion-gulfood">Kazakhstan Pavilion</a></li>
              <li><a href="/case-studies">All Case Studies</a></li>
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
          <span>UAE Design &amp; production house</span>
        </div>
      </div>
    </footer>
  );
}
