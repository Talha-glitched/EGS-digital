import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import standardStyles from '../styles/pages/standard-content.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { blogArticles, BLOG_CATEGORIES } from '../data/blogArticlesData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

export default function BlogHubPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') return blogArticles;
    return blogArticles.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  usePageLifecycle('Exhibition & Production Insights Blog | EGS Dubai Contractor', {
    revealSelector: '.blog-hub-page .reveal',
    description: 'Expert guides on exhibition stand construction in Dubai, DWTC & ADNEC regulations, 2026 booth pricing, graduation staging, and UAE retail branding rollouts.',
    structuredData: buildPageSchemaBundle({
      service: {
        name: 'EGS Exhibition & Production Insights Blog',
        description: 'Commercial guides, regulatory breakdowns, and technical articles on exhibition stand building, institutional event staging, and retail rollouts in Dubai and UAE.',
        url: '/blog',
      },
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
      ],
    }),
  });

  return (
    <>
      <style>{standardStyles}</style>
      <div className="standard-content-page blog-hub-page">
        <Navbar active="blog" />

        {/* Editorial Header */}
        <header className="editorial-hero">
          <div className="editorial-hero-inner">
            <nav className="editorial-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Blog &amp; Knowledge Base</span>
            </nav>

            <div className="editorial-badge-row">
              <span className="editorial-badge">EGS Knowledge Base</span>
              <span className="editorial-meta-info">Practical UAE Contractor Insights</span>
            </div>

            <h1 className="editorial-title">
              Exhibition Stand Building, Venue Guides &amp; Production Insights
            </h1>
            <p className="editorial-lead">
              Practical intelligence for marketing directors, event organizers, and procurement managers navigating custom physical builds across Dubai, Abu Dhabi, and the wider GCC.
            </p>

            <div className="editorial-actions">
              <InquiryCtaButton inquiryType="exhibitions" className="btn-editorial-primary">
                Discuss Your Build Brief →
              </InquiryCtaButton>
              <Link to="/blog/exhibition-stand-cost-dubai-2026" className="btn-editorial-ghost">
                2026 Stand Cost Guide
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="editorial-body-section">
          <div className="editorial-article-container" style={{ maxWidth: '1120px' }}>
            {/* Category Filter Pills */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '36px',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--rule-soft)',
              }}
            >
              {BLOG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`btn-editorial-ghost btn-editorial-pill ${selectedCategory === cat.id ? 'is-active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Articles Grid */}
            <div className="editorial-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filteredArticles.map((article) => (
                <article
                  className="editorial-card"
                  key={article.slug}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '260px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {article.categoryLabel}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>{article.readTime}</span>
                    </div>
                    <h3 style={{ fontSize: '19px', lineHeight: '1.35', marginBottom: '10px' }}>
                      <Link to={`/blog/${article.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {article.title}
                      </Link>
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--ink-soft)', lineHeight: '1.6', margin: 0 }}>
                      {article.excerpt}
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: '20px',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--rule-soft)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>{article.date}</span>
                    <Link to={`/blog/${article.slug}`} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      Read Article →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>

        {/* Bottom Consultation CTA */}
        <section style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--rule-soft)', padding: 'clamp(48px, 6vw, 80px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: 'var(--ink)', marginBottom: '12px' }}>
              Need a Custom Stand or Staging Solution?
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', lineHeight: '1.6', marginBottom: '28px' }}>
              Work directly with an in-house UAE fabrication team. We turn initial drawings into turnkey physical delivery with complete venue sign-offs.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn-editorial-primary">
                Send Project Inquiry →
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
