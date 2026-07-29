/*
  gallery.js — renderiza la galería a partir de photos.json
  ---------------------------------------------------------
  Sustituye el grid estático del template original. El manifest
  (photos.json) es la única fuente de verdad: para añadir o quitar
  fotos no hace falta tocar el HTML.

  Orden de arranque:
    1. fetch de photos.json
    2. se pintan filtros + items en el DOM
    3. se inyecta tooplate-exhibit-script.js (lightbox, filtros, nav)

  El paso 3 va al final a propósito: el script del template lee el DOM
  una sola vez al cargarse, así que tiene que correr con los items ya puestos.
*/
(function () {
  'use strict';

  var MANIFEST = 'photos.json';
  var TEMPLATE_SCRIPT = 'tooplate-exhibit-script.js';

  var gallery = document.getElementById('js-gallery');
  var filterBar = document.getElementById('js-filter');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getAlbumId(p) {
    return String(p.album || p.id || '').slice(0, 4);
  }

  // Álbumes presentes en las fotos, de más reciente a más antiguo.
  function collectAlbumsFromPhotos(photos) {
    var set = {};
    photos.forEach(function (p) { set[getAlbumId(p)] = true; });
    return Object.keys(set).sort().reverse();
  }

  function normalizeAlbums(albums, photos) {
    if (albums && albums.length) {
      return albums
        .map(function (album) {
          return {
            id: String(album.id || '').trim(),
            label: String(album.label || album.id || '').trim()
          };
        })
        .filter(function (album) { return album.id; })
        .sort(function (a, b) { return b.id.localeCompare(a.id); });
    }

    return collectAlbumsFromPhotos(photos).map(function (albumId) {
      return { id: albumId, label: albumId };
    });
  }

  function defaultAlbum(albums) {
    return albums && albums.length ? albums[0].id : '';
  }

  function renderFilters(albums, active) {
    if (!filterBar || !albums || !albums.length) return;
    filterBar.innerHTML = albums.map(function (album) {
      return '<button class="filter__btn' + (album.id === active ? ' is-active' : '') +
             '" data-filter="' + esc(album.id) + '">' + esc(album.label) + '</button>';
    }).join('');
  }

  function renderPhoto(p) {
    return [
      '<div class="gallery__item" data-year="' + esc(getAlbumId(p)) + '"',
      '     data-full="' + esc(p.full || p.thumb) + '"',
      '     data-title="' + esc(p.title) + '"',
      '     data-meta="' + esc(p.meta) + '">',
      '  <img src="' + esc(p.thumb) + '"',
      '       width="' + esc(p.width || 600) + '" height="' + esc(p.height || 400) + '"',
      '       alt="' + esc(p.alt || p.title) + '"',
      '       class="gallery__image" loading="lazy" />',
      '  <div class="gallery__caption">',
      '    <span class="gallery__caption-title">' + esc(p.title) + '</span>',
      '    <span class="gallery__caption-meta">' + esc(p.meta) + '</span>',
      '  </div>',
      '  <div class="gallery__expand-icon" aria-hidden="true">',
      '    <svg viewBox="0 0 12 12" stroke-width="1.5"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8"/></svg>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function applySiteText(site) {
    if (!site) return;
    var map = {
      'js-hero-tag': site.heroTag,
      'js-hero-desc': site.heroDesc,
      'js-footer-brand': site.footerBrand
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && map[id]) el.textContent = map[id];
    });

    // El wordmark lleva un <span> dentro, así que solo se toca el nodo de texto.
    var wordmark = document.getElementById('js-wordmark');
    if (wordmark && site.wordmark && wordmark.firstChild) {
      wordmark.firstChild.nodeValue = site.wordmark + ' ';
    }
    var suffix = document.getElementById('js-wordmark-suffix');
    if (suffix && site.wordmarkSuffix) suffix.textContent = site.wordmarkSuffix;
    var title = document.getElementById('js-hero-title');
    if (title && site.heroTitleTop) {
      title.innerHTML = esc(site.heroTitleTop) + '<br><strong>' + esc(site.heroTitleBottom || '') + '</strong>';
    }
  }

  function loadTemplateScript() {
    var s = document.createElement('script');
    s.src = TEMPLATE_SCRIPT;
    document.body.appendChild(s);
  }

  function showError(msg) {
    if (!gallery) return;
    gallery.innerHTML = '<p style="grid-column:1/-1;padding:2rem;opacity:.7;line-height:1.6">' +
      esc(msg) + '</p>';
    loadTemplateScript();
  }

  fetch(MANIFEST, { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      var photos = data.photos || [];
      var albums = normalizeAlbums(data.albums, photos);
      var active = defaultAlbum(albums);
      applySiteText(data.site);
      renderFilters(albums, active);
      gallery.innerHTML = photos.map(renderPhoto).join('\n');

      var count = document.getElementById('js-photo-count');
      if (count) count.textContent = photos.length + (photos.length === 1 ? ' foto' : ' fotos');

      loadTemplateScript();
    })
    .catch(function (err) {
      // Causa habitual: abrir index.html con doble clic (file://), donde
      // fetch está bloqueado por CORS. Hay que servirlo por HTTP.
      showError(
        'No se pudo cargar photos.json (' + err.message + '). ' +
        'Si has abierto el archivo directamente, arranca un servidor local: ' +
        'python3 -m http.server 8000 y entra en http://localhost:8000'
      );
    });
})();
