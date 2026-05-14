document.addEventListener("DOMContentLoaded", () => {
  const figures = [...document.querySelectorAll("#ego-networks .figure-block")];
  if (!figures.length) return;

  const lightbox = document.createElement("div");
  lightbox.className = "ego-lightbox";
  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `
    <div class="ego-lightbox-backdrop" data-lightbox-close></div>
    <section class="ego-lightbox-panel" role="dialog" aria-modal="true" aria-labelledby="ego-lightbox-title">
      <button class="ego-lightbox-close" type="button" aria-label="Close expanded ego network">
        <span aria-hidden="true">&times;</span>
      </button>
      <img class="ego-lightbox-image" alt="" />
      <div class="ego-lightbox-caption">
        <strong id="ego-lightbox-title"></strong>
        <span></span>
      </div>
    </section>
  `;
  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector(".ego-lightbox-image");
  const lightboxTitle = lightbox.querySelector("#ego-lightbox-title");
  const lightboxText = lightbox.querySelector(".ego-lightbox-caption span");
  const closeButton = lightbox.querySelector(".ego-lightbox-close");
  let previousFocus = null;

  function openLightbox(image, caption) {
    previousFocus = document.activeElement;
    const title = caption.querySelector("strong")?.textContent.trim() || image.alt;
    const text = caption.querySelector("span")?.textContent.trim() || "";

    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxTitle.textContent = title;
    lightboxText.textContent = text;
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeButton.focus();
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.removeAttribute("src");
    document.body.classList.remove("lightbox-open");
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }

  figures.forEach((figure) => {
    const image = figure.querySelector("img");
    const caption = figure.querySelector("figcaption");
    if (!image || !caption) return;

    const title = caption.querySelector("strong")?.textContent.trim() || image.alt;
    const button = document.createElement("button");
    button.className = "ego-expand-button";
    button.type = "button";
    button.setAttribute("aria-label", `Expand ${title} ego network`);
    button.innerHTML = `<span aria-hidden="true">⤢</span>`;

    button.addEventListener("click", () => openLightbox(image, caption));
    image.addEventListener("click", () => openLightbox(image, caption));
    figure.appendChild(button);
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target.closest("[data-lightbox-close], .ego-lightbox-close")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });
});
