/**
 * ELEVATE EVENTS - Interactive Logic & Enhancements
 * - Global Header Dropdown Interactivity (Hover + Click)
 * - MeanMenu Mobile Menu & Offcanvas Initialization
 * - Sticky Header & Back-To-Top Control
 * - Portfolio Filtering (Weddings, Corporate, Concerts, Celebrations)
 * - Consultation Form Validation & Elegant Success Toast
 * - Upcoming Events "Reserve Access" auto-fill & smooth scroll
 * - Newsletter validation & feedback
 */

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /* ==========================================================
     0. PRELOADER DISMISSAL FALLBACK
     ========================================================== */
  const preloader = document.getElementById("preloader");
  if (preloader) {
    setTimeout(function () {
      preloader.classList.add("loaded");
      setTimeout(function () {
        preloader.style.display = "none";
      }, 500);
    }, 400);
  }

  /* ==========================================================
     1. GLOBAL STICKY HEADER & BACK-TO-TOP
     ========================================================== */
  const headerSticky = document.getElementById("header-sticky");
  const backTop = document.getElementById("back-top");

  window.addEventListener("scroll", function () {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (headerSticky) {
      if (scrollY > 150) {
        headerSticky.classList.add("sticky");
      } else {
        headerSticky.classList.remove("sticky");
      }
    }
    if (backTop) {
      if (scrollY > 300) {
        backTop.style.display = "flex";
      } else {
        backTop.style.display = "none";
      }
    }
  });

  if (backTop) {
    backTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ==========================================================
     2. OFFCANVAS SIDEBAR TOGGLE & ACCESSIBILITY
     ========================================================== */
  const sidebarToggles = document.querySelectorAll(".sidebar__toggle");
  const offcanvasInfo = document.querySelector(".offcanvas__info");
  const offcanvasOverlay = document.querySelector(".offcanvas__overlay");
  const offcanvasClose = document.querySelectorAll(".offcanvas__close, .offcanvas__overlay");

  function openOffcanvas(e) {
    if (e) e.preventDefault();
    if (offcanvasInfo) offcanvasInfo.classList.add("info-open");
    if (offcanvasOverlay) offcanvasOverlay.classList.add("overlay-open");
    document.body.style.overflow = "hidden";
  }

  function closeOffcanvas(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (offcanvasInfo) offcanvasInfo.classList.remove("info-open");
    if (offcanvasOverlay) offcanvasOverlay.classList.remove("overlay-open");
    document.body.style.overflow = "";
  }

  sidebarToggles.forEach(function (btn) {
    btn.addEventListener("click", openOffcanvas);
  });

  offcanvasClose.forEach(function (btn) {
    btn.addEventListener("click", closeOffcanvas);
  });

  // Close offcanvas on Escape key press
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
      closeOffcanvas();
    }
  });

  /* ==========================================================
     3. ROBUST MOBILE NAVIGATION & ACCORDION SYSTEM
     ========================================================== */
  const mobileMenuContainer = document.querySelector(".mobile-menu");
  const sourceNav = document.getElementById("mobile-menu");

  // Deduplicate and sanitize mobile navigation container
  function sanitizeMobileMenu() {
    if (!mobileMenuContainer) return;

    const meanBar = mobileMenuContainer.querySelector(".mean-bar");
    if (meanBar) {
      // MeanMenu is active: remove any duplicate fallback or stray top-level ULs
      const duplicateUls = mobileMenuContainer.querySelectorAll(":scope > ul, .elevate-fallback-menu");
      duplicateUls.forEach(function (ul) {
        ul.remove();
      });
    }
  }

  // Run sanitization immediately and after initial render phases
  sanitizeMobileMenu();
  setTimeout(sanitizeMobileMenu, 100);
  setTimeout(sanitizeMobileMenu, 400);

  // Fallback ONLY if MeanMenu / jQuery is completely unavailable and no menu was populated
  const hasMeanMenu = typeof jQuery !== "undefined" && (jQuery.fn.meanmenu || jQuery(".mean-container").length > 0);
  if (!hasMeanMenu && mobileMenuContainer && sourceNav && !mobileMenuContainer.querySelector("ul")) {
    const cloneNav = sourceNav.cloneNode(true);
    cloneNav.removeAttribute("id");
    const topUl = cloneNav.querySelector("ul");
    if (topUl) {
      topUl.classList.add("elevate-fallback-menu");
      mobileMenuContainer.appendChild(topUl);

      // Add accordion click handling to mobile dropdowns
      const mobileDropdowns = mobileMenuContainer.querySelectorAll("li.has-dropdown");
      mobileDropdowns.forEach(function (li) {
        const toggleLink = li.querySelector(":scope > a");
        const sub = li.querySelector(":scope > ul.submenu");
        if (sub) {
          sub.style.display = "none";
          sub.style.transition = "all 0.3s ease";
        }

        // Create expand button if needed
        let expandBtn = li.querySelector(".mobile-expand-btn");
        if (!expandBtn) {
          expandBtn = document.createElement("button");
          expandBtn.type = "button";
          expandBtn.className = "mobile-expand-btn";
          expandBtn.setAttribute("aria-label", "Toggle Submenu");
          expandBtn.innerHTML = '<i class="fa-solid fa-chevron-down" style="font-size:11px; color:#D6B779;"></i>';
          expandBtn.style.cssText = "position:absolute; right:0; top:8px; width:36px; height:36px; background:rgba(214,183,121,0.1); border:1px solid rgba(214,183,121,0.25); border-radius:6px; color:#D6B779; cursor:pointer; display:flex; align-items:center; justify-content:center;";
          li.style.position = "relative";
          li.appendChild(expandBtn);
        }

        function toggleSubmenu(ev) {
          if (ev) ev.preventDefault();
          const isHidden = !sub || sub.style.display === "none" || !sub.style.display;
          if (sub) sub.style.display = isHidden ? "block" : "none";
          const icon = expandBtn.querySelector("i");
          if (icon) {
            icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
            icon.style.transition = "transform 0.25s ease";
          }
        }

        expandBtn.addEventListener("click", toggleSubmenu);
        if (toggleLink) {
          toggleLink.addEventListener("click", function (ev) {
            if (toggleLink.getAttribute("href") === "javascript:void(0)" || toggleLink.getAttribute("href") === "#") {
              toggleSubmenu(ev);
            }
          });
        }
      });
    }
  }

  // Ensure sanitization runs on window resize and when sidebar toggle is clicked
  window.addEventListener("resize", sanitizeMobileMenu);
  document.querySelectorAll(".sidebar__toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTimeout(sanitizeMobileMenu, 30);
    });
  });

  // Close offcanvas when clicking any navigation link inside it (except accordion expand toggles)
  if (mobileMenuContainer) {
    mobileMenuContainer.addEventListener("click", function (e) {
      const link = e.target.closest("a");
      if (
        link &&
        !link.classList.contains("mean-expand") &&
        !link.classList.contains("mobile-expand-btn")
      ) {
        const href = link.getAttribute("href");
        if (href && href !== "javascript:void(0)" && href !== "#" && !href.startsWith("#")) {
          closeOffcanvas();
        }
      }
    });
  }

  /* ==========================================================
     4. DESKTOP & GLOBAL DROPDOWN NAVIGATION INTERACTIVITY
     ========================================================== */
  const dropdownItems = document.querySelectorAll(".main-menu li.has-dropdown");

  dropdownItems.forEach(function (item) {
    const trigger = item.querySelector(":scope > a");
    if (!trigger) return;

    // Handle click on dropdown toggle (desktop or touchscreen)
    trigger.addEventListener("click", function (e) {
      if (window.innerWidth >= 1200) {
        if (trigger.getAttribute("href") === "javascript:void(0)" || trigger.getAttribute("href") === "#") {
          e.preventDefault();
          e.stopPropagation();
        }

        const isOpen = item.classList.contains("dropdown-open");

        // Close all other dropdowns
        dropdownItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove("dropdown-open");
          }
        });

        // Toggle current dropdown
        if (isOpen) {
          item.classList.remove("dropdown-open");
        } else {
          item.classList.add("dropdown-open");
        }
      }
    });

    // Support smooth hover on desktop
    item.addEventListener("mouseenter", function () {
      if (window.innerWidth >= 1200) {
        item.classList.add("dropdown-open");
      }
    });

    item.addEventListener("mouseleave", function () {
      if (window.innerWidth >= 1200) {
        item.classList.remove("dropdown-open");
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".main-menu li.has-dropdown")) {
      dropdownItems.forEach(function (item) {
        item.classList.remove("dropdown-open");
      });
    }
  });

  // Submenu link clicks close dropdown and navigate
  const submenuLinks = document.querySelectorAll(".main-menu .submenu a");
  submenuLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdownItems.forEach(function (item) {
        item.classList.remove("dropdown-open");
      });
    });
  });

  // Mobile MeanMenu Accordion Toggle
  if (typeof jQuery !== "undefined") {
    jQuery(document).on("click", ".mean-container .mean-nav ul li.has-dropdown > a, .mobile-menu .mean-nav ul li > a", function (e) {
      const $sub = jQuery(this).siblings("ul");
      if ($sub.length > 0) {
        e.preventDefault();
        $sub.slideToggle(250);
        const $expand = jQuery(this).siblings(".mean-expand");
        if ($expand.length) {
          let icon = $expand.find("i");
          if (icon.hasClass("fa-plus")) {
            icon.removeClass("fa-plus").addClass("fa-minus");
          } else if (icon.hasClass("fa-minus")) {
            icon.removeClass("fa-minus").addClass("fa-plus");
          } else if (icon.hasClass("fa-chevron-down")) {
            icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
          } else if (icon.hasClass("fa-chevron-up")) {
            icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
          }
          $expand.toggleClass("mean-clicked");
        }
      }
    });
  }

  /* ==========================================================
     5. PORTFOLIO FILTERING
     ========================================================== */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const portfolioItems = document.querySelectorAll(".portfolio-card-item, .portfolio-filter-item");

  if (filterBtns.length > 0 && portfolioItems.length > 0) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");

        const targetCategory = this.getAttribute("data-filter");

        portfolioItems.forEach(function (item) {
          const itemCat = item.getAttribute("data-category");
          if (targetCategory === "all" || itemCat === targetCategory || (targetCategory && item.classList.contains(targetCategory))) {
            item.style.display = "";
            setTimeout(function () {
              item.style.opacity = "1";
              item.style.transform = "scale(1)";
            }, 50);
          } else {
            item.style.opacity = "0";
            item.style.transform = "scale(0.95)";
            setTimeout(function () {
              item.style.display = "none";
            }, 300);
          }
        });
      });
    });
  }

  /* ==========================================================
     6. CONSULTATION / ENQUIRY FORM VALIDATION & CONFIRMATION
     (Managed with Cloud Firestore via firebase-enquiry.js)
     ========================================================== */
  const enquiryForm = document.getElementById("elevateEnquiryForm");
  const successBox = document.getElementById("elevateSuccessBox");

  // If Firebase module is loaded, it manages Firestore submission with live persistence
  if (enquiryForm && !window.__elevateFirebaseReady) {
    enquiryForm.addEventListener("submit", function (e) {
      if (window.__elevateFirebaseReady) return; // delegate to Firebase handler
      e.preventDefault();

      const name = document.getElementById("fullName");
      const email = document.getElementById("emailAddress");
      const phone = document.getElementById("phoneNumber");
      const eventType = document.getElementById("eventType");

      let isValid = true;
      let firstErrorField = null;

      function setError(field, condition) {
        if (!field) return;
        if (condition) {
          field.style.borderColor = "#ff4d4f";
          isValid = false;
          if (!firstErrorField) firstErrorField = field;
        } else {
          field.style.borderColor = "rgba(214, 183, 121, 0.4)";
        }
      }

      // Validations
      setError(name, !name || name.value.trim().length < 2);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setError(email, !email || !emailRegex.test(email.value.trim()));
      setError(phone, !phone || phone.value.trim().length < 6);
      setError(eventType, !eventType || eventType.value === "");

      if (!isValid) {
        if (firstErrorField) firstErrorField.focus();
        return;
      }

      // Show luxury confirmation feedback
      if (successBox) {
        successBox.style.display = "block";
        successBox.innerHTML = `
          <div style="background: rgba(214, 183, 121, 0.12); border: 1px solid #D6B779; border-radius: 12px; padding: 24px; text-align: center;">
            <i class="fa-solid fa-crown" style="font-size: 28px; color: #D6B779; margin-bottom: 12px;"></i>
            <h4 style="color: #F8F5EF; font-family: 'Playfair Display', serif; margin-bottom: 8px;">Consultation Request Received</h4>
            <p style="color: #D4D4D4; font-size: 15px; margin: 0; line-height: 1.6;">
              Thank you, <strong>${escapeHtml(name.value.trim())}</strong>. Your enquiry for a <strong>${escapeHtml(eventType.value)}</strong> has been registered with our Senior Concierge. We will curate a bespoke proposal and contact you within 24 hours.
            </p>
          </div>
        `;
        successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      // Reset form
      enquiryForm.reset();
    });
  }

  /* ==========================================================
     7. NEWSLETTER FORMS
     ========================================================== */
  const newsletterForms = document.querySelectorAll(".newsletter-form form, .footer-newsletter form");
  newsletterForms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = form.querySelector("input[type='text'], input[type='email']");
      if (input && input.value.includes("@")) {
        const btn = form.querySelector("button");
        if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        input.value = "Subscribed to Elevate Journal!";
        input.disabled = true;
        input.style.color = "#D6B779";
      } else if (input) {
        input.style.borderColor = "#ff4d4f";
        input.placeholder = "Please enter a valid email";
      }
    });
  });

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
  }

  /* ==========================================================
     8. ANIMATED STATS / METRIC COUNTERS (ALL PAGES)
     ========================================================== */
  const counterElements = document.querySelectorAll(".metric-number, .counter, .count-number, .about-floating-experience h3");

  function animateSingleCounter(el) {
    if (el.dataset.animated === "true") return;
    const originalText = el.textContent.trim();
    const isPercent = originalText.includes("%");
    const isPlus = originalText.includes("+");
    const target = parseFloat(originalText.replace(/[^0-9.]/g, ""));
    if (isNaN(target)) return;

    let current = 0;
    const duration = 1600;
    const steps = 45;
    const increment = target / steps;
    const stepTime = duration / steps;

    const timer = setInterval(function () {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      let formatted = isPercent ? current.toFixed(1) + "%" : Math.floor(current) + (isPlus ? "+" : "");
      el.textContent = formatted;
    }, stepTime);

    el.dataset.animated = "true";
  }

  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateSingleCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    counterElements.forEach(function (el) {
      counterObserver.observe(el);
    });
  } else {
    counterElements.forEach(animateSingleCounter);
  }

  /* ==========================================================
     10. MOBILE SMOOTH SCROLL & SCROLLTRIGGER RECALIBRATION
     ========================================================== */
  function refreshMobileScroll() {
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  }

  window.addEventListener("load", refreshMobileScroll);
  window.addEventListener("resize", refreshMobileScroll);

  const allImages = document.querySelectorAll("#smooth-content img, .elevate-hero img, .about-section img");
  allImages.forEach(function (img) {
    if (img.complete) return;
    img.addEventListener("load", refreshMobileScroll);
  });
});
