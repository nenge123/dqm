var T = Nenge,I=T.I,F=T.F;
var Module = new class{
    arguments = ["-v", "--menu"];
    preRun = [];
    postRun =  [];
    noInitialRun = true;
    canvas = document.querySelector('#canvas');
    print = e=>this.log(e);
    printErr = e=>this.log(e);
    totalDependencies =  0;
    monitorRunDependencies(e) {}
    async onRuntimeInitialized(e){
        console.log('ok',e);
        delete this.wasmBinary;
        let M = this;
        M.FS.mkdir("/offline");
        await M.DISK.syncfs(M.FS.mount(M.DISK, {}, "/offline").mount);
        await T.FetchItem({
            url:M.getdatapath('bios_gba.zip'),
            store:T.LibStore,
            unpack:true,
            success(data){
                I.toArr(data,entry=>M.DISK.MKFILE(entry[0],entry[1]))
            }
        });
        let data = await this.ROMSTORE.keys({Range:IDBKeyRange.only('gba'),index:'system'}),ul;
        let runRom = async function(e){
            let  size = M.canvas.getBoundingClientRect();
            let name = this&&this.textContent?this.textContent.trim():e;
            M.setCanvasSize(size.width,size.height);
            M.canvas.hidden = !1;
            T.$('#status').hidden = !0;
            document.body.classList.add('active');
            M.DISK.MKFILE(name,await M.ROMSTORE.data(name));
            M.gameName = name;
            M.callMain(M.arguments);
            M.DISK.MKFILE('/offline/recent_games.txt',name+'\n');
            M.loadRom = name;
            M.ccall("se_load_settings");
        };
        if(!data.length){            
            await T.FetchItem({
                url:M.getdatapath('dqm_gbc.rar'),
                unpack:true,
                process:e=>T.$('#status').innerHTML = e,
                success(data){
                    ul = T.$append(T.$('#status'),T.$ct('ul',null,'rom-list'))
                    I.toArr(data,entry=>{
                        M.ROMSTORE.put(entry[0],{
                            contents:entry[1],
                            system:'gba'
                        });
                        T.on(T.$append(ul,T.$ct('li',entry[0],'rom-li')),'click',runRom);
                    });
                },
                catch(e){
                    alert(e);
                }
            });
        }else{
            ul = T.$append(T.$('#status'),T.$ct('ul',null,'rom-list'))
            I.toArr(data,v=>{
                let li = T.$append(ul,T.$ct('li',v,'rom-li'));
                T.on(T.$append(li,T.$ct('button','run')),'click',e=>runRom(v));
                T.on(T.$append(li,T.$ct('button','remove')),'click',e=>{
                    M.ROMSTORE.remove(v);
                    li.remove();
                });
            })
        }
        T.on(T.$append(T.$('#status'),T.$ct('button','import',null,{
            style:'margin:2em'
        })),'click',e=>{
            M.upload(files=>{
                I.toArr(files,async file=>{
                let u8 = await T.unFile(file);
                if(I.u8buf(u8)){
                    M.ROMSTORE.put(file.name,{
                        contents:u8,
                        system:'gba'
                    });
                    T.on(T.$append(ul,T.$ct('li',file.name,'rom-li')),'click',runRom);
                }else{
                    I.toArr(u8,entry=>{
                        if(/(gb|gbc|gba)/i.test(entry[0])&&entry[1].length>1024){
                            M.ROMSTORE.put(entry[0],{
                                contents:entry[1],
                                system:'gba'
                            });
                            T.on(T.$append(ul,T.$ct('li',entry[0],'rom-li')),'click',runRom);

                        }
                    })
                }
            })});
        });
        let sul = T.$append(T.$('#status'),T.$ct('ul',null,'rom-list')),
            Store = M.DISK.DB['/offline'];
        I.toArr(await Store.keys(),v=>{
            let li = T.$append(sul,T.$ct('li',v,'rom-li'));
            T.on(T.$append(li,T.$ct('button','down','rom-li')),'click',async e=>{
                T.down(v,await Store.findItem(v,'contents'));
            });
            T.on(T.$append(li,T.$ct('button','replace','rom-li')),'click',async function (e){
                M.upload(async files=>{
                    let u8 =await T.unFile(files[0]);
                    let data = await  Store.findItem(v);
                    this.classList.remove('active');
                    if(!data||!data.contents){
                        this.classList.add('active');
                        return
                    };
                    if(I.u8buf(u8)){
                        data.contents = u8;
                        Store.saveItem(data,v);
                    }else{
                        I.toArr(u8,entry=>{
                            if(F.getExt(v)==F.getExt(entry[0])){
                                data.contents = u8;
                                Store.saveItem(data,v);
                            }
                        })
                    }
                    li.classList.add('active');
                },!0)
            });
            T.on(T.$append(li,T.$ct('button','delete','rom-li')),'click',async e=>{
                await Store.removeItem(v);
                li.remove();
            });
        });
    }
    constructor(){
        this.init();
    }
    log(e){
    }
    setStatus(e){
        console.log(e);
    }
    async init(){
        let M = this;
        M.ROMSTORE = T.getStore('rom','DQM');
        M.DISK = new NengeDisk({
            '/offline':'offline'
        },
        'SkyEmu');
        M.DISK.SetModule(M);
        M.DISK.Filter = path=>/recent_games\.txt/.test(path);
        let files = await T.FetchItem({
            url:M.getdatapath('SkyEmu.zip'),
            store:T.LibStore,
            unpack:true,
            process:e=>T.$('#status').innerHTML = e,
        });
        M.wasmBinary = files['SkyEmu.wasm'];
        let js = I.decode(files['SkyEmu.js'])+
        await T.FetchItem({url:T.JSpath+'SkyEmu_fix.js',type:'text'});
        delete files['SkyEmu.js'];
        files = null;
        (new Function('Module',js))(M);
    }
    upload(func,bool){
        let input = T.$ce('input');
        input.type = 'file';
        if(!bool)input.multiple = true;
        input.onchange = e => {
            let files = e.target.files;
            if (files && files.length > 0) {
                return func(files);
            }
            input.remove();
        };
        input.click();
    }
    getdatapath(path){
        return './../assets/data/'+path;
        /*return T.isLocal?'assets/data/'+path:'https://raw.githubusercontent.com/nenge123/dqm/master/assets/data/'+path;*/
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js').then(worker => {
        worker.active.postMessage('register ok');
    }).catch(e => console.log('reg errot', e));
}