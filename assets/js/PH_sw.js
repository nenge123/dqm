var CACHE_NAME = 'v1';
var urlsToCache = [
    '../../PH.html',
    '../../favicon.ico',
    'common.min.js',
    'PH.min.js',
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
        console.log('activate');
        self.clients.claim();
        event.waitUntil(
            caches.keys().then(
                cacheNames=>{
                    return Promise.all(
                        cacheNames.map(cacheName=>{
                            console.log(cacheName);
                            if(CACHE_NAME != cacheName){
                                return caches.delete(cacheName);
                            }
                        })
                    )
                }
            )
        );
    },
    fetch(event){
        console.log('fetch',event);
        event.respondWith(
            caches.match(event.request, {
                ignoreSearch: true
            }).then(function (response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                console.log('cache miss', event.request.url)
                return fetch(event.request);
            })
        );
    },
    message(event){
        console.log(event.data);
    }
};
self.addEventListener('fetch',e=>console.log(e));
Object.entries(eventFunc).forEach(
    entry=>{
        self.addEventListener(entry[0],event=>entry[1](event));
    }
);