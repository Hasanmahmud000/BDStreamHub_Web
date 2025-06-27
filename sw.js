// sw.js
const CACHE_NAME = 'cricstreamzone-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js',
  'https://i.postimg.cc/3rPWWckN/icon-192.png'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background sync for notifications
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-notification-check') {
    event.waitUntil(checkMatchesInBackground());
  }
});

// Message event for skip waiting
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Background notification check
async function checkMatchesInBackground() {
  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbxzx4xcwEGidoxEd7BQshkR9FKHjK5o0p8ukNY4NsKNR0EsShY7eV3MUxA2iXz1V8bmHg/exec');
    const data = await response.json();
    const matches = data.matches || [];
    
    const now = new Date();
    
    matches.forEach(match => {
      const matchTime = new Date(match.MatchTime);
      const timeDiff = matchTime - now;
      
      // Notify 15 minutes before match starts
      if (timeDiff > 0 && timeDiff <= 15 * 60 * 1000) {
        self.registration.showNotification('🏏 Match Starting Soon!', {
          body: `${match.Team1} vs ${match.Team2} starts in 15 minutes`,
          icon: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
          badge: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
          tag: `match-${match.Team1}-${match.Team2}-15min`,
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'Watch Now'
            }
          ]
        });
      }
      
      // Notify when match starts
      if (timeDiff > -60000 && timeDiff <= 0) {
        self.registration.showNotification('🔴 Match Started!', {
          body: `${match.Team1} vs ${match.Team2} is now LIVE!`,
          icon: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
          badge: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
          tag: `match-${match.Team1}-${match.Team2}-start`,
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'Watch Live'
            }
          ]
        });
      }
    });
  } catch (error) {
    console.error('Background notification check failed:', error);
  }
}

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
