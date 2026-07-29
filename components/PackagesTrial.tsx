const benefitColumns = [
  [
    "No upfront subscription required",
    "Room to explore how we work, at your own pace",
  ],
  [
    "Get real work done while building trust",
    "Extend your trial if you're still unsure after month 1",
  ],
];

function TrialCheckIcon() {
  return (
    <svg viewBox="0 0 24 25" aria-hidden="true">
      <path d="M2.5 12.3c0-4.478 0-6.717 1.391-8.108C5.282 2.801 7.522 2.801 12 2.801s6.718 0 8.109 1.391C21.5 5.583 21.5 7.822 21.5 12.3s0 6.718-1.391 8.109C18.718 21.801 16.478 21.801 12 21.801s-6.718 0-8.109-1.392C2.5 19.018 2.5 16.779 2.5 12.3Z" />
      <path opacity=".4" d="m8 12.801 2.5 2.5 5.5-6" />
    </svg>
  );
}

export function PackagesTrial() {
  return (
    <section className="trial-cta-section section">
      <div className="site-container trial-cta-wrapper">
        <div className="trial-content">
          <h2>Still on the Fence?</h2>
          <p>Start flexible - pay only for what you need</p>

          <div className="trial-benefits-grid">
            {benefitColumns.map((column, index) => (
              <div className="trial-benefits-list" key={index}>
                {column.map((benefit) => (
                  <div className="trial-benefit" key={benefit}>
                    <TrialCheckIcon />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="trial-button-group">
            <a href="/post/rethinking-the-nexubis-trial">
              Learn More
            </a>
          </div>
        </div>

        <div className="trial-background" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/assets/videos/3D-Abstract-Waves-Black-Background-2023-11-27-04-58-03-Utc-poster-00001.jpg"
          >
            <source
              src="/assets/videos/3D-Abstract-Waves-Black-Background-2023-11-27-04-58-03-Utc-transcode.mp4"
              type="video/mp4"
            />
            <source
              src="/assets/videos/3D-Abstract-Waves-Black-Background-2023-11-27-04-58-03-Utc-transcode.webm"
              type="video/webm"
            />
          </video>
          <div className="trial-background-blur" />
        </div>
      </div>
    </section>
  );
}
