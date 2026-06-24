"use client";

import { useState } from "react";

const work = [
  {
    name: "Circuit",
    image: "circuit.png",
    tags: ["Webflow Development", "Product design"],
    href: "https://www.nexubis.io/work/circuit",
  },
  {
    name: "Oxipack",
    image: "oxipack.webp",
    tags: ["Webflow Development", "Design"],
    href: "https://www.nexubis.io/work/oxipack",
  },
  {
    name: "Altify",
    image: "altify.webp",
    tags: ["Webflow Development", "Product Design"],
    href: "https://www.nexubis.io/work/altify",
  },
  {
    name: "Sataya",
    image: "sataya.webp",
    tags: ["Webflow Development", "Visual Brand"],
    href: "https://www.nexubis.io/work/sataya",
  },
];

export function WorkSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeWork = work[activeIndex];

  return (
    <div className="work-tabs">
      <div className="work-list" role="tablist" aria-label="Featured work">
        {work.map((item, index) => {
          const active = index === activeIndex;

          return (
            <div
              role="tab"
              tabIndex={0}
              aria-selected={active}
              className={active ? "work-item active" : "work-item"}
              key={item.name}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
            >
              <h3>{item.name}</h3>
              <ul aria-hidden={!active}>
                {item.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="work-mobile-preview"
                aria-label={`View ${item.name} case study`}
                onClick={(event) => event.stopPropagation()}
              >
                <img src={`/assets/images/${item.image}`} alt="" />
              </a>
            </div>
          );
        })}
      </div>

      <a
        href={activeWork.href}
        target="_blank"
        rel="noreferrer"
        className="work-preview"
        aria-label={`View ${activeWork.name} case study`}
      >
        <img
          src={`/assets/images/${activeWork.image}`}
          alt={`${activeWork.name} project preview`}
        />
      </a>
    </div>
  );
}
