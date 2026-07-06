const clouds = Array.from({ length: 6 });

export function PackagesCloudCta() {
  return (
    <section className="packages-cloud-cta">
      <div className="site-container packages-cloud-container">
        <div className="packages-cloud-row">
          <div className="packages-cloud-column">
            <h2>Empowering</h2>
          </div>
        </div>
        <div className="packages-cloud-row packages-cloud-row-end">
          <div className="packages-cloud-column">
            <h2>Dreams.</h2>
          </div>
        </div>
      </div>

      <div className="packages-clouds" aria-hidden="true">
        {clouds.map((_, index) => (
          <img
            className="packages-cloud-image"
            src="/assets/images/clouds_1.avif"
            alt=""
            key={index}
          />
        ))}
      </div>
    </section>
  );
}
