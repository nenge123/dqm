var CACHE_NAME = 'v3';
var urlsToCache = [
    './PH.html',
    './favicon.ico',
    './manifest_PH.json',
    './assets/dqm.png',
    './assets/js/common.min.js',
    './assets/js/PH.min.js',
];
const eventFunc = {
    install(event){
        console.log('install',event);
        //self.skipWaiting();//跳过等待
        event.waitUntil(
            caches.open(CACHE_NAME).then(
                cache=>cache.addAll(urlsToCache)
            ).then(() => {
                console.log('Cache downloaded',caches)
                self.skipWaiting()
            })
        );
    },
    activate(event){
        console.log('activated, remove unused cache...')
        var cacheAllowlist = [CACHE_NAME];
        event.waitUntil(
            caches.keys().then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        if (cacheAllowlist.indexOf(cacheName) === -1) {
                            console.log(cacheName)
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    },
    fetch(event){
        console.log('fetch');
        event.respondWith(
            caches.match(event.request).then(function (response) {
                console.log(response&&response.url);
                return response||fetch(event.request).then( async (response)=>{
                    return response;
                    if(!/(\?|\.zip|assets\/data\/)/.test(event.request.url)){
                        //filter ?242432 file block save
                        const cache = await caches.open(CACHE_NAME);
                        console.log('[Service Worker] Caching new resource: ' + event.request.url);
                        cache.put(event.request, response.clone());
                    }
                })
            })
        );
    },
    message(event){
        console.log(event.data);
    }
};
Object.entries(eventFunc).forEach(
    entry=>{
        self.addEventListener(entry[0],event=>entry[1](event));
    }
);