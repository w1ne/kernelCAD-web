/**
 * Renders the Consent Mode v2 banner for EEA/UK (and fail-closed elsewhere
 * when tags are configured). Depends on site/analytics/track.js.
 */
(function () {
  'use strict';
  if (!window.kcAds || !window.kcAds.enabled()) return;

  var boot = window.kcAds.boot();
  window.kcAds.wireAppLinks();

  var consent = window.kcAds.readConsent();
  if (consent) return; // already chose
  if (!window.kcAds.needsBanner()) return;

  var root = document.createElement('div');
  root.className = 'kc-consent';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Cookie consent');
  root.innerHTML =
    '<div class="kc-consent__inner">' +
      '<p class="kc-consent__copy">We use cookies for product analytics and ads measurement if you allow it. ' +
      'See <a href="/privacy.html">Privacy</a>.</p>' +
      '<div class="kc-consent__actions">' +
        '<button type="button" class="kc-consent__btn kc-consent__btn--reject" data-kc-consent="reject">Reject</button>' +
        '<button type="button" class="kc-consent__btn kc-consent__btn--accept" data-kc-consent="accept">Accept</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  root.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute('data-kc-consent');
    if (act === 'accept') {
      window.kcAds.accept();
      root.hidden = true;
    } else if (act === 'reject') {
      window.kcAds.reject();
      root.hidden = true;
    }
  });
})();
