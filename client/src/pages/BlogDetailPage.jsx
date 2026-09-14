import { useParams, Link, Navigate } from 'react-router-dom';
import standardStyles from '../styles/pages/standard-content.css?raw';
import { usePageLifecycle } from '../hooks/usePageLifecycle.js';
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from './SiteChrome.jsx';
import InquiryCtaButton from '../components/inquiry/InquiryCtaButton.jsx';
import { getArticleBySlug, blogArticles } from '../data/blogArticlesData.js';
import { buildPageSchemaBundle } from '../utils/schemaGenerator.js';

function formatInlineText(text) {
  if (!text) return text;
  // Handle **bold** fragments
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function BlogDetailPage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  if (!article) {
    return <Navigate to="/blog" replace />;
  }

  usePageLifecycle(`${article.title} | EGS Dubai`, {
    revealSelector: '.blog-detail-page .reveal',
    description: article.excerpt,
    ogType: 'article',
    structuredData: buildPageSchemaBundle({
      service: {
        name: article.title,
        description: article.excerpt,
        url: `/blog/${article.slug}`,
      },
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: article.title, url: `/blog/${article.slug}` },
      ],
    }),
  });

  const otherArticles = blogArticles.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <style>{standardStyles}</style>
      <div className="standard-content-page blog-detail-page">
        <Navbar active="blog" />

        {/* Editorial Article Header */}
        <header className="editorial-hero">
          <div className="editorial-hero-inner">
            <nav className="editorial-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/blog">Blog</Link>
              <span>/</span>
              <span>{article.categoryLabel}</span>
            </nav>

            <div className="editorial-badge-row">
              <span className="editorial-badge">{article.categoryLabel}</span>
              <span className="editorial-meta-info">⏱ {article.readTime}</span>
              <span className="editorial-meta-info">• {article.date}</span>
            </div>

            <h1 className="editorial-title">{article.title}</h1>
            <p className="editorial-lead">{article.excerpt}</p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingTop: '18px',
                borderTop: '1px solid var(--rule-soft)',
                fontSize: '13px',
                color: 'var(--ink-soft)',
              }}
            >
              <span>
                By <strong>{article.author || 'EGS Technical Production Team'}</strong> &bull; Direct UAE Exhibition Contractor
              </span>
            </div>
          </div>
        </header>

        {/* Main Editorial Article Body */}
        <main className="editorial-body-section">
          <div className="editorial-article-container">
            <article className="editorial-prose">
              {article.content.split('\n\n').map((block, idx) => {
                const trimmed = block.trim();
                if (!trimmed || trimmed === '---') return null;

                // H2 Heading
                if (trimmed.startsWith('### ')) {
                  return (
                    <h2 key={idx}>
                      {trimmed.replace('### ', '')}
                    </h2>
                  );
                }

                // H3 Heading
                if (trimmed.startsWith('#### ')) {
                  return (
                    <h3 key={idx}>
                      {trimmed.replace('#### ', '')}
                    </h3>
                  );
                }

                // Table Block
                if (trimmed.startsWith('|')) {
                  const rawLines = trimmed.split('\n').filter((r) => !r.includes('---') && r.trim());
                  if (rawLines.length === 0) return null;

                  const headerCells = rawLines[0].split('|').filter((c) => c.trim().length > 0).map((c) => c.trim());
                  const bodyRows = rawLines.slice(1);

                  return (
                    <div className="editorial-table-wrap" key={idx}>
                      <table className="editorial-table">
                        <thead>
                          <tr>
                            {headerCells.map((cell, cIdx) => (
                              <th key={cIdx}>{formatInlineText(cell)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bodyRows.map((row, rIdx) => {
                            const cells = row.split('|').filter((c) => c.trim().length > 0).map((c) => c.trim());
                            return (
                              <tr key={rIdx}>
                                {cells.map((cell, cIdx) => (
                                  <td key={cIdx}>{formatInlineText(cell)}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // Callout Note
                if (trimmed.startsWith('*Note:') || trimmed.startsWith('Note:')) {
                  return (
                    <div className="editorial-callout" key={idx}>
                      <p>
                        <strong>Note:</strong> {formatInlineText(trimmed.replace(/^(\*Note:\*?|Note:)/, '').trim())}
                      </p>
                    </div>
                  );
                }

                // Unordered or Ordered List
                if (trimmed.startsWith('* ') || trimmed.startsWith('1. ')) {
                  const items = trimmed.split('\n');
                  const isOrdered = trimmed.startsWith('1. ');
                  const ListTag = isOrdered ? 'ol' : 'ul';

                  return (
                    <ListTag key={idx}>
                      {items.map((item, iIdx) => {
                        const cleanText = item.replace(/^(\* |\d+\. )/, '').trim();
                        return (
                          <li key={iIdx}>
                            {formatInlineText(cleanText)}
                          </li>
                        );
                      })}
                    </ListTag>
                  );
                }

                // Default Paragraph
                return (
                  <p key={idx}>
                    {formatInlineText(trimmed)}
                  </p>
                );
              })}
            </article>

            {/* In-Article Contextual Service Callout */}
            {article.relatedService ? (
              <aside className="editorial-service-card" aria-label="Related Service Inquiry">
                <div className="editorial-service-card-text">
                  <h4>Looking for {article.relatedServiceLabel}?</h4>
                  <p>
                    Direct UAE workshop fabrication with full venue engineering permits and guaranteed handover before show opening.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link to={article.relatedService} className="btn-editorial-primary">
                    Explore Capabilities →
                  </Link>
                  <InquiryCtaButton inquiryType="exhibitions" className="btn-editorial-ghost">
                    Request Quote
                  </InquiryCtaButton>
                </div>
              </aside>
            ) : null}
          </div>
        </main>

        {/* Related Articles Section */}
        <section className="editorial-section-light">
          <div className="editorial-article-container" style={{ maxWidth: '1100px' }}>
            <div>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--ochre)' }}>
                Contractor Guides &amp; Intelligence
              </span>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: 'var(--ink)', margin: '6px 0 0' }}>
                Related Exhibition &amp; Production Insights
              </h2>
            </div>
            <div className="editorial-cards-grid">
              {otherArticles.map((item) => (
                <article className="editorial-card" key={item.slug}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.categoryLabel}
                    </span>
                    <h3>
                      <Link to={`/blog/${item.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {item.title}
                      </Link>
                    </h3>
                    <p>{item.excerpt}</p>
                  </div>
                  <div style={{ paddingTop: '14px', borderTop: '1px solid var(--rule-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>{item.readTime}</span>
                    <Link to={`/blog/${item.slug}`} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                      Read Guide →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Consultation CTA */}
        <section style={{ background: 'var(--paper)', borderTop: '1px solid var(--rule-soft)', padding: 'clamp(48px, 6vw, 80px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, color: 'var(--ink)', marginBottom: '12px' }}>
              Have an Upcoming Exhibition or Staging Brief?
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--ink-soft)', lineHeight: '1.6', marginBottom: '28px' }}>
              Discuss your project specifications directly with our in-house engineering and carpentry team. Itemized quotations and 3D concept proposals within 24 hours.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <InquiryCtaButton inquiryType="exhibitions" className="btn-editorial-primary">
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
