const Nenge = new class NengeCores {
    version = 1;
    DB_NAME = 'DQM';
    DB_STORE_MAP = {
        libjs: {},
        rom: {
            system: false
        }
    };
    LibStore = 'libjs';
    maxsize = 0x6400000;
    part = '-part-';
    lang = {};
    action = {};
    StoreTable = {};
    isLocal = /^(127|localhost|172)/.test(location.host);
    constructor() {
        let T = this,
            I = T.I;
        if (window.matchMedia && !window.matchMedia("(prefers-color-scheme: light)").matches) I.setStyle(document.documentElement, {
            'color-scheme': 'dark'
        });
        T.language = I.language;
        T.i18nName = I.i18n;
        I.mobile && (window.onerror = e => alert(e.message || e));
        let src = document.currentScript && document.currentScript.src.split('?');
        T.JSpath = src && src[0].split('/').slice(0, -1).join('/') + '/';
        T.triger(document, 'NengeStart', {
            detail: T
        });
        T.clearWorker('PH_sw.js');
        T.RunJs(src && I.Attr(document.currentScript, 'query'));
    }
    async RunJs(q) {
        let T = this,
            I = T.I;
        if (q) {
            let info = I.FormGet(q);
            T.SP(info.get('js') || "", v => v && T.addJS(this.F.getpath(v.replace('?rand', '?' + T.time))));
            T.version = info.get('version') || T.version
        }
        T.docload(e => T.triger(document, 'NengeReady', {
            detail: T
        }));
    }
    get date() {
        return new Date();
    }
    get time() {
        return this.date.getTime();
    }
    get rand() {
        return Math.random()
    }
    get randNum() {
        return this.I.IntVal(this.rand.toString().slice(2))
    }
    dbName(dbName) {
        return dbName || this.DB_NAME;
    }
    async getItem(table, name, version, ARG) {
        ARG = ARG || {};
        ARG.dbName = this.dbName(ARG.dbName);
        ARG.store = table;
        if (!name) return await this.getAllData(table, 1, ARG);
        let T = this,
            F = T.F,
            I = T.I,
            result = await F.dbGetItem(name, ARG);
        if (I.obj(result)) {
            let maxsize = T.maxsize,
                part = T.part,
                keyName = name.split(part)[0],
                ver = result.version,
                num = result.filesize / maxsize,
                type = result.type;
            if (version && ver && ver != version) {
                result = undefined;
            } else if (num > 1) {
                result.contents = I.R(14,
                    (await F.dbGetItem(
                        I.toArr(num).map(k => {
                            let newkey = keyName;
                            if (k > 0) newkey += part + k;
                            if (newkey != name) return newkey;
                        }), ARG)).map(v => v ? v.contents : result.contents), result.filename || keyName, {
                    type: result.filetype || F.getMime(result.filename || keyName)
                });
            }
            let contents = result.contents;
            if (contents && !I.str(contents) && !I.obj(contents)) {
                if (type == 'unpack') {
                    contents = await F.unFile(contents, {
                        password: ARG.password || result.password,
                        process: ARG.process
                    });
                } else if (['String', 'Json'].includes(type)) {
                    contents = I.blob(contents) ? await contents.text() : I.decode(contents);
                    if (type == 'Json' || /json/.test(result.filetype)) contents = I.Json(contents);
                } else if (type != 'File' && I.blob(contents)) {
                    contents = I.U8(await contents.arrayBuffer());
                }
                result.contents = contents;
            }
        }
        return result;
    }
    async setItem(table, name, data, dbName) {
        let T = this,
            F = T.F,
            I = T.I,
            maxsize = T.maxsize,
            part = T.part,
            ARG = {
                store: table,
                dbName: T.dbName(dbName)
            };

        if (I.obj(data) && data.contents) {
            let contents = data.contents;
            contents = await F.dbU8(contents, maxsize);
            if (I.u8buf(contents) && contents.byteLength > maxsize) {
                let filesize = contents.byteLength;
                data.filesize = filesize;
                data.contents = null;
                delete data.contents;
                data = I.toObj(I.toArr(data).filter(e => !I.none(e[1])));
                let result = await F.dbPutArr(
                    I.toArr(filesize / maxsize).map(
                        k => {
                            let i = k * maxsize;
                            return {
                                data: I.assign({
                                    contents: I.U8(contents.subarray(i, filesize - i >= maxsize ? i + maxsize : filesize))
                                }, data),
                                name: k > 0 ? name + part + k : name
                            }
                        }
                    ),
                    ARG
                );
                contents = null;
                return result;
            } else {
                data.contents = contents;
            }
        } else if (data) {
            data = await F.dbU8(data, maxsize);
            if (I.u8buf(data) && data.byteLength > maxsize) {
                return T.setItem(table, name, {
                    contents: data,
                    timestamp: T.date
                }, dbName);
            }
        }
        return await F.dbPutItem(data, name, ARG);
    }
    async removeItem(table, name, ARG) {
        let T = this,
            I = T.I,
            F = T.F;
        ARG = ARG || {};
        ARG.dbName = T.dbName(ARG.dbName);
        ARG.store = table;
        if (ARG.filesize) ARG.clear = !0;
        if (ARG.clear) {
            if (!ARG.filesize) {
                let contents = await F.dbGetItem(name, ARG);
                ARG.filesize = contents && contents.filesize;
                T.null(contents);
            }
            if (ARG.filesize) {
                let keyName = name.split(T.part)[0];
                return await F.dbRemoveItem(I.toArr(ARG.filesize / T.maxsize).map(k => {
                    let key = keyName;
                    if (k > 0) key += T.part + k;
                    return key;
                }), ARG);
            }
        }
        return await F.dbRemoveItem(name, ARG);
    }
    async getAllData(table, only, ARG) {
        if (!table) return {};
        let T = this;
        ARG = ARG || {};
        return await T.F.dbGetAll(T.I.assign(ARG, {
            store: table,
            only,
            dbName: T.dbName(ARG.dbName)
        }));
    }
    async getContent(table, name, version, ARG) {
        ARG = ARG || {};
        ARG.dbName = this.dbName(ARG.dbName);
        let result = await this.getItem(table, name, version, ARG);
        return result && result.contents || result;
    }
    async setContent(table, name, contents, ARG) {
        let T = this;
        ARG = ARG || {};
        return await T.setItem(table, name, T.I.assign({
            contents,
            timestamp: T.date
        }, ARG.options), T.dbName(ARG.dbName));
    }
    async getAllKeys(table, ARG) {
        let T = this;
        ARG = ARG || {};
        return await T.F.dbGetKeys(T.I.assign(ARG, {
            store: table,
            dbName: T.dbName(ARG.dbName)
        }));
    }
    async getAllCursor(table, index, only, ARG) {
        let T = this;
        ARG = ARG || {};
        return await T.F.dbGetCursor(T.I.assign(ARG, {
            store: table,
            only,
            index,
            dbName: T.dbName(ARG.dbName)
        }));
    }
    async clearTable(tables, dbName) {
        if (!tables) return;
        let T = this,
            F = T.F;
        return await F.dbClearTable(tables, T.dbName(dbName));
    }
    async removeTable(table, dbName) {
        let T = this,
            F = T.F;
        return await F.deleteDatabase(table, T.dbName(dbName));
    }
    getStore(table, dbName, opt) {
        if (!table) return undefined;
        let T = this;
        if (table instanceof T.DataStore) return table;
        dbName = T.dbName(dbName);
        if (!T.StoreTable[dbName]) T.StoreTable[dbName] = {};
        if (!T.StoreTable[dbName][table]) T.StoreTable[dbName][table] = new T.DataStore(table, dbName, opt);
        return T.StoreTable[dbName][table];
    }
    async FetchItem(ARG) {
        let T = this,
            F = T.F,
            I = T.I;
        if (!ARG || I.str(ARG)) ARG = {
            url: ARG || '/'
        };
        let arrbuff = 'arrayBuffer',
            urlname = F.getname(ARG.url),
            key = ARG.key || urlname || 'index.php',
            keyname = key == F.LibKey ? key + urlname : key,
            result, version = ARG.version,
            headers = {},
            decode = ARG.decode,
            u8decode = decode && (I.str(decode) ? s => I.decode(s, decode) : decode === true ? I.decode : decode),
            Store = ARG.store && T.getStore(ARG.store, ARG.dbName, ARG.index, ARG.dbOpt),
            response,
            contents,
            unFile = (buf, password) => F.unFile(buf, I.assign(ARG, {
                password
            })),
            callback = async result => {
                if (result && result.contents) {
                    if (result.type == 'unpack') {
                        result = await unFile(result.contents, result.password);
                        if (result.password) delete result.password;
                    } else result = result.contents;
                }
                success(result);
                T.null(ARG);
                ARG = null;
                return result;
            },
            success = (result) => result && ARG.success && ARG.success(result, headers);
        delete ARG.store;
        if (!ARG.filename) ARG.filename = urlname;
        if (ARG.onLine) {
            ARG.unset = navigator.onLine;
        }
        if (Store) {
            result = await Store.get(keyname, version, ARG);
            if (result && !ARG.unset) {
                if (!ARG.checksize) {
                    return callback(result);
                }
            }
        }
        response = await F.FetchStart(ARG).catch(e => ARG.error && ARG.error(e.message));
        if (response == undefined) {
            callback(result);
            throw 'fetch failed';
        }
        headers = F.FetchHeader(response, ARG);
        I.exends(headers, response, ['url', 'status', 'statusText']);
        if (ARG.filename) headers.filename = ARG.filename;
        let password = headers['password'] || ARG.password || undefined;
        if (response.status != 200) {
            //404 500
            if (response.body) {
                response.body.cancel();
                ARG.error && ARG.error(response.statusText, headers);
            }
            if (ARG.type == 'head') success(headers);
            return callback(result);
        } else if (result && result.filesize && headers["byteLength"] > 0) {
            if (result.filesize == headers["byteLength"]) {
                response.body.cancel();
                return callback(result);
            }
            T.null(result);
            result = null;
        } else if (ARG.type == 'head') {
            response.body.cancel();
            return callback(headers);
        }
        let responseQuest = I.func(ARG.process) ? await F.StreamResponse(response, ARG.process, headers) : response;
        if (ARG.unpack) ARG.type = arrbuff;
        ARG.type = ARG.type || arrbuff;
        contents = await responseQuest[ARG.type]();
        let type = headers.type,
            filesize = headers["byteLength"] || 0,
            filetype = headers['content-type'];
        if (ARG.type == arrbuff && I.buf(contents)) {
            contents = I.U8(contents);
            type = I.N(11);
        }
        if (ARG.Filter) contents = await ARG.Filter(contents);
        filesize = contents.byteLength || contents.length;
        if (ARG.autounpack && filesize < T.maxsize * .3) {
            ARG.unpack = true;
        }
        ARG.dataOption = ARG.dataOption || {};
        if (Store && ARG.unpack && key === keyname && filesize > T.maxsize) {
            type = 'unpack';
            await Store.put(keyname, I.assign({
                contents: contents,
                timestamp: new Date,
                filesize,
                filetype,
                version,
                type,
                password
            }, ARG.dataOption));
            Store = null;
        }
        if (ARG.unpack && I.u8buf(contents)) {
            contents = await unFile(contents, password);
            if (!contents.byteLength) {
                if (contents.password) {
                    password = contents.password;
                    delete contents.password;
                }
                type = 'datalist';
            }
        }
        if (Store && key !== keyname) {
            if (I.u8buf(contents)) {
                contents = F.getFileText(contents, u8decode, ARG.mime || headers['content-type'] || F.getMime(''), urlname);
                type = I.blob(contents) ? 'File' : 'String'
            } else if (I.str(contents)) {
                type = headers['content-type'] || 'String';
            } else if (type == 'datalist') {
                let contents2;
                await I.Async(I.toArr(contents).map(async entry => {
                    let [name, data] = entry,
                        filename = F.getname(name),
                        filetype = F.getMime(filename),
                        filedata = F.getFileText(data, u8decode, filetype, filename);
                    //F.Libjs[filename] = filedata;
                    await Store.put(key + filename, I.assign({
                        contents: filedata,
                        timestamp: T.date,
                        filesize: data.byteLength,
                        filetype,
                        version: T.version,
                        type: I.blob(filedata) ? 'File' : 'String'
                    }, ARG.dataOption));
                    if (ARG.filename == filename) {
                        contents2 = filedata;
                    }
                    return true;
                }));
                if (contents2) contents = contents2;
                contents2 = null;
                Store = null;
            }
        } else if (u8decode) {
            contents = F.getFileText(contents, u8decode, type);
            if (I.str(contents)) {
                type = 'String';
            }
        }
        if (Store) {
            await Store.put(keyname, I.assign({
                contents: contents,
                timestamp: T.date,
                filesize,
                filetype,
                version,
                type,
                password
            }, ARG.dataOption));
        }
        return callback(contents);
    }
    ajax(ARG) {
        let T = this,
            I = T.I;
        if (I.str(ARG)) ARG = {
            url: ARG
        };
        return I.Async((resolve) => {
            const request = new XMLHttpRequest(ARG.paramsDictionary);
            let evt = [
                'progress', 'readystatechange', 'error', 'abort', 'load', 'loadend', 'loadstart', 'timeout'
            ];
            T.on(request, evt[2], e => {
                ARG.error && ARG.error('net::ERR_FAILED');
                resolve(null);
            });
            T.on(request, evt[1], event => {
                let headers;
                switch (request.readyState) {
                    case request.LOADING:
                    case request.OPENED:
                    case request.UNSENT:
                        break;
                    case request.HEADERS_RECEIVED:
                        headers = I.toObj((request.getAllResponseHeaders() || '').trim().split(/[\r\n]+/).map(line => {
                            let parts = line.split(': ');
                            return [parts.shift(), parts.join(': ')];
                        }).concat([
                            ['status', request.status],
                            ['statusText', request.statusText],
                            ['url', ARG.url]
                        ]));
                        if (ARG.type == 'head') {
                            request.abort();
                            ARG.success && ARG.success(headers, request);
                            resolve(headers);
                            return
                        }
                        break;
                    case request.DONE:
                        if (request.status == 200) {
                            ARG.success && ARG.success(request.response, headers, request);
                            resolve(request.response);
                        } else {
                            ARG.error && ARG.error(request.statusText, headers, request);
                            resolve(null);
                        }
                        break;
                }
            });
            ARG.process && T.on(request, evt[0], e => ARG.process(I.PER(e.loaded, e.total), e.total, e.loaded, 0, request));
            ARG.postProcess && T.on(request.upload, evt[0], e => ARG.postProcess(I.PER(e.loaded, e.total), e.total, e.loaded, e));
            I.toArr(evt, v => I.none(ARG[v]) || (T.on(request, val, ARG[v]), I.DP(ARG, v)));
            ARG.upload && I.toArr(evt, v => I.none(ARG.upload[v]) || (T.on(request, val, ARG.upload[v]), I.DP(ARG.upload, v)));
            let formData, type = ARG.type || "",
                headers = ARG.headers || {},
                ajtime = ARG.noajax ? {} : {
                    inajax: T.time
                };
            if (ARG.overType) request.overrideMimeType(ARG.overType);
            if (ARG.json) {
                formData = I.toJson(ARG.json);
                if (!type) type = 'json';
                I.assign(headers, {
                    Accept: 'application/json, text/plain, */*'
                });
            } else if (ARG.post) {
                formData = I.post(ARG.post);
            }
            if (type != 'head') request.responseType = type;
            request.open(!formData ? "GET" : "POST", I.get(ARG.url, ajtime, ARG.get));
            I.toArr(headers, entry => request.setRequestHeader(entry[0], entry[1]));
            request.send(formData);
        });
    }
    Set(o, I) {
        const T = this;
        if (!I) I = T.I;
        if (!o.action) o.action = {};
        return I.defines(o, {
            I,
            T,
            RF: T.RF,
            CF: T.CF,
            BF: T.BF
        }, 1), I;
    }
    RF(action, data) {
        const R = this,
            A = R.action,
            I = R.I;
        if (A[action]) return I.func(A[action]) ? I.Apply(A[action], R, data || []) : A[action];
    }
    CF(action, ...args) {
        return this.RF(action, args);
    }
    BF(action) {
        const R = this,
            A = R.action,
            I = R.I;
        if (A[action]) return I.func(A[action]) ? A[action].bind(R) : A[action];
    }
    addJS(buf, cb, iscss, id) {
        let T = this,
            F = T.F,
            I = T.I;
        if (I.blob(buf)) {
            id = F.getKeyName(buf.name);
            if (/css/i.test(buf.type)) iscss = true;
        }
        if (id && T.$('#link_' + id)) return;
        let script = T.$ce(!iscss ? 'script' : 'link'),
            func = callback => {
                buf = F.URL(buf, !iscss ? 'js' : 'css');
                if (iscss) {
                    script.type = F.getMime('css');
                    script.href = buf;
                    script.rel = "stylesheet";
                } else {
                    script.type = F.getMime('js');
                    script.src = buf;
                }
                if (id) I.Attr(script, {
                    id: 'link_' + id
                });
                script.onload = e => {
                    callback && callback(e);
                    if (!iscss) {
                        script.remove();
                        if (/^blob:/.test(buf)) F.removeURL(buf);
                    }
                    buf = null;
                };
                T.$append(document[!iscss ? 'body' : 'head'], script);
            };
        if (!cb) return I.Async(func);
        else return func(cb), script;

    };
    async loadScript(js, ARG, bool) {
        ARG = ARG || {};
        let T = this,
            F = T.F;
        ARG.url = F.getpath(js);
        if (bool) {
            ARG.type = 'text';
        } else {
            if (!ARG.store) ARG.store = T.LibStore;
            if (!ARG.key) ARG.key = F.LibKey;
        }
        ARG.version = ARG.version || T.version;
        let data = await T.FetchItem(ARG);
        if (!bool) {
            return await T.addJS(data);
        }
        return data;
    }
    async getScript(js, ARG) {
        return this.loadScript(js, ARG, !0);
    }
    async addScript(js, ARG) {
        return await T.addJS(await T.getScript(js, ARG), null, F.getExt(js) == 'css');
    }
    async loadLibjs(name, process, version, decode, Filter) {
        let T = this,
            F = T.F;
        return await T.addJS(await F.getLibjs(name, process, version, decode, Filter), null, F.getExt(name) == 'css');
    }
    unFile(u8, process, ARG) {
        return this.F.unFile(u8, this.I.assign({
            process
        }, ARG || {}));
    }
    on(elm, evt, fun, opt, cap) {
        let T = this,
            I = T.I;
        elm = T.$(elm)
        return T.SP(evt, v => I.on(elm, v, fun, opt === false ? {
            passive: false
        } : opt, cap)), elm;
    }
    un(elm, evt, fun, opt, cap) {
        let T = this,
            I = T.I;
        elm = T.$(elm)
        return T.SP(evt, v => I.un(elm, v, fun, opt === false ? {
            passive: false
        } : opt, cap)), elm;
    }
    spilt(evt, func, type) {
        let I = this.I,
            t = type || ',';
        return I.toArr(I.str(evt) ? evt.replace(/[\s\|,]+/g, t).split(t).filter(v => !I.empty(v)) : evt, func);
    }
    SP(evt, func, type) {
        let I = this.I,
            t = type || ',';
        return I.toArr(I.str(evt) ? evt.replace(/[\s\|,]+/g, t).split(t).filter(v => !I.empty(v)) : evt, func);
    }
    once(elm, evt, fun, cap) {
        return this.on(elm, evt, fun, {
            passive: false,
            once: true
        }, cap);
    }
    docload(f) {
        let T = this,
            d = document;
        if (d.readyState == 'complete') return f && f.call(T);
        return T.I.Async(complete => {
            let func = () => {
                f && f.call(T), complete(T)
            };
            if (d.readyState == 'loading') T.once(d, 'DOMContentLoaded', func);
            else func();
        });
    }
    $(e, f) {
        let T = this,
            I = T.I;
        return e ? I.str(e) ? I.$(e, f) : I.func(e) ? T.docload(e) : e : undefined;
    }
    $$(e, f) {
        return this.I.$$(e, f);
    }
    $ce(e) {
        return this.I.$c(e);
    }
    $ct(e, txt, c, a) {
        let T = this,
            I = T.I,
            elm = T.$ce(e);
        if (txt) elm.innerHTML = I.str(txt) ? txt : txt();
        !a || I.Attr(elm, a);
        !c || I.Attr(elm, 'class', c);
        return elm;
    }
    $append(a, b) {
        if (this.I.str(b)) b = this.$ce(b);
        return a.appendChild(b), b;
    }
    $add(e, c) {
        return e.classList.add(c), e;
    }
    customElement(myelement) {
        let T = this;
        window.customElements.define(myelement, class extends HTMLElement {
            /* 警告 如果文档处于加载中,自定义元素实际上并不能读取子元素(innerHTML等) */
            /*因此 如果仅仅操作属性(Attribute),可以比元素出现前提前定义.否则最好文档加载完毕再定义,并不会影响事件触发 */
            elmName = this.tagName.replace(/-/g, '_');
            constructor() {
                super();
                T.CF('TAG_' + this.elmName + '_INIT', this, 'init');
            }
            connectedCallback() {
                /*文档document中出现时触发*/
                T.CF('TAG_' + this.elmName, this, 'connect');

            }
            attributeChangedCallback(name, oldValue, newValue) {
                /*attribute增加、删除或者修改某个属性时被调用。*/
                T.CF('TAG_' + this.elmName + '_ATTR', this, 'attribute', {
                    name,
                    oldValue,
                    newValue
                });
            }
            disconnectedCallback() {
                /*custom element 文档 DOM 节点上移除时被调用*/
                T.CF('TAG_' + this.elmName + '_REMOVE', this, 'disconnect');
            }
        });
    }
    docElm(str, mime) {
        return new DOMParser().parseFromString(str, mime || 'text/html');
    }
    HTMLToTxt(str, bool) {
        let T = this,
            I = T.I;
        if (I.str(str)) str = T.docElm(str);
        if (I.doc(str)) {
            return str.body[bool ? 'innerHTML' : 'textContent'];
        }
        return "";
    }
    fragment() {
        return new DocumentFragment();
    }
    Err(msg) {
        return new Error(msg);
    }
    down(name, buf, type) {
        return this.F.download(name, buf, type);
    }
    getLang(name, arg) {
        return this.GL(name, arg);
    }
    GL(name, arg) {
        let T = this,
            I = T.I;
        if (!I.none(T.lang[name])) name = T.lang[name];
        else console.log(name);
        return I.obj(arg) ? I.RegRe(name, arg) : name;
    }
    triger(target, type, data) {
        let T = this,
            I = T.I;
        target = T.$(target);
        if (!data) data = {
            detail: target
        };
        return I.evt(type) ? T.dispatch(target, type) : T.dispatch(target, new I.O[22](type, data)), target;
    }
    dispatch(obj, evt) {
        return obj.dispatchEvent(evt), obj;
    }
    stopGesture(elm) {
        //禁止手势放大
        this.setStyle(elm, {
            'touch-action': 'none'
        });
        //this.on(elm, 'gesturestart,gesturechange,gestureend', this.stopEvent);
    }
    stopEvent(e) {
        e.preventDefault();
    }
    stopProp(e, b) {
        b || e.preventDefault();
        e.stopPropagation();
    }
    clearWorker(js) {
        navigator.serviceWorker.getRegistrations().then(
            sws => sws.forEach(
                sw => {
                    if (sw.active) {
                        if (js && sw.active.scriptURL.includes(js)) sw.unregister();
                        else if (!js) sw.unregister();
                    }
                }
            )
        )
    }
    null(obj) {
        if (this.I.obj(obj))
            for (var i in obj) {
                obj[i] = null;
                delete obj[i];
            }
    }
    I = new class NengeType {
        O = [
            Array, //0
            Object, //1
            Element, //2
            HTMLFormElement, //3
            FormData, //4
            URLSearchParams, //5
            NamedNodeMap, //6,
            DOMStringMap, //7
            CSSStyleDeclaration, //8
            Document, //9
            ArrayBuffer, //10
            Uint8Array, //11,
            Promise, //12
            Blob, //13
            File, //14
            String, //15
            DOMRect, //16
            Event, //17
            KeyboardEvent, //18
            Function, //19
            Boolean, //20
            Headers, //21
            CustomEvent, //22,
            HTMLCollection, //23
            FileList, //24
            TextDecoder, //25,
            TextEncoder, //26
            NodeList, //27
            Number, //28
            RegExp, //29
        ];
        constructor(T) {
            let I = this,
                O = I.O;
            I.defines(this, {
                IF: {
                    value: (o, a) => o instanceof O[a]
                },
                elm: {
                    value: o => I.IF(o, 2)
                },
                elmform: {
                    value: o => I.IF(o, 3)
                },
                urlpost: {
                    value: o => I.IF(o, 4)
                },
                urlget: {
                    value: o => I.IF(o, 5)
                },
                nodemap: {
                    value: o => I.IF(o, 6)
                },
                DOMmap: {
                    value: o => I.IF(o, 7)
                },
                elmCss: {
                    value: o => I.IF(o, 8)
                },
                await: {
                    value: o => I.IF(o, 12)
                },
                blob: {
                    value: o => I.IF(o, 13)
                },
                file: {
                    value: o => I.IF(o, 14)
                },
                evt: {
                    value: o => I.IF(o, 17)
                },
                keyevt: {
                    value: o => I.IF(o, 18)
                },
                func: {
                    value: o => I.IF(o, 19)
                },
                header: {
                    value: o => I.IF(o, 21)
                },
                nodelist: {
                    value: o => I.IF(o, 27)
                },
                IC: {
                    value: (o, a) => I.C(o) === O[a]
                },
                array: {
                    value: o => I.IC(o, 0)
                },
                obj: {
                    value: o => I.IC(o, 1)
                },
                doc: {
                    value: o => I.IC(o, 9)
                },
                buf: {
                    value: o => I.IC(o, 10)
                },
                u8obj: {
                    value: o => I.IC(o, 11)
                },
                u8buf: {
                    value: o => I.IC(o, 11)
                },
                str: {
                    value: o => I.IC(o, 15)
                },
                bool: {
                    value: o => I.IC(o, 20)
                },
                num: {
                    value: o => I.IC(o, 28)
                },
                null: {
                    value: o => o === null
                },
                none: {
                    value: o => typeof o == "undefined"
                },
                R: {
                    value: (o, ...a) => Reflect.construct(this.O[o], a)
                },
                H: {
                    value: o => a[0] && o.hasOwnProperty(a[0]) || false
                },
                DP: {
                    value: (o, ...a) => Reflect.deleteProperty(o, a[0])
                },
                Arr: {
                    value: o => new O[0](o)
                },
                ArrFrom: {
                    value: o => O[0].from(o)
                },
                FromEntries: {
                    value: o => O[1].fromEntries(o)
                },
                Keys: {
                    value: o => O[1].keys(o)
                },
                U8: {
                    value: o => I.u8buf(o) ? o : new O[11](o.buffer || o)
                },
                buf16str: {
                    value: o => I.toArr(o).map(v => v.toString(16).padStart(2, 0).toLocaleUpperCase()).join("")
                },
                ArrTest: {
                    value(o, ...a) {
                        return I.toArr(o).filter(entry => entry[1].test(a[0]))[0]
                    }
                },
                decode: {
                    value(o, ...a) {
                        return new O[25](a[0]).decode(o)
                    }
                },
                encode: {
                    value: o => new O[26]().encode(o)
                },
                FormPost: {
                    value: o => new O[4](o)
                },
                FormGet: {
                    value: o => new O[5](o)
                },
                Int: {
                    value: o => new O[28](o)
                },
                IntVal: {
                    value(o, ...a) {
                        return parseInt(o, a[0])
                    }
                },
                IntSize: {
                    value(o) {
                        o = this.Int(o);
                    }
                },
                PER: {
                    value(o, ...a) {
                        return I.Int(100 * o / a[0]).toFixed(0) + "%"
                    }
                },
                Async: {
                    value(o, ...a) {
                        return o ? (this.array(o) ? Promise.all(o) : new Promise(o, a[0])) : null;
                    }
                },
                $: {
                    value(o, ...a) {
                        return (a[0] || document).querySelector(o)
                    }
                },
                $$: {
                    value(o, ...a) {
                        return (a[0] || document).querySelectorAll(o)
                    }
                },
                $c: {
                    value(o, ...a) {
                        return document.createElement(o)
                    }
                },
                RegRe: {
                    value(o, ...a) {
                        return I.toArr(a[0], e => o = o.replace(new O[29]("\{" + e[0] + "\}", "g"), e[1])),
                            o
                    }
                },
                elmdata: {
                    value: o => I.toObj(o.dataset || o || {}) || {}
                },
                setStyle: {
                    value(o, ...a) {
                        return I.toArr(a[0], x => (o.style || o)[(I.bool(x[1]) && !x[1] ? "remove" : "set") + "Property"](x[0], x[1])),
                            o
                    }
                },
                Attr: {
                    value(o, ...a) {
                        return I.obj(a[0]) ? I.toArr(a[0], v => I.Attr(o, v[0], v[1])) : a[0] ? o[(a[1] ? "set" : "get") + "Attribute"](a[0], a[1]) : I.toObj(o.attributes)
                    }
                },
                Call: {
                    value(o, ...a) {
                        return Reflect.apply(o, a.shift(), a)
                    }
                },
                Apply: {
                    value(o, ...a) {
                        return I.str(o) && (o = a[0][o]),
                            Reflect.apply(o, a[0], a[1])
                    }
                },
                on: {
                    value(o, ...a) {
                        o && I.Apply(addEventListener, o, a)
                    }
                },
                un: {
                    value(o, ...a) {
                        o && I.Apply(removeEventListener, o, a)
                    }
                },
                GP: {
                    value(o, n) {
                        return o.getPropertyValue(n)
                    }
                },
                EQ: {
                    value(o) {
                        let arr = [],
                            v = o.next();
                        while (!v.done) {
                            arr.push(v.value);
                            v = o.next();
                        }
                        return arr;
                    }
                },
                ET: {
                    value(o) {
                        let arr = [];
                        for (let i = 0; i < o.length; i++) {
                            let v = o.item(i);
                            if (typeof v == 'string' && o.getPropertyValue) arr.push([v, I.GP(o, v)]);
                            else if (v.value) arr.push([v.name, v.value]);
                            else arr.push(v);
                        }
                        return arr;
                    }
                },
                FE: {
                    value(o) {
                        let arr = [];
                        o.forEach((v, k) => arr.push([k, v]));
                        return arr;
                    }
                },
                getEntries: {
                    value(o) {
                        if (o.item) return I.ET(o);
                        if (o.byteLength) return I.ArrFrom(new O[11](o.buffer || o));
                        if (o.entries) return I.EQ(o.entries());
                        if (o.length) return I.ArrFrom(o);
                        if (o.forEach) return I.FE(o);
                        return I.Entries(o);
                    }
                }
            });
        }
        N(num) {
            return !isNaN(num) ? this.O[num].name : this.X(num);
        }
        C(obj) {
            return obj != null && obj != undefined && obj.constructor;
        }
        X(obj) {
            return this.C(obj) && this.C(obj).name || ''
        }
        F(o, f) {
            return f && o.forEach && o.forEach(f), o;
        }
        assign(...arg) {
            let I = this;
            return I.Apply(I.O[1].assign, {}, I.array(arg[0]) ? arg[0] : arg)
        }
        exends(a, b, c) {
            if (c) this.toArr(c, v => a[v] = b[v]);
            else a = this.assign(a, b);
            return a;
        }
        get mobile() {
            return 'ontouchend' in document
        }
        get language() {
            return navigator.language;
        }
        get i18n() {
            let lang = this.language.split('-');
            if (lang[0] == 'zh') {
                if (lang[1] == 'CN') {
                    lang = 'zh-hans';
                } else {
                    lang = 'zh-hant';
                }
            } else {
                lang = lang[0];
            }
            return lang;

        }
        post(obj) {
            let I = this;
            let post = I.urlpost(obj) ? obj : I.FormPost(I.elmform(obj) ? obj : I.str(obj) ? I.$(obj) : undefined);
            if (I.obj(obj)) I.toArr(obj, v => post.append(v[0], v[1]));
            return post;
        }
        get(url, ...arg) {
            let I = this,
                urlsearch = url.split('?'),
                urls = urlsearch[1] && urlsearch[1].split('#')[0] || '',
                more = I.toArr(arg).map(e => e ? I.FormGet(e) : '').join('&'),
                data = I.FormGet(urls + '&' + more).toString().replace(/=&/g, '&');
            return urlsearch[0] + (data ? '?' + data : '');
        }
        toObj(obj) {
            if (!obj) return {};
            let I = this;
            if (I.obj(obj)) return obj;
            else if (I.array(obj)) obj = I.FromEntries(obj);
            else obj = I.FromEntries(I.getEntries(obj));
            return obj;
        }
        Entries(o, f) {
            return this.F(this.O[1].entries(o), f);
        }
        toArr(obj, func) {
            if (!obj) return [];
            let arr = [],
                I = this,
                type = I.C(obj);
            if (type == I.O[0]) arr = obj;
            else if (I.obj(obj)) arr = I.Entries(obj);
            else if (type == I.O[28]) arr = Array.from("".padStart(obj));
            else if (type != I.O[0]) arr = I.getEntries(obj);
            else arr = obj;
            if (I.func(func)) return I.F(arr, func);
            return arr;
        }
        define(o, p, attr, bool, rw) {
            this.O[1].defineProperty(o, p, !bool ? attr : {
                get() {
                    return attr
                },
                configurable: rw ? true : false
            });
            return o;
        }
        defines(o, attr, bool, rw) {
            if (bool) this.toArr(attr, entry => this.define(o, entry[0], entry[1], 1, rw));
            else this.O[1].defineProperties(o, attr);
            return o;
        }
        Json(post) {
            let I = this,
                O = I.O;
            if (I.u8buf(post)) post = I.decode(post);
            return typeof post == 'string' ? (new O[19]('return ' + post))() : post;
        }
        toJson(post) {
            return JSON.stringify(this.Json(post));
        }
        empty(data) {
            if (!data) return true;
            if (this.str(data)) return data.trim().length == 0;
            if (this.array(data)) return data.length == 0;
            if (this.obj(data)) return this.toArr(data).length == 0;
            return false;
        }
    }(this);
    F = new class NengeUtil {
        Libjs = {};
        LibKey = 'script-';
        zipsrc = 'zip.min.js';
        extutf16 = {
            "7z": /^377ABCAF271C/,
            rar: /^52617221/,
            zip: /^504B0304/,
            png: /^89504E470D0A1A0A/,
            gif: /^47494638/,
            jpg: /^FFD8FF/,
            webp: /^52494646/,
            pdf: /^255044462D312E/,
        };
        exttype = {
            'application/octet-stream': ['*'],
            'application/javascript': ['js'],
            'text/css': ['css', 'style'],
            'text/scss': ['scss'],
            'text/sass': ['sass'],
            'text/html': ['html', 'htm', 'php'],
            'text/plain': ['txt'],
            'text/xml': ['xml', 'vml'],
            'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'font': ['woff', 'woff2', 'ttf', 'otf'],
            'image/svg+xml': ['svg'],
            'application': ['pdf', 'json'],
            'application/x-zip-compressed': ['zip'],
            'application/x-rar-compressed': ['rar'],
            'application/x-7z-compressed': ['7z'],
        };
        action = {
            textext(s) {
                let F = this,
                    I = F.I,
                    text = I.buf16str(s),
                    result = I.ArrTest(F.extutf16, text);
                if (result && result[0]) return result[0];
                return '';
            },
            async rar(u8, ARG, src) {
                let F = this,
                    I = F.I,
                    process;
                if (I.blob(u8)) {
                    if (!ARG.filename && u8.name) ARG.filename = u8.name;
                    u8 = I.U8(await u8.arrayBuffer());
                }
                src = src || 'libunrar.min.zip';
                let url = await F.getLibjs(src, process),
                    packtext;
                if (ARG.process) {
                    if (ARG.filename) packtext = F.T.getLang('Decompress:') + ARG.filename + ' --';
                    else packtext = F.T.getLang('Decompress:');
                    process = data => ARG.process(packtext + (data.file ? F.getname(data.file) : '') + ' ' + I.PER(data.current, data.total), data.total, data.current);
                }
                return I.Async(complete => {
                    let contents, worker = new Worker(url);
                    worker.onmessage = result => {
                        let data = result.data,
                            t = data.t;
                        if (1 === t) {
                            if (contents) complete(contents);
                            else complete(u8);
                            result.target['terminate']();
                        } else if (2 === t) {
                            if (!contents) contents = {};
                            contents[data.file] = data.data;
                        } else if (4 === t && data.total > 0 && data.total >= data.current) {
                            process && process(data);
                        } else if (-1 == t) {
                            let password = prompt(F.T.getLang(data.message), ARG.password || '');
                            if (!password) {
                                complete(u8);
                                return result.target['terminate']();
                            }
                            if (ARG.unpack) contents.password = password;
                            ARG.password = password;
                            worker.postMessage({
                                password
                            });
                        }
                    },
                        worker.onerror = async error => {
                            complete(u8);
                            worker.terminate();
                        };
                    worker.postMessage({
                        contents: u8,
                        password: ARG.password
                    });
                });

            },
            '7z': function (u8, ARG) {
                return this.CF('rar', u8, ARG, 'extract7z.zip');
            },
            async zip(u8, ARG = {}) {
                if (this.T.Libzip == this.zipsrc) return this.CF('zipjs', u8, ARG);
                return this.CF('rar', u8, ARG, this.T.Libzip);
            },
            async zipjs(u8, ARG) {
                ARG = ARG || {};
                let F = this,
                    T = F.T;
                if (!window.zip) await T.loadLibjs(T.JSpath + F.zipsrc);
                var ZipFile = new zip.ZipReader(new zip[T.I.u8buf(u8) ? 'Uint8ArrayReader' : 'BlobReader'](u8)),
                    contents = {},
                    password = undefined,
                    getData = async entry => {
                        contents[entry.filename] = await entry.getData(new zip.Uint8ArrayWriter(), {
                            onprogress: (current, total) => ARG.process && ARG.process(entry.filename + ' ' + T.I.PER(current, total)),
                            password
                        });
                    },
                    checkPassword = async entry => {
                        try {
                            if (password == undefined) password = ARG.password;
                            await getData(entry);
                        } catch (e) {
                            password = window.prompt(T.getLang('Invalid password'), password);
                            await checkPassword(entry);
                        }
                    },
                    entrylist = await ZipFile.getEntries(),
                    i = 0;
                if (entrylist) {
                    while (entrylist[i]) {
                        let entry = entrylist[i];
                        i++;
                        if (entry.directory) continue;
                        if (entry.encrypted && !password) {
                            await checkPassword(entry)
                        } else {
                            await getData(entry);
                        }
                    }
                }
                return contents;
            }

        };
        async StreamResponse(response, process, headers) {
            let I = this.I,
                maxLength = headers['content-length'] || 0,
                downtext = this.T.getLang('process:'),
                havesize = 0,
                status = {
                    done: !1,
                    value: !1
                },
                reader = await response.body.getReader();
            return new Response(new ReadableStream({
                async start(ctrler) {
                    while (!status.done) {
                        let speedsize = 0,
                            statustext = '';
                        if (status.value) {
                            speedsize = status.value.length;
                            havesize += speedsize;
                            ctrler.enqueue(status.value);
                        }
                        if (maxLength && havesize < maxLength) statustext = downtext + I.PER(havesize, maxLength);
                        else statustext = downtext + (havesize / 1024).toFixed(1) + 'KB';
                        //下载进度
                        process((headers.filename ? headers.filename + ' ' : '') + statustext, maxLength, havesize, speedsize);
                        status = await reader.read();
                    }
                    ctrler.close();
                }
            }));
        }
        FetchHeader(response, ARG) {
            let I = this.I;
            let headers = I.toObj(response.headers) || {};
            I.F((headers['content-type'] || this.getMime(ARG.url || 'html')).split(';'), (value, index) => {
                value = value.trim().toLowerCase();
                if (index == 0) headers['content-type'] = value.trim();
                else if (value.search(/=/) != -1) {
                    let data = value.split('=');
                    headers[data[0].trim()] = data[1].trim();
                }
            });
            return I.assign(headers, {
                byteLength: I.IntVal(headers['content-length']) || 0,
                password: headers['password'] || headers['content-password'],
                type: headers['type'] || headers['content-type'].split('/')[1].split('+')[0],
            });
        }
        async FetchStart(ARG) {
            let F = this,
                I = F.I,
                post,
                data = {
                    headers: {}
                };
            I.toArr(['headers', 'context', 'referrer', 'referrerPolicy', 'mode', 'credentials', 'redirect', 'integrity', 'cache'], v => I.none(ARG[v]) || (data[v] = ARG[v], I.DP(ARG, v)));
            if (ARG.json) {
                post = I.toJson(ARG.json);
                data.headers['Accept'] = 'application/json';
            } else if (ARG.post) {
                post = I.post(ARG.post);
            }
            if (post) {
                data.method = 'POST';
                data.body = post;
            }
            I.toArr(['get', 'post', 'json'], v => I.DP(ARG, v));
            return fetch(I.get(ARG.url, ARG.get), data);
        }
        CheckExt(u8) {
            let F = this,
                I = F.I,
                buf = u8.slice(0, 16),
                textext = F.BF('textext');
            let text = I.blob(buf) ? buf.arrayBuffer() : I.str(buf) ? I.encode(buf) : buf;
            return I.await(text) ? I.Async(async e => {
                console.log(text);
                e(textext(await text))
            }) : textext(text);
        }
        async unFile(u8, ARG = {}) {
            let F = this,
                I = F.I;
            if (I.await(u8)) u8 = await u8;
            if (I.array(u8)) u8 = I.U8(u8);
            let ext = I.file(u8) && /(zip|rar|7z)/i.test(F.getExt(u8.name)) && F.getExt(u8.name) || await F.CheckExt(u8);
            if (F.action[ext]) {
                if (!ARG.PassExt || !ARG.PassExt.includes(zip)) return await F.CF(ext, u8, ARG);
            }
            if (I.blob(u8)) u8 = I.U8(await u8.arrayBuffer());
            return u8;
        }
        async getLibjs(jsfile, process, version, decode, Filter) {
            let F = this,
                T = F.T,
                I = F.I,
                jsname = F.getname(jsfile),
                file = jsname.replace(/\.zip$/, '.js');
            if (F.Libjs[jsname]) return F.Libjs[jsname];
            if (F.Libjs[file]) return F.Libjs[file];
            version = version || T.version;
            let contents = await T.getStore(T.LibStore).data(F.LibKey + file, version);
            if (!contents) {
                if (/\.zip$/.test(jsname)) await F.getLibjs(T.Libzip, process);
                contents = await T.FetchItem({
                    url: F.getpath(jsfile),
                    store: T.LibStore,
                    key: F.LibKey,
                    unpack: true,
                    filename: file,
                    version: version,
                    process,
                    Filter,
                    decode
                });
            }
            if (/json$/.test(file)) {
                F.Libjs[file] = contents;
            } else if (contents) {
                if (I.obj(contents)) {
                    F.I.toArr(contents, entry => F.Libjs[entry[0]] = entry[1] && F.URL(entry[1], entry[0]));
                } else {
                    F.Libjs[file] = F.URL(contents, file);
                }
            }
            contents = null;
            return F.Libjs[file]
        }
        getname(str) {
            return (str || '').split('/').pop().split('?')[0].split('#')[0];
        }
        getpath(js) {
            return /^(\/|https?:\/\/|static\/js\/|data\/|assets|blob\:|\.|\/)/.test(js) ? js : this.T.JSpath + js;
        }
        getFileText(contents, decode, filetype, filename) {
            let F = this,
                I = F.I;
            if (/json$/.test(filetype) && I.u8buf(contents)) return I.Json(contents);
            if (filename && filetype && !decode) return I.R(14, [contents], filename, {
                type: filetype
            });
            if (!decode) return contents;
            if (I.u8buf(contents)) {
                return decode(contents);
            } else if (I.obj(contents)) {
                I.toArr(contents, entry => {
                    if (/(text|javascript|xml|json)/.test(F.getMime(entry[0])) && I.u8buf(entry[1])) {
                        if (F.getExt(entry[0]) == 'json') contents[entry[0]] = I.Json(entry[1]);
                        else contents[entry[0]] = decode(entry[1]);
                    }
                });
            }
            return contents;

        }
        getExt(name) {
            return this.getname(name).split('.').pop().toLowerCase();
        }
        getKeyName(name) {
            let s = this.getname(name).split('.');
            return s.pop(), s.join('.');
        }
        getMime(type, chartset) {
            let F = this,
                I = F.I,
                mime;
            if (F.exttype[type]) mime = type;
            else {
                if (!F.extlist) {
                    F.extlist = I.assign(I.toArr(F.exttype).map(
                        entry => I.toObj(I.toArr(entry[1]).map(v => {
                            let key = entry[0];
                            if (!/\//.test(key)) {
                                delete F.exttype[key];
                                key += '/' + v;
                            } else if (/text\/xml/.test(key) && v != 'xml') key += '+' + v;
                            if (key != entry[0]) F.exttype[key] = [v];
                            return [v, key]
                        }))));
                }
                mime = F.extlist[F.getExt(type)] || F.extlist['*'];
            }
            if (chartset && /(text|javascript|xml|json)/.test(mime)) return mime + ';chartset=utf8';
            return mime;
        }
        URL(u8, type) {
            let F = this,
                I = F.I;
            if (I.str(u8) && /^(blob|http|\/|\w+\/|\.+\/)[^\n]*$/i.test(u8)) return u8;
            return window.URL.createObjectURL(I.blob(u8) ? u8 : new Blob([u8], {
                type: F.getMime(type || 'js')
            }));
        }
        removeURL(url) {
            return window.URL.revokeObjectURL(url);
        }
        download(name, buf, type) {
            let F = this,
                I = F.I,
                href;
            if (I.str(name)) {
                if (/^(http|blob:)/.test(name)) {
                    href = name;
                    name = 'n.js';
                } else if (buf) {
                    href = F.URL(buf, type);
                }
            } else {
                href = F.URL(name, type);
                name = name.name || 'n.js';
            }
            let a = document.createElement("a");
            a.href = href;
            a.download = name;
            a.click();
            a.remove();
        }
        get idb() {
            return window.indexedDB || window.webkitindexedDB;
        }
        dbConf = {};
        DataBase = {};
        dbSetConf(tableName, dbName, index, opt) {
            let F = this,
                I = F.I,
                T = F.T,
                info = F.dbConf,
                name = F.dbname;
            if (!info[F.dbname]) info = I.assign(info, I.toObj([
                [name, T.DB_STORE_MAP]
            ]));
            if (tableName) {
                if (!info[dbName]) info[dbName] = {};
                if (!info[dbName][tableName]) info[dbName][tableName] = opt || index && I.toObj([
                    [index, false]
                ]) || {};
            }
            if (info != F.dbConf) F.dbConf = info;
            return info;

        }
        async dbLoad(tableName, dbName, index) {
            let F = this,
                I = F.I,
                info = F.dbSetConf(tableName, dbName, index),
                tables = info[dbName],
                version, db = F.DataBase[dbName];
            if (db) {
                if (I.await(db)) db = await db;
                if (db.objectStoreNames.contains(tableName)) return db;
            }
            if (!db) {
                F.DataBase[dbName] = F.dbOpen(dbName, tables, version);
                db = await F.DataBase[dbName];
            }
            if (!F.dbCheckTable(db, tables).length) {
                return db;
            }
            throw 'indexDB error';
            /*
            console.log('check indexDB', info, tableName, dbName);
            if (db) {
                version = db.version + 1;
                db.close();
                F.DataBase[dbName] = F.dbOpen(dbName, tables, version);
                return await F.DataBase[dbName];
            }
            */
        }
        async dbOpen(dbName, dbStore, version, upgrad) {
            let F = this,
                T = F.T,
                I = T.I;
            if (!F.dbVer) F.dbVer = I.toObj((await F.idb.databases()).map(v => [v.name, v.version]));
            if (upgrad && !dbStore) {
                if (!F.dbVer[dbName]) return;
                if (!version) {
                    if (F.DataBase[dbName]) (await F.DataBase[dbName]).close();
                    delete F.DataBase[dbName];
                    version = F.dbVer[dbName] + 1;
                }
            }
            return I.Async((resolve, reject) => {
                let req = F.idb.open(dbName, version);
                T.once(req, 'error', async err => {
                    reject(err);
                });
                T.once(req, 'upgradeneeded', upgrad || (async e => {
                    console.log('upgrad indexDB:' + dbName);
                    let db = e.target.result;
                    F.dbCheckTable(db, dbStore, v => {
                        let storeObj = db.createObjectStore(v[0]);
                        I.toArr(v[1], index => storeObj.createIndex(
                            index[0], index[1] && index[1].key || index[0], index[1] && index[1].options || index[1] || {
                                unique: false
                            }
                        ))

                    });
                }));
                T.once(req, 'success', async e => {
                    let db = e.target.result;
                    F.dbVer[dbName] = db.version;
                    //F.DataBase[dbName] = db;
                    I.toArr(db.objectStoreNames, v => F.dbConf[dbName][v] = F.dbConf[dbName][v] || {});
                    if (upgrad) return resolve(!0);
                    if (!F.dbCheckTable(db, dbStore).length) resolve(db);
                    else {
                        db.close();
                        F.dbOpen(dbName, dbStore, db.version + 1).then(db => resolve(db));
                    }
                });
            });
        }
        dbCheckTable(db, tables, func) {
            if (!db) return [];
            return this.I.toArr(tables).filter(v => {
                if (!db.objectStoreNames.contains(v[0])) return func && func(v) || true;
            });
        }
        async dbU8(contents, maxsize) {
            let I = this.I;
            if (I.await(contents)) {
                contents = await contents;
            }
            if (I.str(contents) && contents.lenth * 4 > maxsize) {
                contents = I.encode(contents);
            } else if (I.blob(contents) && contents.size > maxsize) {
                contents = I.U8(await contents.arrayBuffer());
            } else if (contents.buffer) {
                contents = I.U8(contents);
            }
            return contents;

        }
        async dbSelect(ARG, ReadMode) {
            let F = this,
                T = F.T;
            if (F.I.str(ARG)) ARG = {
                store: ARG
            };
            if (ARG.store instanceof T.DataStore) {
                ARG.store = ARG.store.table;
            }
            let store = ARG.store,
                db = await F.dbLoad(store, ARG.dbName, ARG.index);
            ReadMode = ReadMode ? "readonly" : "readwrite";
            let tdb = db.transaction([store], ReadMode);
            tdb.onerror = e => {
                e.preventDefault();
                throw tdb.error;
            };
            return tdb.objectStore(store);
        }
        async dbGetItem(name, ARG) {
            let F = this,
                I = F.I,
                DB = await F.dbSelect(ARG, !0);
            if (I.array(name)) return I.Async(name.map(v => v && I.Async(resolve => DB.get(v).onsuccess = e => resolve(e.target.result))));
            return I.Async(resolve => DB.get(name).onsuccess = e => resolve(e.target.result));
        }
        async dbPutItem(data, name, ARG) {
            let F = this,
                I = F.I,
                DB = await F.dbSelect(ARG);
            return I.Async(resolve => DB.put(data, name).onsuccess = e => resolve(e.target.result));
        }
        async dbPutArr(Arr, ARG) {
            let F = this,
                I = F.I,
                DB = await F.dbSelect(ARG);
            return I.Async(
                Arr.map(
                    entry => I.Async(resolve => DB.put(entry.data, entry.name).onsuccess = e => resolve(e.target.result))
                )
            );
        }
        async dbRemoveItem(name, ARG) {
            let F = this,
                I = F.I,
                DB = await this.dbSelect(ARG);
            if (ARG.index) DB = DB.index(ARG.index);
            if (I.array(name)) return I.Async(name.map(v => v && I.Async(resolve => DB.delete(v).onsuccess = e => resolve(v))));
            return I.Async(resolve => DB.delete(name).onsuccess = e => resolve(name));
        }
        async dbGetAll(ARG) {
            let F = this,
                I = F.I,
                T = F.T,
                DB = await F.dbSelect(ARG, !0);
            return I.Async(callback => {
                if (ARG.index) DB = DB.index(ARG.index);
                let entries = {},
                    Cursor = DB.openCursor(ARG.Range);
                T.on(Cursor, 'success', evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (ARG.only && T.part && T.maxsize && I.u8buf(cursor.value.contents) && cursor.value.filesize > T.maxsize) {
                            let skey = cursor.primaryKey.split(T.part),
                                newkey = skey[0],
                                index = skey[1] || 0;
                            if (!entries[newkey]) {
                                let contents = I.U8(cursor.value.filesize);
                                contents.set(cursor.value.contents, index * T.maxsize);
                                delete cursor.value.contents;
                                entries[newkey] = F.assign(cursor.value, {
                                    contents
                                })
                            } else {
                                entries[newkey].contents.set(cursor.value.contents, index * T.maxsize);
                            }
                        } else {
                            entries[cursor.primaryKey] = cursor.value;
                        }
                        cursor.continue();
                    } else {
                        callback(entries);
                    }
                });
                T.on(Cursor, 'error', e => callback(entries));

            });
        }
        async dbGetKeys(ARG) {
            let F = this,
                I = F.I;
            let DB = await F.dbSelect(ARG, !0);
            return I.Async(resolve => {
                if (ARG.index) DB = DB.index(ARG.index);
                DB.getAllKeys(ARG.Range).onsuccess = e => {
                    resolve(ARG.only ? I.toArr(e.target.result).filter(v => !v.includes(F.T.part)) : e.target.result)
                };
            });

        }
        async dbGetCursor(ARG) {
            let F = this,
                I = F.I;
            if (I.str(ARG)) ARG = {
                index: ARG
            };
            let index = ARG.index,
                T = F.T,
                DB = await F.dbSelect(ARG, !0),
                len = DB.indexNames.length;
            if (len && !index) {
                index = DB.indexNames[0];
            } else if (!len) {
                return F.dbGetKeys(ARG);
            }
            return I.Async(resolve => {
                let entries = {};
                DB.index(index).openKeyCursor(ARG.Range).onsuccess = evt => {
                    let cursor = evt.target.result;
                    if (cursor) {
                        if (!ARG.only || T.part && !cursor.primaryKey.includes(T.part)) {
                            entries[cursor.primaryKey] = cursor.key
                        }
                        cursor.continue()
                    } else {
                        resolve(entries)
                    }
                }
            })

        }
        async dbClearTable(tables, dbName) {
            let F = this,
                I = F.I;
            return await I.Async((I.str(tables) ? [tables] : tables).map(async store => (await F.dbSelect({
                store,
                dbName
            })).clear()));
        }
        async deleteDatabase(table, dbName) {
            let F = this;
            if (!table) return F.idb.deleteDatabase(dbName);
            await F.dbOpen(dbName, null, null, e => e.target.result.deleteObjectStore(table));
        }
        get dbname() {
            return this.T.DB_NAME;
        }
        constructor(T) {
            let F = this;
            T.Set(F);
            if (!T.Libzip) T.Libzip = F.zipsrc;
        }
    }(this);
    DataStore = (T => {
        return class Store {
            get T() {
                return T;
            }
            get I() {
                return T.I;
            }
            constructor(t, n, o) {
                let S = this, I = S.I;
                I.defines(S, {
                    table: {
                        value: t
                    },
                    name: {
                        value: n || S.T.DB_NAME
                    },
                    getItem: {
                        value: (...a) => S.callFunc(T.getItem, a)
                    },
                    setItem: {
                        value: (...a) => S.callFunc(T.setItem, a)
                    },
                    removeItem: {
                        value: (...a) => S.callFunc(T.removeItem, a)
                    },
                    getAllData: {
                        value: (...a) => S.callFunc(T.getAllData, a)
                    },
                    getContent: {
                        value: (...a) => S.callFunc(T.getContent, a)
                    },
                    setContent: {
                        value: (...a) => S.callFunc(T.setContent, a)
                    },
                    getAllKeys: {
                        value: (...a) => S.callFunc(T.getAllKeys, a)
                    },
                    getAllCursor: {
                        value: (...a) => S.callFunc(T.getAllCursor, a)
                    },
                    clearTable: {
                        value: (...a) => S.callFunc(T.clearTable, a)
                    },
                    removeTable: {
                        value: (...a) => S.callFunc(T.removeTable, a)
                    },
                    transaction: {
                        value: bool => T.F.dbSelect(S.setName(), bool)
                    }
                }, !1);
                S.read = S.get;
                S.write = S.put;
                S.load = S.getData;
                S.save = S.setData;
                S.T.F.dbSetConf(t, n, !1, o || {})
            }
            setName(t) {
                return this.I.assign({
                    dbName: this.name,
                    store: this.table
                }, t)
            }
            get(t, e, a) {
                return this.getItem(t, e, this.setName(a))
            }
            put(t, e) {
                return this.setItem(t, e, this.name)
            }
            remove(t, e) {
                let o = this.setName(e);
                o.clear = !0;
                return this.removeItem(t, o)
            }
            data(t, e, a) {
                return this.getData(t, e, a)
            }
            getData(t, e, a) {
                return this.getContent(t, e, this.setName(a))
            }
            setData(t, e, a) {
                return this.setContent(t, e, this.setName(a))
            }
            keys(t) {
                return this.getAllKeys(this.setName(t))
            }
            cursor(t, e, a) {
                return this.getAllCursor(t, e, this.setName(a))
            }
            all(t, e) {
                return this.getAllData(t, this.setName(e))
            }
            clear() {
                return this.clearTable(this.name)
            }
            delete() {
                return this.removeTable(this.name)
            }
            callFunc(n, a) {
                return this.I.Apply(n, this.T, [this.table].concat(a))
            }
        }
    })(this);
};