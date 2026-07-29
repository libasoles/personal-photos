/*
Tooplate 2160 Exhibit Studio
https://www.tooplate.com/view/2160-exhibit-studio
Free HTML CSS Template
*/

(function () {
      'use strict';

      /* ─────────────────────────────────────────────────────────────
         HAMBURGER MENU
         ───────────────────────────────────────────────────────────── */
      var hamburger  = document.getElementById('js-hamburger');
      var mobileMenu = document.getElementById('js-mobile-menu');

      if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', function () {
          var isOpen = mobileMenu.classList.toggle('is-open');
          hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          hamburger.setAttribute('aria-label',    isOpen ? 'Close menu' : 'Open menu');
          mobileMenu.setAttribute('aria-hidden',  isOpen ? 'false' : 'true');
        });

        /* Close mobile menu when a link inside it is clicked */
        mobileMenu.addEventListener('click', function (e) {
          if (e.target.tagName === 'A') {
            mobileMenu.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('aria-label', 'Open menu');
            mobileMenu.setAttribute('aria-hidden', 'true');
          }
        });
      }

      /* ─────────────────────────────────────────────────────────────
         COLLECT ALL GALLERY ITEMS
         items is rebuilt when the filter changes, so the lightbox
         counter and navigation always reflect the visible set.
         ───────────────────────────────────────────────────────────── */
      const gallery    = document.getElementById('js-gallery');
      const lightbox   = document.getElementById('js-lightbox');
      const lbImage    = document.getElementById('js-lb-image');
      const lbCounter  = document.getElementById('js-lb-counter');
      const lbTitle    = document.getElementById('js-lb-title');
      const lbMeta     = document.getElementById('js-lb-meta');
      const lbClose    = document.getElementById('js-lb-close');
      const lbPrev     = document.getElementById('js-lb-prev');
      const lbNext     = document.getElementById('js-lb-next');
      const photoCount = document.getElementById('js-photo-count');

      let visibleItems  = [];   // Currently visible gallery items
      let currentIndex  = 0;   // Active index in the lightbox

      /* ─────────────────────────────────────────────────────────────
         BUILD VISIBLE ITEM LIST
         ───────────────────────────────────────────────────────────── */
      function buildVisibleList (filter) {
        const all = Array.from(gallery.querySelectorAll('.gallery__item'));
        visibleItems = filter === 'all'
          ? all
          : all.filter(el => el.dataset.category === filter);

        /* Update the hero photo count to reflect the filter */
        if (photoCount) {
          photoCount.textContent = visibleItems.length + ' Photograph' +
            (visibleItems.length === 1 ? '' : 's');
        }
      }

      /* ─────────────────────────────────────────────────────────────
         OPEN LIGHTBOX
         ───────────────────────────────────────────────────────────── */
      function openLightbox (index) {
        currentIndex = index;
        updateLightbox();
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';   /* Prevent page scroll */
        lbClose.focus();
      }

      /* ─────────────────────────────────────────────────────────────
         CLOSE LIGHTBOX
         ───────────────────────────────────────────────────────────── */
      function closeLightbox () {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
      }

      /* ─────────────────────────────────────────────────────────────
         UPDATE LIGHTBOX CONTENT  (called on open + navigation)
         ───────────────────────────────────────────────────────────── */
      function updateLightbox () {
        const item = visibleItems[currentIndex];
        if (!item) return;

        const fullSrc = item.dataset.full || item.querySelector('.gallery__image').src;
        const title   = item.dataset.title || '';
        const meta    = item.dataset.meta  || '';

        /* Fade out → swap src → fade in */
        lbImage.classList.add('is-loading');

        const img = new Image();
        img.onload = function () {
          lbImage.src = fullSrc;
          lbImage.alt = title;
          lbImage.classList.remove('is-loading');
        };
        img.src = fullSrc;

        lbTitle.textContent   = title;
        lbMeta.textContent    = meta;
        lbCounter.textContent = (currentIndex + 1) + ' / ' + visibleItems.length;

        /* Hide prev/next buttons at the ends */
        lbPrev.style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
        lbNext.style.visibility = currentIndex === visibleItems.length - 1 ? 'hidden' : 'visible';
      }

      /* ─────────────────────────────────────────────────────────────
         NAVIGATE
         ───────────────────────────────────────────────────────────── */
      function goTo (delta) {
        const next = currentIndex + delta;
        if (next >= 0 && next < visibleItems.length) {
          currentIndex = next;
          updateLightbox();
        }
      }

      /* ─────────────────────────────────────────────────────────────
         GALLERY CLICK DELEGATION
         ───────────────────────────────────────────────────────────── */
      gallery.addEventListener('click', function (e) {
        const item = e.target.closest('.gallery__item');
        if (!item) return;

        /* Only open if the item is currently visible */
        const index = visibleItems.indexOf(item);
        if (index !== -1) openLightbox(index);
      });

      /* ─────────────────────────────────────────────────────────────
         LIGHTBOX CONTROLS
         ───────────────────────────────────────────────────────────── */
      lbClose.addEventListener('click', closeLightbox);
      lbPrev.addEventListener ('click', function () { goTo(-1); });
      lbNext.addEventListener ('click', function () { goTo(+1); });

      /* Click the backdrop (outside the image) to close */
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target === lightbox.querySelector('.lightbox__stage')) {
          closeLightbox();
        }
      });

      /* Keyboard navigation */
      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape')      closeLightbox();
        if (e.key === 'ArrowLeft')   goTo(-1);
        if (e.key === 'ArrowRight')  goTo(+1);
      });

      /* ─────────────────────────────────────────────────────────────
         FILTER LOGIC
         ───────────────────────────────────────────────────────────── */
      const filterBar  = document.querySelector('.gallery-filter');
      const filterBtns = filterBar ? filterBar.querySelectorAll('.filter__btn') : [];

      filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {

          /* Update active class */
          filterBtns.forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');

          const filter = btn.dataset.filter || 'all';

          /* Show / hide items */
          const allItems = Array.from(gallery.querySelectorAll('.gallery__item'));
          allItems.forEach(function (item) {
            if (filter === 'all' || item.dataset.category === filter) {
              item.style.display = '';
            } else {
              item.style.display = 'none';
            }
          });

          /* Rebuild visible list for lightbox navigation */
          buildVisibleList(filter);
        });
      });

      


      /* ─────────────────────────────────────────────────────────────
         CONTACT FORM — client-side validation
         ─────────────────────────────────────────────────────────────
         This form validates on the client side only. To actually send
         messages you need a backend service such as:
           • Formspree  — set action="https://formspree.io/f/YOUR_ID"
           • Netlify Forms — add data-netlify="true" to the <form>
           • EmailJS   — call emailjs.sendForm() in the submit handler
         ───────────────────────────────────────────────────────────── */
      var form       = document.getElementById('js-contact-form');
      var submitBtn  = document.getElementById('js-submit-btn');
      var successMsg = document.getElementById('js-success');
      var errorMsg   = document.getElementById('js-error');

      if (!form) return;

      /* Helper: validate a single field */
      function validateField (input, errorEl) {
        var valid = input.validity.valid;
        if (!valid) {
          input.classList.add('is-invalid');
          errorEl.classList.add('is-visible');
        } else {
          input.classList.remove('is-invalid');
          errorEl.classList.remove('is-visible');
        }
        return valid;
      }

      /* Live validation on blur */
      var nameInput    = document.getElementById('field-name');
      var emailInput   = document.getElementById('field-email');
      var messageInput = document.getElementById('field-message');

      nameInput.addEventListener   ('blur', function () { validateField(nameInput,    document.getElementById('err-name'));    });
      emailInput.addEventListener  ('blur', function () { validateField(emailInput,   document.getElementById('err-email'));   });
      messageInput.addEventListener('blur', function () { validateField(messageInput, document.getElementById('err-message')); });

      /* Clear errors on input after they've been shown */
      [nameInput, emailInput, messageInput].forEach(function (el) {
        el.addEventListener('input', function () {
          if (el.classList.contains('is-invalid') && el.validity.valid) {
            el.classList.remove('is-invalid');
            var errId = 'err-' + el.id.replace('field-', '');
            var errEl = document.getElementById(errId);
            if (errEl) errEl.classList.remove('is-visible');
          }
        });
      });

      /* Submit handler */
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        /* Validate all required fields */
        var n = validateField(nameInput,    document.getElementById('err-name'));
        var em = validateField(emailInput,  document.getElementById('err-email'));
        var m = validateField(messageInput, document.getElementById('err-message'));

        if (!n || !em || !m) return;

        /* ── TO CONNECT A REAL BACKEND ──────────────────────────────
           Replace the simulated timeout below with a real fetch():

           submitBtn.disabled = true;
           submitBtn.textContent = 'Sending…';

           fetch('https://formspree.io/f/YOUR_FORM_ID', {
             method:  'POST',
             headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
             body:    JSON.stringify({
               name:    nameInput.value,
               email:   emailInput.value,
               subject: document.getElementById('field-subject').value,
               message: messageInput.value
             })
           })
           .then(function (res) {
             if (res.ok) { showSuccess(); } else { showError(); }
           })
           .catch(showError)
           .finally(function () { submitBtn.disabled = false; });
           ───────────────────────────────────────────────────────── */

        /* Simulate a successful send for the template demo */
        submitBtn.disabled     = true;
        submitBtn.textContent  = 'Sending…';
        successMsg.style.display = 'none';
        errorMsg.style.display   = 'none';

        setTimeout(function () {
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Send message';
          successMsg.classList.add('is-success');
          successMsg.style.display = '';
          form.reset();
        }, 1200);
      });


      /* ─────────────────────────────────────────────────────────────
         INIT
         ───────────────────────────────────────────────────────────── */
      buildVisibleList('all');

    })();