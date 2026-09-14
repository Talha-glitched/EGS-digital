import { useParams, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import standardStyles from '../styles/pages/standard-content.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { FAQSection, Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { getCaseStudyBySlug, CASE_STUDIES, CASE_STUDY_FAQS } from '../data/caseStudiesData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

function CaseImageGallery({ imagesList, captions = [], title }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!imagesList || imagesList.length === 0) return null;

  if (imagesList.length === 1) {
    return (
      <figure style={{ margin: '32px 0' }}>
        <img
          src={imagesList[0]}
          alt={captions[0] || title}
          style={{ width: '100%', height: 'auto', borderRadius: '8px', objectFit: 'cover', maxHeight: '540px', border: '1px solid var(--rule)' }}
        />
        {captions[0] ? (
          <figcaption style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '8px', textAlign: 'center' }}>
            {captions[0]}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <div style={{ margin: '32px 0' }}>
      <figure style={{ margin: 0 }}>
        <img
          src={imagesList[activeIdx]}
          alt={captions[activeIdx] || `${title} view ${activeIdx + 1}`}
          style={{ width: '100%', height: 'auto', borderRadius: '8px', objectFit: 'cover', maxHeight: '540px', border: '1px solid var(--rule)' }}
        />
        <figcaption style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '8px', textAlign: 'center' }}>
          {captions[activeIdx] || `${title} (Photo ${activeIdx + 1} of ${imagesList.length})`}
        </figcaption>
      </figure>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
        {imagesList.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={`btn-editorial-ghost btn-editorial-pill ${activeIdx === idx ? 'is-active' : ''}`}
            style={{ fontSize: '12px', padding: '5px 14px' }}
          >
            Photo {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CaseStudyDetailPage() {
  const { slug } = useParams();
  const item = getCaseStudyBySlug(slug);

  if (!item) {
    return <Navigate to="/case-studies" replace />;
  }

  usePageLifecycle(`${item.title} | EGS Production Proof`, {
    revealSelector: '.case-detail-page .reveal',
    description: `${item.situation} Delivered by Exhibit Graphic Sign (EGS). ${item.result}`,
    ogImage: item.image,
    ogType: 'article',
    structuredData: buildPageSchemaBundle({
      service: {
        name: item.title,
        description: `${item.situation} ${item.result}`,
        url: `/case-studies/${item.slug}`,
      },
      faqs: CASE_STUDY_FAQS,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Case Studies', url: '/case-studies' },
        { name: item.title, url: `/case-studies/${item.slug}` },
      ],
    }),
  });

  const otherCases = CASE_STUDIES.filter((c) => c.slug !== item.slug).slice(0, 3);

  return (
    <>
      <style>{standardStyles}</style>
      <div className="standard-content-page case-detail-page">
        <Navbar active="proof" />

        {/* Editorial Header */}
        <header className="editorial-hero">
          <div className="editorial-hero-inner">
            <nav className="editorial-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/case-studies">Production Proof</Link>
              <span>/</span>
              <span>{item.title}</span>
            </nav>

            <div className="editorial-badge-row">
              <span className="editorial-badge">{item.tag}</span>
              <span className="editorial-meta-info">{item.year}</span>
              <span className="editorial-meta-info">• {item.location}</span>
            </div>

            <h1 className="editorial-title">{item.title}</h1>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', margin: '20px 0' }}>
              <div style={{ background: '#FFFFFF', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Key Metric</span>
                <strong style={{ fontSize: '20px', color: 'var(--ink)' }}>{item.stat}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                <span style={{ fontSize: '11px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Client Partner</span>
                <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{item.client}</strong>
              </div>
            </div>

            <div className="editorial-actions">
              <InquiryCtaButton inquiryType={item.inquiryType} className="btn-editorial-primary">
                {item.ctaLabel} →
              </InquiryCtaButton>
              <Link to={item.serviceLink} className="btn-editorial-ghost">
                {item.serviceLinkLabel}
              </Link>
            </div>
          </div>
        </header>

        {/* Narrative & Visual Proof */}
        <main className="editorial-body-section">
          <div className="editorial-article-container" style={{ maxWidth: '860px' }}>
            {/* Gallery */}
            <CaseImageGallery imagesList={item.imagesList} captions={item.captions} title={item.title} />

            {/* Structured Breakdown Cards */}
            <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <article style={{ background: '#FFFFFF', padding: '24px 28px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                <span style={{ color: 'var(--ochre)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  01 / Context &amp; Scope
                </span>
                <h3 style={{ margin: '6px 0 10px', fontSize: '20px', color: 'var(--ink)' }}>The Situation</h3>
                <p style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)', margin: 0 }}>{item.situation}</p>
              </article>

              <article style={{ background: '#FFFFFF', padding: '24px 28px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                <span style={{ color: 'var(--ochre)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  02 / Operational Pressure
                </span>
                <h3 style={{ margin: '6px 0 10px', fontSize: '20px', color: 'var(--ink)' }}>Real-World Constraints</h3>
                <p style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)', margin: 0 }}>{item.pressure}</p>
              </article>

              <article style={{ background: '#FFFFFF', padding: '24px 28px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                <span style={{ color: 'var(--ochre)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  03 / Physical Execution
                </span>
                <h3 style={{ margin: '6px 0 10px', fontSize: '20px', color: 'var(--ink)' }}>What EGS Delivered</h3>
                <p style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)', margin: 0 }}>{item.did}</p>
              </article>

              <article style={{ background: '#FFFFFF', padding: '24px 28px', borderRadius: '8px', border: '1px solid var(--rule)', borderLeft: '5px solid var(--ochre)' }}>
                <span style={{ color: 'var(--ochre)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  04 / Verified Outcome
                </span>
                <h3 style={{ margin: '6px 0 10px', fontSize: '20px', color: 'var(--ink)' }}>The Result</h3>
                <p style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)', margin: 0 }}>{item.result}</p>
              </article>
            </div>

            {/* Strategic Capabilities Proven */}
            <div style={{ marginTop: '32px', padding: '24px 28px', background: 'var(--paper-2)', borderRadius: '8px', border: '1px solid var(--rule-soft)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--ink)' }}>What This Project Proves About EGS:</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {item.proves.map((p) => (
                  <span
                    key={p}
                    style={{
                      padding: '5px 14px',
                      background: '#FFFFFF',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      border: '1px solid var(--rule)',
                    }}
                  >
                    ✓ {p}
                  </span>
                ))}
              </div>
              <p style={{ margin: '14px 0 0', fontStyle: 'italic', fontSize: '15px', color: 'var(--ink-soft)' }}>
                &ldquo;{item.takeaway}&rdquo;
              </p>
            </div>

            {/* Related Service Cross-Link */}
            <aside className="editorial-service-card" style={{ marginTop: '32px' }}>
              <div className="editorial-service-card-text">
                <h4>Explore Related Capabilities</h4>
                <p>
                  See how EGS applies this production discipline to commercial exhibitions, ceremonies, and retail rollouts.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link to={item.serviceLink} className="btn-editorial-primary">
                  {item.serviceLinkLabel} →
                </Link>
                {item.venueLink ? (
                  <Link to={item.venueLink} className="btn-editorial-ghost">
                    {item.venueLinkLabel}
                  </Link>
                ) : null}
              </div>
            </aside>
          </div>
        </main>

        {/* Related Case Studies */}
        <section className="editorial-section-light">
          <div className="editorial-article-container" style={{ maxWidth: '1100px' }}>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--ochre)' }}>
                Case Studies
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: 'var(--ink)', margin: '6px 0 0' }}>
                More Verified Production Proof
              </h2>
            </div>
            <div className="editorial-cards-grid">
              {otherCases.map((other) => (
                <article className="editorial-card" key={other.slug}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {other.tag}
                    </span>
                    <h3>
                      <Link to={`/case-studies/${other.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {other.title}
                      </Link>
                    </h3>
                    <p>{other.situation.slice(0, 130)}…</p>
                  </div>
                  <div style={{ paddingTop: '14px', borderTop: '1px solid var(--rule-soft)' }}>
                    <Link to={`/case-studies/${other.slug}`} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      View Case Study →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section style={{ background: 'var(--paper)', borderTop: '1px solid var(--rule-soft)', padding: 'clamp(40px, 6vw, 68px) 24px' }}>
          <div className="editorial-article-container" style={{ maxWidth: '860px' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--ochre)' }}>FAQ</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0 0' }}>
                Frequently Asked Questions — Production Proof
              </h2>
            </div>
            <FAQSection faqs={CASE_STUDY_FAQS} />
          </div>
        </section>

        {/* Consultation CTA */}
        <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--rule-soft)', padding: 'clamp(48px, 6vw, 80px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: 'var(--ink)', marginBottom: '12px' }}>
              Have a Fixed-Deadline Physical Production Challenge?
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', lineHeight: '1.6', marginBottom: '28px' }}>
              Direct in-house UAE workshop, proven crisis recovery, and zero middleman markups.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <InquiryCtaButton inquiryType={item.inquiryType} className="btn-editorial-primary">
                Send Project Brief →
              </InquiryCtaButton>
              <a href="https://wa.me/971524587992" className="btn-editorial-ghost" target="_blank" rel="noopener noreferrer">
                WhatsApp Us Directly
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
