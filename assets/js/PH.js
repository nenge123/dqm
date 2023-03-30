var T = Nenge,I=T.I,F=T.F,urllist={},files={};
function getUrl(path){
    if(urllist[path])return urllist[path];
    if(files[path]){
        urllist[path] = F.URL(files[path],F.getExt(path));
        delete files[path];
        return urllist[path];
    }
    return path;
}
(async function(){
    files = await Nenge.FetchItem({
        url:'https://cdn.jsdelivr.net/gh/nenge123/dqm@master/assets/data/pic.zip',
        store:T.LibStore,
        unpack:true,
        process:e=>T.$('#status').innerHTML = e,
    });
    await T.addJS(`:root{
        --pic-sl:url(${getUrl('pic/sl.gif')}) no-repeat;
        --pic-ss:url(${getUrl('pic/ss.gif')}) no-repeat;
        --pic-ml:url(${getUrl('pic/ml.gif')}) no-repeat;
    }`+I.decode(files['style.min.css']),null,!0);
    await T.addJS(files['dqm.min.js']);
    delete files['style.min.css'];
    delete files['dqm.min.js'];
    T.$append(document.head,T.$ct('link',null,null,{
        rel:"apple-touch-icon",
        href:getUrl('dqm.png')
    }));
    T.$append(document.head,T.$ct('link',null,null,{
        rel:"icon",
        href:getUrl('dqm.png'),
        type:"image/png"
    }));
    T.$('#status').hidden = true;
    T.$('#content').hidden = false;
    initSl();
}).call(T);
if('serviceWorker' in navigator){
    navigator.serviceWorker.register('assets/js/PH_sw.js').then(worker=>{
    }).catch(e=>console.log('reg errot',e));
}