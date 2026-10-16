(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const hero = $(".hero");

  /* ============ 1. VÍDEO DO TOPO: PLAY/PAUSE + SOM ============ */
  const video = $("#heroVideo");
  const controls = $(".hero-controls");
  const soundBtn = $("#soundBtn");
  const playBtn = $("#playBtn");

  if (video && controls && soundBtn && playBtn) {
    const soundLabel = $(".sound-label", soundBtn);
    const playLabel = $(".play-label", playBtn);
    let failed = false;
    let userPaused = reduce; // quem pede menos movimento começa com o vídeo parado

    // Se o arquivo não existir ou o formato não for suportado, esconde tudo sem quebrar o site
    const fail = () => {
      if (failed) return;
      failed = true;
      video.remove();
      controls.hidden = true;
      hero.classList.add("no-video");
      console.warn(
        "Não foi possível carregar images/hero.mp4. Confira o nome do arquivo e se o vídeo está em H.264 + AAC (vídeos do TikTok costumam vir em H.265 e não tocam no navegador).",
      );
    };

    video.addEventListener("error", fail);
    $("source", video).addEventListener("error", fail);

    const syncUI = () => {
      const playing = !video.paused;
      playBtn.classList.toggle("is-playing", playing);
      playBtn.setAttribute(
        "aria-label",
        playing ? "Pausar vídeo" : "Reproduzir vídeo",
      );
      playLabel.textContent = playing ? "Pausar" : "Reproduzir";

      const soundOn = !video.muted;
      soundBtn.classList.toggle("on", soundOn);
      soundBtn.setAttribute("aria-pressed", soundOn);
      soundBtn.setAttribute(
        "aria-label",
        soundOn ? "Desativar som do vídeo" : "Ativar som do vídeo",
      );
      soundLabel.textContent = soundOn ? "Desativar som" : "Ativar som";
    };

    ["play", "pause", "volumechange"].forEach((evt) =>
      video.addEventListener(evt, syncUI),
    );

    if (reduce) {
      video.removeAttribute("autoplay");
      video.pause();
    }
    syncUI();

    playBtn.addEventListener("click", () => {
      if (video.paused) {
        userPaused = false;
        video.play().catch(() => {});
      } else {
        userPaused = true;
        video.pause();
      }
    });

    soundBtn.addEventListener("click", () => {
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 0.6;
        if (video.paused) {
          userPaused = false;
          video.play().catch(() => {});
        }
      }
      syncUI();
    });

    // Pausa quando o topo sai da tela (economiza bateria) e volta sozinho, salvo se a pessoa pausou
    new IntersectionObserver(
      ([entry]) => {
        if (failed) return;
        if (entry.isIntersecting) {
          if (!userPaused) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 },
    ).observe(video);
  }

  /* ============ 2. BARRA DE PROGRESSO, MENU E VOLTAR AO TOPO ============ */
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.prepend(bar);

  const topBtn = document.createElement("button");
  topBtn.className = "to-top";
  topBtn.type = "button";
  topBtn.setAttribute("aria-label", "Voltar ao topo");
  topBtn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
  document.body.append(topBtn);
  topBtn.addEventListener("click", () =>
    scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }),
  );

  const nav = $(".navbar");
  let scrollTicking = false;

  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle("scrolled", y > 40);
    topBtn.classList.toggle("show", y > 700);
    scrollTicking = false;
  };

  addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  onScroll();

  // No celular, fecha o menu depois de tocar em um link
  const menu = $("#navbarNav");
  $$(".navbar .nav-link, .navbar-brand").forEach((link) =>
    link.addEventListener("click", () => {
      if (menu.classList.contains("show")) {
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
      }
    }),
  );

  /* ============ 3. ENTRADA SUAVE DOS ELEMENTOS ============ */
  const revealTargets = new Set();

  // Os cards ficam dentro de uma coluna: a coluna é que entra, o card só inclina
  $$(".fact-card, .why-card, .char-card, .gallery-item").forEach((el) =>
    revealTargets.add(el.parentElement),
  );
  $$(
    "section:not(.cta-final) > h2, .section-lead, .table-container, .accordion, #carouselStory, .spoiler-note, .cta-final",
  ).forEach((el) => revealTargets.add(el));

  const revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries, obs) =>
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("in");
                obs.unobserve(entry.target);
              }
            }),
          { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
        )
      : null;

  revealTargets.forEach((el) => {
    el.classList.add("reveal");
    const row = el.parentElement;
    if (row && row.classList.contains("row")) {
      const index = [...row.children].indexOf(el);
      el.style.setProperty("--d", `${(index % 3) * 90}ms`);
    }
    revealObserver ? revealObserver.observe(el) : el.classList.add("in");
  });

  /* ============ 4. NÚMEROS QUE CONTAM ============ */
  if (!reduce) {
    const counters = $$(".fact-card .value").filter((el) =>
      /^\d+$/.test(el.textContent.trim()),
    );

    const countUp = (el) => {
      const end = +el.dataset.end;
      const start = end > 1000 ? end - 80 : 0; // o ano começa perto do valor final
      const duration = 1400;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (end - start) * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const countObserver = new IntersectionObserver(
      (entries, obs) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            countUp(entry.target);
          }
        }),
      { threshold: 0.6 },
    );

    counters.forEach((el) => {
      el.dataset.end = el.textContent.trim();
      el.textContent = +el.dataset.end > 1000 ? +el.dataset.end - 80 : 0;
      countObserver.observe(el);
    });
  }

  /* ============ 5. CARDS: INCLINAÇÃO 3D + FOCO DE LUZ ============ */
  if (canHover) {
    $$(".fact-card, .why-card, .char-card, .gallery-item").forEach((card) => {
      card.classList.add("tilt");
      const maxTilt = card.matches(".gallery-item") ? 4 : 6;
      let frame = 0;

      card.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const { clientX, clientY } = e;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const r = card.getBoundingClientRect();
          const x = clientX - r.left;
          const y = clientY - r.top;
          card.style.setProperty("--mx", `${x}px`);
          card.style.setProperty("--my", `${y}px`);
          if (!reduce) {
            card.style.setProperty(
              "--rx",
              `${(y / r.height - 0.5) * -2 * maxTilt}deg`,
            );
            card.style.setProperty(
              "--ry",
              `${(x / r.width - 0.5) * 2 * maxTilt}deg`,
            );
          }
        });
      });

      card.addEventListener("pointerenter", () =>
        card.classList.add("is-tilting"),
      );
      card.addEventListener("pointerleave", () => {
        cancelAnimationFrame(frame);
        card.classList.remove("is-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  }

  /* ============ 6. TOPO: BRILHO QUE SEGUE O MOUSE + PARALLAX ============ */
  if (hero && canHover) {
    const content = $(":scope > .container", hero);
    let heroFrame = 0;

    hero.addEventListener("pointerenter", () => hero.classList.add("is-hover"));
    hero.addEventListener("pointerleave", () => {
      cancelAnimationFrame(heroFrame);
      hero.classList.remove("is-hover");
      if (content) content.style.transform = "";
    });
    hero.addEventListener("pointermove", (e) => {
      const { clientX, clientY } = e;
      cancelAnimationFrame(heroFrame);
      heroFrame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const px = (clientX - r.left) / r.width;
        const py = (clientY - r.top) / r.height;
        hero.style.setProperty("--hx", `${px * 100}%`);
        hero.style.setProperty("--hy", `${py * 100}%`);
        if (!reduce && content) {
          content.style.transform = `translate3d(${(px - 0.5) * -14}px, ${(py - 0.5) * -10}px, 0)`;
        }
      });
    });
  }

  /* ============ 7. BOTÕES MAGNÉTICOS ============ */
  if (canHover && !reduce) {
    $$(".btn-brass, .btn-ghost, .hero-btn").forEach((btn) => {
      btn.classList.add("magnetic");
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });
  }

  /* ============ 8. GALERIA: CLIQUE PARA AMPLIAR ============ */
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Imagem ampliada");
  lightbox.innerHTML =
    '<button class="lightbox-close" type="button" aria-label="Fechar">&times;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>';
  document.body.append(lightbox);

  const lbImg = $("img", lightbox);
  const lbCaption = $("figcaption", lightbox);
  const lbClose = $(".lightbox-close", lightbox);
  let lastFocus = null;

  const openLightbox = (img) => {
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    const caption = img.closest(".gallery-item")?.querySelector("figcaption");
    lbCaption.textContent = caption ? caption.textContent : img.alt;
    lastFocus = document.activeElement;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
    lbClose.focus();
  };

  const closeLightbox = () => {
    lightbox.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === lbClose) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "Tab") {
      e.preventDefault();
      lbClose.focus();
    }
  });

  // Só vira clicável se a imagem realmente existir (as que falham são removidas pelo HTML)
  $$(".gallery-media img").forEach((img) => {
    const enable = () => {
      img.classList.add("zoomable");
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.addEventListener("click", () => openLightbox(img));
      img.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(img);
        }
      });
    };
    img.complete && img.naturalWidth
      ? enable()
      : img.addEventListener("load", enable, { once: true });
  });
})();
