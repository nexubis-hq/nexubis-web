import { CompetitorComparisonLottie } from "@/components/CompetitorComparisonLottie";

export function PackagesComparison() {
  return (
    <section className="why-nexubis-section section">
      <div className="site-container why-nexubis-container">
        <div className="why-nexubis-heading">
          <h2>
            <span>All the Expert Skill,</span>
            None of the Overhead
          </h2>
        </div>

        <div className="why-nexubis-comparison">
          <div className="why-nexubis-lottie-wrapper">
            <CompetitorComparisonLottie />
          </div>
        </div>
      </div>
    </section>
  );
}
