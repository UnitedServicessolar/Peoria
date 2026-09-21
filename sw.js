/* Peoria — Reporte Diario — service worker.
 *
 * Two jobs:
 *   1. the app opens instantly and works with no signal
 *   2. a new release actually reaches the phone
 *
 * BUILD is the whole versioning scheme. Bump it on every release and the old
 * cache is thrown away on the next open. Forget to bump it and phones keep
 * serving yesterday's app — that is the classic PWA trap.
 */
var BUILD = "1.0";
var CACHE = "peoria-daily-" + BUILD;

/* Only the shell. Reports live in Firestore, which does its own offline work. */
var SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

/* The Firebase SDK is cached too, so a phone with no signal still boots the
   app rather than hanging on a script that will never arrive. */
var VENDOR = [
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* Shell must succeed; vendor is best-effort so one bad CDN response
         cannot stop the install and leave the phone with no app at all. */
      return c.addAll(SHELL).then(function () {
        return Promise.all(VENDOR.map(function (u) {
          return c.add(new Request(u, { mode: "cors" })).catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  /* Never touch Firestore or Auth traffic — the SDK handles its own offline
     queue and a cached response here would corrupt it. */
  if (/firestore\.googleapis\.com|identitytoolkit|googleapis\.com\/identitytoolkit|firebaseinstallations/.test(url.href)) {
    return;
  }

  /* Navigations: network first so a new release is picked up, cache as the
     fallback so a dead spot still opens the app. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) {
          return r || caches.match("./");
        });
      })
    );
    return;
  }

  /* Everything else: cache first, then network, and remember what comes back. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return hit;
      });
    })
  );
});
