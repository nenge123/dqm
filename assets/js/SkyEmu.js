var T = Nenge,I=T.I,F=T.F;
var  Module = new class{
    arguments = ["-v", "--menu"];
    preRun = [];
    postRun =  [];
    noInitialRun = true;
    canvas = document.querySelector('#canvas');
    print = e=>this.log(e);
    printErr = e=>this.log(e);
    totalDependencies =  0;
    monitorRunDependencies(e) {
        this.totalDependencies = Math.max(this.totalDependencies, e), this.setStatus(e ?
            "Preparing... (" + (this.totalDependencies - e) + "/" + this.totalDependencies +
            ")" : "All downloads complete.")
    }
    async onRuntimeInitialized(e){
        console.log('ok',e);
        delete this.wasmBinary;
        let D = this;
        T.FetchItem({
            url:D.getdatapath('bios_gba.zip'),
            unpack:true,
            success(data){
                I.toArr(data,entry=>Module.DISK.MKFILE(entry[0],entry[1]))
            }
        });
        let data = await this.ROMSTORE.keys({Range:IDBKeyRange.only('gba'),index:'system'}),ul;
        let runRom = async function(e){
            let  size = D.canvas.getBoundingClientRect();
            let name = this.textContent?this.textContent.trim():e;
            console.log(name);
            D.setCanvasSize(size.width,size.height);
            D.canvas.hidden = !1;
            T.$('#status').hidden = !0;
            document.body.classList.add('active');
            D.DISK.MKFILE(name,await D.ROMSTORE.data(name));
            D.loadRom = name;
            D.callMain(D.arguments);
        };
        if(!data.length){            
            await T.FetchItem({
                url:D.getdatapath('dqm_gbc.rar'),
                unpack:true,
                process:e=>T.$('#status').innerHTML = e,
                success(data){
                    ul = T.$append(T.$('#status'),T.$ct('ul',null,'rom-list'))
                    I.toArr(data,entry=>{
                        D.ROMSTORE.put(entry[0],{
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
                T.on(T.$append(ul,T.$ct('li',v,'rom-li')),'click',runRom);
            })
        }
        T.on(T.$append(T.$('#status'),T.$ct('button','import',null,{
            style:'margin:2em'
        })),'click',e=>{
            D.upload(files=>{
                I.toArr(files,async file=>{
                let u8 = await T.unFile(file);
                if(I.u8buf(u8)){
                    D.ROMSTORE.put(file.name,{
                        contents:u8,
                        system:'gba'
                    });
                    T.on(T.$append(ul,T.$ct('li',file.name,'rom-li')),'click',runRom);
                }else{
                    I.toArr(u8,entry=>{
                        if(/(gb|gbc|gba)/i.test(entry[0])&&entry[1].length>1024){
                            D.ROMSTORE.put(entry[0],{
                                contents:entry[1],
                                system:'gba'
                            });
                            T.on(T.$append(ul,T.$ct('li',entry[0],'rom-li')),'click',runRom);

                        }
                    })
                }
            })});
        });
        let sul = T.$append(T.$('#status'),T.$ct('ul',null,'rom-list'));
        I.toArr( await this.Store.keys(),v=>{
            let li = T.$append(sul,T.$ct('li',v,'rom-li'));
            T.on(T.$append(li,T.$ct('button','down','rom-li')),'click',async e=>{
                T.down(v,await D.Store.data(v));
            });
            T.on(T.$append(li,T.$ct('button','replace','rom-li')),'click',async function (e){
                D.upload(async files=>{
                    let u8 =await T.unFile(files[0]);
                    let data = await  D.Store.get(v);
                    this.classList.remove('active');
                    if(!data||!data.contents){
                        this.classList.add('active');
                        return
                    };
                    if(I.u8buf(u8)){
                        data.contents = u8;
                        D.Store.put(v,data);
                    }else{
                        I.toArr(u8,entry=>{
                            if(F.getExt(v)==F.getExt(entry[0])){
                                data.contents = u8;
                                D.Store.put(v,data);
                            }
                        })
                    }
                    li.classList.add('active');
                },!0)
            });
            T.on(T.$append(li,T.$ct('button','delete','rom-li')),'click',async e=>{
                await D.Store.remove(v);
                li.remove();
            });
        });
    }
    constructor(){
        this.init();
        this.ROMSTORE = T.getStore('rom','DQM');
        this.Store = T.getStore('offline','SkyEmu',{'timestamp':false});
        this.DISK = new NengeDisk({'/offline':this.Store});
        this.DISK.SetModule(this);
        this.DISK.Filter = path=>/recent_games\.txt/.test(path);
    }
    log(e){
        //console.log(e);
    }
    setStatus(e){
        console.log(e);
    }
    async init(){
        let files = await T.FetchItem({
            url:this.getdatapath('SkyEmu.zip'),
            unpack:true,
            process:e=>T.$('#status').innerHTML = e,
        });
        this.wasmBinary = files['SkyEmu.wasm'];
        (new Function('Module',I.decode(files['SkyEmu.js'])+
        await T.FetchItem({url:'assets/js/SkyEmu_fix.js?'+T.time,type:'text'})))(this);
        delete files['SkyEmu.js'];
        files = null;
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
        return T.isLocal?'assets/data/'+path:'https://cdn.jsdelivr.net/gh/nenge123/dqm@master/assets/data/'+path;
    }
}