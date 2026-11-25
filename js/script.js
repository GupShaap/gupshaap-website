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
const submitEnquiry = form.querySelector('button[type="submit"]');

// Mobile number: +91 is fixed, the visitor types exactly 10 digits.
const phoneInput = form.elements.phone;
const phoneError = document.querySelector("#phone-error");
const PHONE_MESSAGE = "Please enter a valid 10-digit mobile number.";

function phoneDigits(value) {
  let digits = value.replace(/\D/g, "");
  // Pasted "+91 98765 43210" or "098765 43210": drop the country code / leading 0.
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function checkPhone({ show }) {
  const valid = /^\d{10}$/.test(phoneInput.value);
  phoneInput.setCustomValidity(valid ? "" : PHONE_MESSAGE);
  if (valid || show) {
    phoneInput.setAttribute("aria-invalid", String(!valid));
    phoneError.textContent = valid ? "" : PHONE_MESSAGE;
    phoneError.hidden = valid;
  }
  return valid;
}

// Keep only digits while typing or pasting (maxlength is lifted briefly so a paste isn't cut short).
phoneInput.addEventListener("beforeinput", () => phoneInput.removeAttribute("maxlength"));
phoneInput.addEventListener("input", () => {
  const digits = phoneDigits(phoneInput.value);
  if (phoneInput.value !== digits) phoneInput.value = digits;
  phoneInput.maxLength = 10;
  // Only show the error once they've left the field; clear it as soon as it's fixed.
  checkPhone({ show: phoneInput.getAttribute("aria-invalid") === "true" });
});
phoneInput.addEventListener("blur", () => {
  if (phoneInput.value) checkPhone({ show: true });
});
phoneInput.addEventListener("invalid", () => checkPhone({ show: true }));
form.addEventListener("reset", () => {
  phoneInput.removeAttribute("aria-invalid");
  phoneInput.setCustomValidity("");
  phoneError.hidden = true;
});
checkPhone({ show: false });
const SUBMIT_TIMEOUT_MS = 20000;
const SUCCESS_AUTOCLOSE_MS = 6000;
let sending = false;

// Overlay shown on top of the form: "Sending…" → success / error message.
const overlay = document.querySelector("#enquiry-status");
const overlayTitle = overlay.querySelector(".form-overlay-title");
const overlayText = overlay.querySelector(".form-overlay-text");
const overlayClose = overlay.querySelector(".form-overlay-close");

function showOverlay(state, title, text, { autoCloseMs = 0, closeLabel = "Close" } = {}) {
  overlay.hidden = false;
  overlay.dataset.state = state;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayClose.textContent = closeLabel;
  overlayClose.hidden = state === "sending";
  stopAutoClose();
  if (autoCloseMs) startAutoClose(autoCloseMs);
}

// Auto-close countdown. A timer does the closing; the shrinking bar just shows it.
// Hovering the card pauses both.
let autoCloseTimer;
let autoCloseLeft = 0;
let autoCloseStarted = 0;

function startAutoClose(ms) {
  autoCloseLeft = ms;
  overlay.style.setProperty("--autoclose", `${ms}ms`);
  overlay.dataset.autoclose = "";
  resumeAutoClose();
}
function resumeAutoClose() {
  if (!autoCloseLeft || overlay.hidden) return;
  autoCloseStarted = Date.now();
  clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(closeOverlay, autoCloseLeft);
  overlay.classList.remove("is-paused");
}
function pauseAutoClose() {
  if (!autoCloseLeft) return;
  clearTimeout(autoCloseTimer);
  autoCloseLeft = Math.max(0, autoCloseLeft - (Date.now() - autoCloseStarted));
  overlay.classList.add("is-paused");
}
function stopAutoClose() {
  clearTimeout(autoCloseTimer);
  autoCloseLeft = 0;
  delete overlay.dataset.autoclose;
  overlay.classList.remove("is-paused");
}

function closeOverlay() {
  if (overlay.hidden || sending) return;
  const hadFocus = overlay.contains(document.activeElement);
  const wasError = overlay.dataset.state === "error";
  stopAutoClose();
  overlay.hidden = true;
  // Only move focus if it was inside the overlay, so an auto-close never yanks the page.
  if (hadFocus) (wasError ? submitEnquiry : form.elements.name).focus();
}

overlayClose.addEventListener("click", closeOverlay);
overlay.addEventListener("pointerenter", pauseAutoClose);
overlay.addEventListener("pointerleave", resumeAutoClose);
form.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlay.hidden) closeOverlay();
});

// Lock every field while the enquiry is being sent.
function setSending(isSending) {
  sending = isSending;
  form.setAttribute("aria-busy", String(isSending));
  for (const field of form.elements) {
    if (field !== overlayClose) field.disabled = isSending;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending) return;

  const endpoint = form.dataset.endpoint.trim();
  if (!endpoint) {
    showOverlay(
      "error",
      "Online enquiries are unavailable",
      "You can email us at info@gupshaap.com.",
    );
    overlayClose.focus();
    return;
  }

  // Read the values before the fields are disabled (disabled fields are left out of FormData).
  // Sent URL-encoded so Google Apps Script receives it in e.parameter without a CORS preflight.
  if (!checkPhone({ show: true })) {
    phoneInput.focus();
    return;
  }
  const body = new URLSearchParams(new FormData(form));
  body.set("phone", `+91-${phoneInput.value}`);
  const name = (form.elements.name.value || "").trim().split(/\s+/)[0];

  setSending(true);
  showOverlay("sending", "Sending your enquiry…", "This only takes a moment.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Enquiry submission failed");
    const result = await response.json().catch(() => ({}));
    if (result.result !== "success") throw new Error("Enquiry was not saved");

    setSending(false);
    form.reset();
    showOverlay(
      "success",
      `Thanks${name ? `, ${name}` : ""}!`,
      "We’ve received your enquiry. We’ll be in touch soon.",
      { autoCloseMs: SUCCESS_AUTOCLOSE_MS },
    );
  } catch (error) {
    setSending(false); // keep what they typed so they can retry
    showOverlay(
      "error",
      "That didn’t go through",
      error.name === "AbortError"
        ? "This is taking longer than expected. Please try again, or email info@gupshaap.com."
        : "Please try again, or email info@gupshaap.com.",
      { closeLabel: "Try again" },
    );
  } finally {
    clearTimeout(timeout);
  }
  overlayClose.focus({ preventScroll: true });
  overlay.scrollIntoView({ block: "nearest", behavior: "smooth" });
});
