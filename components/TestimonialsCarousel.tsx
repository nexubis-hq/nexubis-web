"use client";

import { useState } from "react";

type Review = {
  name: string;
  first: string;
  second: string;
  reply: string;
  avatar: string;
  role: string;
  company: string;
};

type TestimonialsCarouselProps = {
  reviews: readonly Review[];
};

const CARD_STEP = "calc(25.1455rem + 1.875rem)";

export function TestimonialsCarousel({ reviews }: TestimonialsCarouselProps) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <>
      <div className="reviews-rail">
        <div
          className="reviews-track"
          style={{
            transform: `translate3d(calc(${activeGroup} * -1 * ${CARD_STEP}), 0, 0)`,
          }}
        >
          {reviews.map((review) => (
            <article className="review-card" key={review.name}>
              <p className="review-card-name">{review.name}</p>
              <p className="review-message">{review.first}</p>
              <p className="review-message">{review.second}</p>
              <p className="review-message reply">{review.reply}</p>
              <div className="review-profile">
                <img
                  src={`/assets/images/${review.avatar}`}
                  alt={review.name}
                />
                <div>
                  <h3>{review.name}</h3>
                  <p>
                    {review.role} at of {review.company}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="reviews-pagination" aria-label="Testimonials slides">
        {[0, 1].map((group) => (
          <button
            className={
              group === activeGroup
                ? "review-bullet review-bullet-active"
                : "review-bullet"
            }
            key={group}
            type="button"
            aria-label={`Show testimonial group ${group + 1}`}
            aria-current={group === activeGroup}
            onClick={() => setActiveGroup(group)}
          />
        ))}
      </div>
    </>
  );
}
