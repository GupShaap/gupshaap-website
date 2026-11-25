// Animate each section once. All content remains visible without JavaScript.
if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const sections = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-entered");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -56px 0px", threshold: 0 },
  );
  for (const section of document.querySelectorAll(
    ".home-page > section[id]",
  )) {
    sections.observe(section);
  }
}

const deck = document.querySelector("#service-deck");
const cards = [...deck.querySelectorAll(".service-row")];
const controls = deck.querySelector(".card-edge-controls");
const [previousService, nextService] =
  controls.querySelectorAll("button");
const position = document.querySelector(".service-position");
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

let activeService = 0;
let collectingPile = false;
let touchStart;
let movingCard;
let settleTimer;

function renderServicePile(collectionSide = 0) {
  cards.forEach((card, index) => {
    const side = collectionSide || Math.sign(index - activeService);
    const depth = Math.min(4, Math.abs(index - activeService));
    const distance = side === 0 ? 0 : side * (13 + depth * 3);
    card.style.setProperty("--pile-x", `${distance}%`);
    card.style.setProperty(
      "--pile-y",
      `${side === 0 ? 0 : 9 + depth * 4}px`,
    );
    card.style.setProperty(
      "--pile-angle",
      `${side * (5 + depth * 2)}deg`,
    );
    card.style.setProperty(
      "--pile-scale",
      side === 0 ? 1 : 0.93 - depth * 0.018,
    );
    card.style.setProperty("--pile-layer", side === 0 ? 20 : 12 - depth);
    card.inert = side !== 0;
  });
  if (!collectionSide)
    position.textContent = `${activeService + 1} / ${cards.length}`;
}

function moveService(direction) {
  if (collectingPile) return;
  const nextIndex = activeService + direction;
  const wraps = nextIndex < 0 || nextIndex >= cards.length;

  clearTimeout(settleTimer);
  if (movingCard) movingCard.style.removeProperty("z-index");
  movingCard = cards[activeService];
  if (!wraps) {
    activeService = nextIndex;
    renderServicePile();
    if (!reducedMotion.matches) {
      movingCard.style.zIndex = 21;
      settleTimer = setTimeout(
        () => movingCard.style.removeProperty("z-index"),
        230,
      );
    }
    return;
  }

  const restartIndex = direction > 0 ? 0 : cards.length - 1;
  if (reducedMotion.matches) {
    activeService = restartIndex;
    renderServicePile();
    return;
  }
  collectingPile = true;
  renderServicePile(-direction);
  setTimeout(() => {
    activeService = restartIndex;
    renderServicePile();
    collectingPile = false;
  }, 380);
}

previousService.addEventListener("click", () => moveService(-1));
nextService.addEventListener("click", () => moveService(1));
deck.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  if (event.target !== deck) deck.focus({ preventScroll: true });
  moveService(event.key === "ArrowRight" ? 1 : -1);
});
deck.addEventListener(
  "touchstart",
  (event) => {
    const { clientX, clientY } = event.changedTouches[0];
    touchStart = { clientX, clientY };
  },
  { passive: true },
);
deck.addEventListener(
  "touchend",
  (event) => {
    if (!touchStart) return;
    const { clientX, clientY } = event.changedTouches[0];
    const dx = clientX - touchStart.clientX;
    const dy = clientY - touchStart.clientY;
    touchStart = undefined;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (deck.contains(document.activeElement))
        deck.focus({ preventScroll: true });
      moveService(dx < 0 ? 1 : -1);
    }
  },
  { passive: true },
);
deck.classList.add("is-stacked");
controls.hidden = false;
position.hidden = false;
renderServicePile();

const form = document.querySelector("#enquiry");
for (const link of document.querySelectorAll("[data-service]")) {
  link.addEventListener("click", () => {
    form.elements.service.value = link.dataset.service;
  });
}
const enquiryStatus = document.querySelector("#enquiry-status");
const submitEnquiry = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitEnquiry.disabled) return;

  enquiryStatus.hidden = false;
  const endpoint = form.dataset.endpoint.trim();
  if (!endpoint) {
    enquiryStatus.textContent =
      "Online enquiries are unavailable. You can email us at info@gupshaap.com.";
    return;
  }

  submitEnquiry.disabled = true;
  enquiryStatus.textContent = "Sending your enquiry…";
  try {
    // Sent as URL-encoded form data so Google Apps Script receives it in e.parameter
    // without a CORS preflight.
    const response = await fetch(endpoint, {
      method: "POST",
      body: new URLSearchParams(new FormData(form)),
    });
    if (!response.ok) throw new Error("Enquiry submission failed");
    const result = await response.json().catch(() => ({}));
    if (result.result !== "success")
      throw new Error("Enquiry was not saved");
    form.reset();
    enquiryStatus.textContent =
      "Thanks for reaching out. We’ve received your enquiry.";
  } catch {
    enquiryStatus.textContent =
      "We couldn’t send your enquiry. Please try again or email info@gupshaap.com.";
  } finally {
    submitEnquiry.disabled = false;
  }
});
