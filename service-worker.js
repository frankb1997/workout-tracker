const CACHE_NAME = 'workout-tracker-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

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
});
```

4. **Save as:**
   - File → Save As
   - Name: `service-worker.js` (exactly, all lowercase)
   - Location: Same folder as your other files
   - **IMPORTANT:** Uncheck "If no extension is provided, use .txt"
   - Click Save

5. **Verify the filename:**
   - In Finder, make sure it shows `service-worker.js`
   - NOT `service-worker.js.txt`

---

## **Your folder should now have all 7 files:**
```
✅ index.html
✅ styles.css
✅ app.js
✅ manifest.json
✅ service-worker.js
✅ icon-192.png
✅ icon-512.png