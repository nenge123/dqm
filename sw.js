var CACHE_PREX = 'DQM_';
var CACHE_NAME = CACHE_PREX+'v2';//if you have any version update change here
var CACHE_PATH = serviceWorker.scriptURL.split('/').slice(0,-1).join('/')+'/';
var urlsToCache = [//set some cache path or file,but it not important you can not set it ,change "fetch(event)"
    'favicon.ico',
    'assets/dqm.png',
    'assets/js/common.min.js',
    'assets/js/PH.js',
    'assets/gba.png',
    'assets/js/SkyEmu.js',
    'assets/js/SkyEmu_fix.js',
    'assets/js/NengeDisk.js',

    'ph/',
    'ph/index.html',
    'ph/manifest.json',

    'SkyEmu/',
    'SkyEmu/index.html',
    'SkyEmu/manifest.json',
];
Object.entries(
    {
        install(event){
            //注册,如果本脚本发生改变 会重新注册
            console.log('serviceWorker install');
            return self.skipWaiting();//跳过等待
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
            //激活变化 初始化
            //清空特定数据const cache = await caches.open(CACHE_NAME);cache.delete(url);
            console.log('serviceWorker activate');
            event.waitUntil(
                caches.keys().then(function (cacheNames) {
                    return Promise.all(
                        cacheNames.map(function (cacheName) {
                            if (CACHE_NAME != cacheName&&cacheName.includes(CACHE_PREX)) {
                                //移除特定旧缓存数据库
                                return caches.delete(cacheName);
                            }
                        })
                    );
                })
            );
        },
        fetch(event){
            //拦截请求 event.request 一个请求对象
            return event.respondWith(new Promise(async resolve=>{
                var url = event.request.url.replace(CACHE_PATH,''),cacheTime;
                var response = await caches.match(event.request);
                if(navigator.onLine){
                    //联网状态
                    if(response){
                        //new Date()  - Date.parse(response.headers.get('date'))>86400
                        //fetch(event.request).then(async res=>await caches.open(CACHE_NAME).put(event.request, res.clone())) 后台更新
                    }
                    if(!response){
                        response =  await fetch(event.request);
                        if(urlsToCache.includes(event.request.url.replace(CACHE_PATH,''))){
                            const cache = await caches.open(CACHE_NAME);
                            console.log('[Service Worker] Caching new resource: ' + url);
                            cache.put(event.request, response.clone());
                        }
                    }
                }
                resolve(response);

            }));
        },
        message(event){
            console.log(event.data);
        }
    }
).forEach(
    entry=>{
        self.addEventListener(entry[0],entry[1]);
    }
);