var T = Nenge,I=T.I,F=T.F;
var Module = new class{
    constructor(){
        this.DISK = new NengeDisk({
            '/saves':'saves'
        },'emu-psx');
        this.DISK.SetModule(this);
        this.init();
    }
    async init(){
        /*
        let files = await T.FetchItem({
            url:'../assets/data/emu_psx.zip',
            unpack:true
        });
        */
        this.wasmBinary = await T.FetchItem({url:'./retroarch.wasm?'+T.time});//files['retroarch.wasm'];
        let js = await T.FetchItem({url:'./retroarch.js?'+T.time,type:'text'})+await T.FetchItem({url:'./fix.js?'+T.time,type:'text'});
        (new Function('Module',js))(this);
    }
    async onRuntimeInitialized(){
        let M = this;
        M.FS.mkdir("/saves");
        M.FS.mkdir("/roms");
        await M.DISK.syncfs(M.FS.mount(M.DISK, {}, "/saves").mount);
        let roms = await T.FetchItem({url:'/psx_dqm.rar',unpack:true,process:e=>T.$('#status').innerHTML=e});
        I.toArr(roms,entry=>{
            M.DISK.MKFILE(entry[0],entry[1]);
            if(/(\.img)$/.test(entry[0])){
                M.arguments[1] = entry[0];
            }
        })
        T.$('#status').innerHTML = '9999';
        T.on(T.$('#status'),'click',e=>{
            M.loadGame();
        });
    }
    async loadGame(){
        let M = this;
        M.canvas = document.querySelector('#canvas');
        M.canvas.hidden = !1;
        M.RA.context = new (window.AudioContext||window.webkitAudioContext)();
        await M.RA.context.resume();
        M.callMain(M.arguments);
        M.setCanvasSize(960,720);
        if(M.JSEvents)M.JSEvents.removeAllEventListeners();
        I.toArr(T.$$('.emu-controls button'),elm=>{
            let key = elm.getAttribute('data-key');
            if(key){
                T.on(elm,'pointerdown pointermove',function(e){

                });
                T.on(elm,'pointerup pointout',function(e){

                });
            }
        });
    }
    reloadAudio(){
        this.RA.context.resume();
    }
    noInitialRun = !0;
    arguments = ['-v','-menu','2b35cacf70aef5cbb3f38c0bb20e488cc8ad0c350400499a0'];
    preRun = [];
    postRun = [];
    print = e => console.log(e);
    printErr = e => console.log(e);
    totalDependencies = 0;
    monitorRunDependencies = e => console.log("屏幕初始化");
    preMainLoop = e => {};
}