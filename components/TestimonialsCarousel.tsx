"use client";

import { useEffect, useRef, useState } from "react";

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

const DRAG_THRESHOLD = 48;

export function TestimonialsCarousel({ reviews }: TestimonialsCarouselProps) {
  const [activeGroup, setActiveGroup] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cardStep, setCardStep] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);

  useEffect(() => {
    const updateCardStep = () => {
      const track = trackRef.current;
      const firstCard = track?.querySelector<HTMLElement>(".review-card");
      if (!track || !firstCard) return;

      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      setCardStep(firstCard.getBoundingClientRect().width + gap);
    };

    updateCardStep();
    window.addEventListener("resize", updateCardStep);
    return () => window.removeEventListener("resize", updateCardStep);
  }, []);

  const endDrag = () => {
    if (!isDragging) return;

    if (dragOffset <= -DRAG_THRESHOLD) {
      setActiveGroup(1);
    } else if (dragOffset >= DRAG_THRESHOLD) {
      setActiveGroup(0);
    }

    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <>
      <div
        className="reviews-rail"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStartX.current = event.clientX;
          setIsDragging(true);
        }}
        onPointerMove={(event) => {
          if (!isDragging) return;
          setDragOffset(event.clientX - dragStartX.current);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div
          ref={trackRef}
          className={`reviews-track${isDragging ? " is-dragging" : ""}`}
          style={{
            transform: `translate3d(${activeGroup * -cardStep + dragOffset}px, 0, 0)`,
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
                  draggable={false}
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
