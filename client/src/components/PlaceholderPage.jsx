const PLACEHOLDER_COPY = {
  retail: {
    title: 'Retail page coming next',
    body: 'This route is ready for the next migration pass once the retail source page or content model is added.',
  },
  'hct-case-study': {
    title: 'HCT case study coming next',
    body: 'The navigation link has been preserved, and this placeholder gives you a clean route to replace with a native React page or Mongo-managed content later.',
  },
};

export default function PlaceholderPage({ slug }) {
  const content = PLACEHOLDER_COPY[slug] ?? {
    title: 'Page not available',
    body: 'This route has not been migrated yet.',
  };

  return (
    <main className="app-shell">
      <section className="app-status-card">
        <p className="app-eyebrow">Migration Placeholder</p>
        <h1>{content.title}</h1>
        <p>{content.body}</p>
        <a className="app-link" href="/">
          Back to home
        </a>
      </section>
    </main>
  );
}
