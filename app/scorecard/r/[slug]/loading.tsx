// Loading state for a shared report: a calm skeleton in the report's own
// rhythm (cover band, exhibit row, score block), all on tokens.
export default function ReportLoading() {
  return (
    <main className="sc-report" aria-busy="true" aria-label="Loading your Scorecard">
      <div className="sc-cover sc-skeleton-cover">
        <div className="site-container">
          <span className="sc-skeleton-line sc-skeleton-kicker" />
          <span className="sc-skeleton-line sc-skeleton-title" />
          <span className="sc-skeleton-line sc-skeleton-sub" />
        </div>
      </div>
      <div className="site-container sc-skeleton-body">
        <div className="sc-skeleton-cards">
          <span className="sc-skeleton-card" />
          <span className="sc-skeleton-card" />
          <span className="sc-skeleton-card" />
        </div>
        <span className="sc-skeleton-ring" />
      </div>
    </main>
  );
}
