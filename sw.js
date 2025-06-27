// sw.js - Enhanced Service Worker with Push Notifications
const CACHE_NAME = 'cricstreamzone-v1.0.6';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js',
  'https://i.postimg.cc/3rPWWckN/icon-192.png',
  'https://i.postimg.cc/BvWg87Rd/videocam-24dp-E3-E3-E3-FILL0-wght400-GRAD0-opsz24.png',
  'https://i.postimg.cc/K8JDvvxs/live-tv-24dp-E3-E3-E3-FILL0-wght400-GRAD0-opsz24.png',
  'https://i.postimg.cc/YC472jwd/radio-24dp-E3-E3-E3-FILL0-wght400-GRAD0-opsz24.png'
];

// Install event
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event with network-first strategy for API calls
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network-first for API calls
  if (url.hostname.includes('script.google.com') || url.pathname.includes('api')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response before caching
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          });
        })
    );
  }
});

// Enhanced Push notification event
self.addEventListener('push', event => {
  console.log('📬 Push notification received');
  
  let notificationData = {
    title: 'CricStreamZone',
    body: 'New cricket match update!',
    icon: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
    badge: 'https://i.postimg.cc/3rPWWckN/icon-192.png'
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: Math.random(),
      url: notificationData.url || '/',
      matchData: notificationData.matchData || null
    },
    actions: [
      {
        action: 'watch',
        title: '📺 Watch Live',
        icon: 'https://i.postimg.cc/BvWg87Rd/videocam-24dp-E3-E3-E3-FILL0-wght400-GRAD0-opsz24.png'
      },
      {
        action: 'remind',
        title: '⏰ Remind Me',
        icon: 'https://i.postimg.cc/YC472jwd/radio-24dp-E3-E3-E3-FILL0-wght400-GRAD0-opsz24.png'
      },
      {
        action: 'dismiss',
        title: '❌ Dismiss',
        icon: 'https://i.postimg.cc/K8JDvvxs/live-tv-24dp-E3-E3-E3-FILL0-wght400-GRAD0-opsz24.png'
      }
    ],
    requireInteraction: true,
    silent: false,
    tag: 'cricket-match-' + (notificationData.matchId || 'general'),
    renotify: true,
    timestamp: Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('✅ Notification shown successfully');
      })
      .catch(error => {
        console.error('❌ Failed to show notification:', error);
      })
  );
});

// Enhanced Notification click event
self.addEventListener('notificationclick', event => {
  console.log('🖱️ Notification clicked:', event.action);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'watch') {
    // Open app and focus on live matches
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Check if app is already open
          for (let client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.focus();
              client.postMessage({
                action: 'showLiveMatches',
                data: event.notification.data
              });
              return;
            }
          }
          // Open new window if app is not open
          return clients.openWindow(urlToOpen + '?action=watch');
        })
    );
  } else if (event.action === 'remind') {
    // Set reminder for 5 minutes
    console.log('⏰ Setting reminder for 5 minutes');
    setTimeout(() => {
      self.registration.showNotification('🔔 Cricket Match Reminder', {
        body: 'Don\'t forget to check the live match!',
        icon: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
        tag: 'reminder'
      });
    }, 5 * 60 * 1000); // 5 minutes
  } else if (event.action === 'dismiss') {
    // Just close the notification
    console.log('❌ Notification dismissed');
  } else {
    // Default action - open app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-matches') {
    event.waitUntil(
      fetch('https://script.google.com/macros/s/AKfycbxzx4xcwEGidoxEd7BQshkR9FKHjK5o0p8ukNY4NsKNR0EsShY7eV3MUxA2iXz1V8bmHg/exec')
        .then(response => response.json())
        .then(data => {
          console.log('📊 Background sync completed, matches updated');
          // Store updated data in cache
          return caches.open(CACHE_NAME).then(cache => {
            cache.put('matches-data', new Response(JSON.stringify(data)));
          });
        })
        .catch(error => {
          console.error('❌ Background sync failed:', error);
        })
    );
  }
});

// Skip waiting message
self.addEventListener('message', event => {
  console.log('💬 Message received:', event.data);
  
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data && event.data.action === 'scheduleNotification') {
    // Handle notification scheduling from main thread
    const { title, body, delay, matchData } = event.data;
    
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        icon: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
        badge: 'https://i.postimg.cc/3rPWWckN/icon-192.png',
        vibrate: [200, 100, 200],
        data: { matchData },
        actions: [
          { action: 'watch', title: '📺 Watch Live' },
          { action: 'dismiss', title: '❌ Dismiss' }
        ]
      });
    }, delay);
  }
});

// Handle notification close event
self.addEventListener('notificationclose', event => {
  console.log('🔕 Notification closed:', event.notification.tag);
});

// Error handling
self.addEventListener('error', event => {
  console.error('❌ Service Worker error:', event.error);
});

// Unhandled promise rejection
self.addEventListener('unhandledrejection', event => {
  console.error('❌ Unhandled promise rejection in SW:', event.reason);
  event.preventDefault();
});

console.log('🎯 CricStreamZone Service Worker loaded successfully');
