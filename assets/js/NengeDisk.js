
class NengeDisk {
    constructor(DB) {
        if(DB)this.DB = DB;
    }
    action = {};
    DB = {};
    SetModule(Module) {
        Object.defineProperty(this,'Module',{get:()=>Module});
    }
    get FS() {
        return this.Module.FS||window.FS;
    }
    get MEMFS() {
        return this.Module.MEMFS || this.FS.filesystems.MEMFS;
    }
    get HEAP8() {
        return this.Module.HEAP8 || self.HEAP8;
    }
    getStore(mount) {
        let path = mount.mountpoint;
        if (!this.DB[path]) {
            return false;
        }
        return this.DB[path];
    }
    mount(mount) {
        let D = this;
        return D.MEMFS.mount.apply(null, arguments);
    }
    async syncfs(mount, populate,callback) {
        let D = this;
        let store = D.getStore(mount);
        let result;
        if(store){
            if (!mount.isReady) {
                //初始化
                result = await this.loadFile(store).catch(e=>alert(e));
                this.SetAutoSync(); //自动同步
                mount.isReady = true;
            } else {
                result = await D.syncWrite(store, mount);
            }
        }
        populate&&(populate instanceof Function) && populate('ok');
        callback&&(callback instanceof Function) && callback('ok');
        return result;
    }
    async loadFile(store) {
        let D = this;
        return Object.entries(await store.all(true)).map(entry => D.storeLocalEntry(entry[0], entry[1])).join("\n");
    }
    syncUpdate(steam) {
        this.syncfs(steam.node.mount);
    }
    SetAutoSync() {
        let D = this;
        D.MEMFS.stream_ops.write = function (stream, buffer, offset, length, position, canOwn) {
            if (D.HEAP8 && buffer.buffer === D.HEAP8.buffer) {
                canOwn = false
            }
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    D.syncUpdate(stream);
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            D.MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset,
                offset + length), position);
            else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        };
        if (D.MEMFS.ops_table) D.MEMFS.ops_table.file.stream.write = D.MEMFS.stream_ops.write;
    }
    async syncWrite(store, mount) {
        let D = this;
            let locallist = this.getLocalList(mount.mountpoint, !0);
            let dblist = await this.getRemoteList(store);
            let savelist = [],
                removelist = [],
                result = [];
            Object.entries(locallist).forEach(entry => {
                if (!dblist[entry[0]] || entry[1] > dblist[entry[0]]) {
                    savelist.push(entry[0]);
                }
            });
            Object.entries(dblist).forEach(entry => {
                if (!locallist[entry[0]]) {
                    removelist.push(entry[0]);
                }
            });
            let transaction = await store.transaction();
            savelist.sort().forEach(path => {
                transaction.put(this.loadLocalEntry(path), path);
                result.push('indexdb write:'+path);
            });
            removelist.sort().forEach(path => {
                transaction.delete(path);
                result.push('indexdb delete:'+path);
            });
            this.log&&this.log(IsReady, result);
            return result.join("\n");
    }
    loadLocalEntry(path) {
        let D = this,
            FS = D.FS,
            stat, node;
        if (FS.analyzePath(path).exists) {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path)
        } else {
            return path + ' is exists'
        }
        if (FS.isDir(stat.mode)) {
            return {
                timestamp: stat.mtime,
                mode: stat.mode
            };
        } else if (FS.isFile(stat.mode)) {
            node.contents = D.getFileDataAsTypedArray(node);
            return {
                timestamp: stat.mtime,
                mode: stat.mode,
                contents: node.contents
            };
        } else {
            return "node type not supported";
        }
    }
    storeLocalEntry(path, entry) {
        let D = this,
            FS = D.FS;
        if(!entry||!entry.mode)return;
        if (FS.isDir(entry.mode)) {
            !FS.analyzePath(path).exists && FS.createPath('/', path, !0, !0)
        } else if (FS.isFile(entry.mode)) {
            let p = path && path.split('/').slice(0, -1).join('/');
            if (p && !FS.analyzePath(p).exists) FS.createPath('/', p, !0, !0);
            FS.writeFile(path, entry.contents, {
                canOwn: true,
                encoding: "binary"
            });
        } else {
            throw "node type not supported";
        }
        FS.chmod(path, entry.mode);
        FS.utime(path, entry.timestamp, entry.timestamp);
        return 'FS write:' + path;
    }
    removeLocalEntry(path) {
        let FS = this.FS;
        if (FS.analyzePath(path).exists) {
            var stat = FS.stat(path);
            if (FS.isDir(stat.mode)) {
                FS.rmdir(path)
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path)
            }
            return 'FS unlink:' + path;
        } else {
            return path + 'is not exists';
        }
    }
    async getRemoteList(store, callback) {
        let result = await store.cursor('timestamp', true);
        callback && callback(result);
        return result
    }
    getLocalList(mountpoint, bool) {
        mountpoint = mountpoint || '/';
        let D = this,
            FS = D.FS,
            entries = {},
            filterRoot = [".", ".."].concat(mountpoint == '/' ? ["dev", "tmp", "proc"] : []),
            isRealDir = p => !bool || !filterRoot.includes(p),
            toAbsolute = root => p => D.join2(root, p),
            check = D.stat(mountpoint) && FS.readdir(mountpoint).filter(isRealDir).map(toAbsolute(
                mountpoint));
        if (!check) return console.log('mount:PATH ERROR');
        while (check.length) {
            let path = check.shift();
            if (!bool && path == mountpoint) continue;
            let stat = D.stat(path);
            if(D.Filter&&D.Filter(path)) continue;
            if (stat) {
                entries[path] = stat.mtime;
                if (FS.isDir(stat.mode) && bool) {
                    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
                }

            }
        }
        return entries;
    }
    stat(path) {
        let D = this,
            FS = D.FS,
            pathinfo = FS.analyzePath(path);
        if (pathinfo.exists && pathinfo.object.node_ops && pathinfo.object.node_ops.getattr) {
            return FS.stat(path);
        }
    }
    getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    }
    join() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return this.normalize(paths.join("/"))
    }

    join2(l, r) {
        return this.normalize(l + "/" + r)
    }
    normalize(path) {
        var isAbsolute = path.charAt(0) === "/",
            trailingSlash = path.substring(-1) === "/";
        path = this.normalizeArray(path.split("/").filter(p => {
            return !!p
        }), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    }

    normalizeArray(parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift("..")
            }
        }
        return parts
    };
    ReadFile(file) {
        if (this.FS.analyzePath(file).exists) return this.FS.readFile(file);
    }
    MKFILE(path, data, bool) {
        if (!this.Module) return;
        let FS = this.FS,
            dir = path.split('/');
        if (dir.length) dir = dir.slice(0, -1).join('/');
        else dir = '/';
        if (!FS.analyzePath(dir).exists) {
            let pdir = dir.split('/').slice(0, -1).join('/');
            if (!FS.analyzePath(pdir).exists) FS.createPath('/', pdir, !0, !0);
            FS.createPath('/', dir, !0, !0);
        }
        if (typeof data == 'string') data = new TextEncoder().encode(data);
        if (bool) {
            if (FS.analyzePath(path).exists) FS.unlink(path);
            FS.writeFile(path, data, {
                //canOwn: true,
                encoding: "binary"
            });
        } else if (!FS.analyzePath(path).exists) {
            FS.writeFile(path, data, {
                //canOwn: true,
                encoding: "binary"
            });
        }
    }
    setIdb(NAME,TABLES,version){
        /**set a index */
        if(typeof TABLES == 'string')TABLES = [TABLES];
        this.idb = new Promise(callback => {
            let request = indexedDB.open(NAME,version);
            request.onupgradeneeded = e => {
                let db = request.result;
                TABLES.forEach(
                    table=>{
                        if (!db.objectStoreNames.contains(table)) {
                            let dbtable = db.createObjectStore(table);
                            dbtable.createIndex('timestamp', 'timestamp', {
                                unique: false
                            });
                        }
                    }
                )
            };
            request.onsuccess = e => callback(request.result);
            request.onerror = e => callback(null);
        })
    };
    async db_select(table,mode) {
        /**get table transaction in indexedDB */
        let db = await this.idb;
        mode = mode ? "readonly" : "readwrite";
        let tdb = db.transaction([table], mode);
        return tdb.objectStore(table);
    }
    async db_index(table){
        /**get data.timestamp in table data in indexedDB */
        let entries = {},
            index = 'timestamp';
        let transaction = await this.db_select(table,!0);
        return new Promise(callback => {
            transaction.index(index).openKeyCursor().onsuccess = e => {
                let cursor = e.target.result;
                if (cursor) {
                    entries[cursor.primaryKey] = cursor.key;
                    cursor.continue();
                } else {
                    callback(entries);
                }
            }
        })
    }
    async db_all(table){
        /**get all in table data in indexedDB */
        let transaction = await this.db_select(table,!0),entries={};
        return new Promise(callback => {
            transaction.openCursor().onsuccess = e => {
                let cursor = e.target.result;
                if (cursor) {
                    entries[cursor.primaryKey] = cursor.value;
                    cursor.continue();
                } else {
                    callback(entries);
                }
            }
        });
    }
}