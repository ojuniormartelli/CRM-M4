// Basic Service Worker for PWA
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // Pass-through
  event.respondWith(fetch(event.request));
});
