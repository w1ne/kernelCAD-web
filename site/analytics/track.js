/**
 * kernelCAD marketing analytics — Consent Mode v2 + GA4/Ads.
 * NO-OP while measurement IDs are unset. Loaded only after the consent
 * bootstrap in consent.js has set default denied.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'kc_consent_v1';
  var ATTR_KEY = 'kc_ads_attr_v1';
  var cfg = global.__KC_ADS__ || {};
  var ga4 = String(cfg.ga4 || '').trim();
  var aw = String(cfg.aw || '').trim();
  var enabled = Boolean(ga4 || aw);

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        choice: choice,
        ts: Date.now(),
      }));
    } catch (e) { /* private mode */ }
  }

  function captureAttribution() {
    try {
      var params = new URLSearchParams(global.location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
      var out = {};
      var hit = false;
      for (var i = 0; i < keys.length; i++) {
        var v = params.get(keys[i]);
        if (v) { out[keys[i]] = v; hit = true; }
      }
      if (!hit) return readAttribution();
      out.landed_at = Date.now();
      out.landed_path = global.location.pathname + global.location.search;
      sessionStorage.setItem(ATTR_KEY, JSON.stringify(out));
      localStorage.setItem(ATTR_KEY, JSON.stringify(out));
      return out;
    } catch (e) {
      return {};
    }
  }

  function readAttribution() {
    try {
      var raw = sessionStorage.getItem(ATTR_KEY) || localStorage.getItem(ATTR_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  /** Append stored utm_*/gclid onto an app.kernelcad.com URL. */
  function withAttribution(url) {
    try {
      var u = new URL(url, global.location.origin);
      if (!/\.kernelcad\.com$/i.test(u.hostname) && u.hostname !== 'localhost') return url;
      var attr = readAttribution();
      Object.keys(attr).forEach(function (k) {
        if (k === 'landed_at' || k === 'landed_path') return;
        if (!u.searchParams.has(k) && attr[k] != null) u.searchParams.set(k, String(attr[k]));
      });
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function ensureDataLayer() {
    global.dataLayer = global.dataLayer || [];
    if (!global.gtag) {
      global.gtag = function () { global.dataLayer.push(arguments); };
    }
  }

  function setConsentDefault() {
    if (!enabled) return;
    ensureDataLayer();
    global.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    });
  }

  function updateConsent(granted) {
    if (!enabled) return;
    ensureDataLayer();
    var state = granted ? 'granted' : 'denied';
    global.gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
  }

  var scriptLoaded = false;
  function loadTags() {
    if (!enabled || scriptLoaded) return;
    scriptLoaded = true;
    ensureDataLayer();
    global.gtag('js', new Date());
    if (ga4) global.gtag('config', ga4, { send_page_view: true, anonymize_ip: true });
    if (aw) global.gtag('config', aw);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4 || aw);
    document.head.appendChild(s);
  }

  function track(name, params) {
    if (!enabled) return;
    var consent = readConsent();
    if (!consent || consent.choice !== 'accepted') return;
    ensureDataLayer();
    var payload = Object.assign({}, readAttribution(), params || {});
    // Never send prompt text unless explicitly allowed by caller + consent.
    global.gtag('event', name, payload);
  }

  function needsBanner() {
    if (!enabled) return false;
    // EEA/UK heuristic: Europe/* timezones + GB/IE locales. Banner also
    // shows when we cannot tell (fail closed for Ads).
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      var lang = (navigator.language || '').toLowerCase();
      if (/^Europe\//.test(tz) || tz === 'Atlantic/Reykjavik') return true;
      if (/(^|-)(gb|uk|ie|de|fr|es|it|nl|be|at|pl|pt|se|fi|dk|no|cz|ro|hu|gr|bg|hr|sk|si|lt|lv|ee|lu|mt|cy)(-|$)/.test(lang)) return true;
      // Unknown region → show banner (fail closed) when tags configured.
      return true;
    } catch (e) {
      return true;
    }
  }

  function accept() {
    writeConsent('accepted');
    updateConsent(true);
    loadTags();
    track('ads_land', { engagement_type: 'consent_accept' });
  }

  function reject() {
    writeConsent('rejected');
    updateConsent(false);
  }

  function boot() {
    var attr = captureAttribution();
    setConsentDefault();
    var consent = readConsent();
    if (!enabled) return { enabled: false, attr: attr };
    if (consent && consent.choice === 'accepted') {
      updateConsent(true);
      loadTags();
      if (attr.gclid || attr.utm_source) track('ads_land', { engagement_type: 'return' });
    } else if (consent && consent.choice === 'rejected') {
      updateConsent(false);
    } else if (!needsBanner()) {
      // Non-EEA path reserved; currently needsBanner always true when enabled.
      accept();
    }
    return { enabled: true, attr: attr, consent: consent };
  }

  // Rewrite app links so utm/gclid survive site → app.
  function wireAppLinks() {
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href) return;
      if (!/app\.kernelcad\.com/i.test(href) && href.charAt(0) !== '/') return;
      if (!/app\.kernelcad\.com/i.test(href)) return;
      var next = withAttribution(href);
      if (next !== href) a.setAttribute('href', next);
    }, true);
    document.querySelectorAll('a[href*="app.kernelcad.com"], form[action*="app.kernelcad.com"]').forEach(function (el) {
      if (el.tagName === 'A') {
        el.setAttribute('href', withAttribution(el.getAttribute('href')));
      } else if (el.tagName === 'FORM') {
        el.setAttribute('action', withAttribution(el.getAttribute('action')));
      }
    });
  }

  global.kcAds = {
    boot: boot,
    accept: accept,
    reject: reject,
    track: track,
    needsBanner: needsBanner,
    readConsent: readConsent,
    withAttribution: withAttribution,
    readAttribution: readAttribution,
    enabled: function () { return enabled; },
    wireAppLinks: wireAppLinks,
    STORAGE_KEY: STORAGE_KEY,
    ATTR_KEY: ATTR_KEY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
