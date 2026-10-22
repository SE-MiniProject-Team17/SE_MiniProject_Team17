/** Temporary page for modules that are not built yet. Replace with the real page. */
export default function PlaceholderPage({ title, issues }) {
  return (
    <section>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      <div className="empty">
        <strong>Coming soon</strong>
        <p className="small">This part of the platform is being built{issues ? ` (${issues})` : ''}.</p>
      </div>
    </section>
  );
}
