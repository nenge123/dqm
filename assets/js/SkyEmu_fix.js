function em_init_fs() {
    FS.mkdir("/offline");
    FS.mount(Module.DISK, {}, "/offline");
    FS.syncfs(true, function (err) {
        Module.ccall("se_load_settings")
    })
}
asmLibraryArg.Qd = em_init_fs;
Module.FS = FS;
Module.MEMFS = MEMFS;
Module.callMain  = callMain;
ASM_CONSTS[1375108] = function ($0, $1, $2, $3) {
        if(Module.loadRom){
            ret_path = Module.loadRom;
            Module.loadRom = "";
        }else{

        var input = document.getElementById("fileInput");
        input.style.left = $0 + "px";
        input.style.top = $1 + "px";
        input.style.width = $2 + "px";
        input.style.height = $3 + "px";
        input.style.visibility = "visible";
        input = document.getElementById("fileInput");
        if (input.value != "") {
            console.log(input.value);
            var reader = new FileReader;
            var file = input.files[0];

            function print_file(e) {
                var result = reader.result;
                const uint8_view = new Uint8Array(result);
                var out_file = filename;
                FS.writeFile(out_file, uint8_view);
                var input_stage = document.getElementById("fileStaging");
                input_stage.value = out_file
            }
            reader.addEventListener("loadend", print_file);
            reader.readAsArrayBuffer(file);
            var filename = file.name;
            input.value = ""
        }
        var input_stage = document.getElementById("fileStaging");
        var ret_path = "";
        if (input_stage.value != "") {
            ret_path = input_stage.value;
            input_stage.value = ""
        }
        }
        var sz = lengthBytesUTF8(ret_path) + 1;
        var string_on_heap = _malloc(sz);
        stringToUTF8(ret_path, string_on_heap, sz);
        return string_on_heap
    }
    Module.runPath = function (ret_path){
        var sz = lengthBytesUTF8(ret_path) + 1;
        var string_on_heap = _malloc(sz);
        stringToUTF8(ret_path, string_on_heap, sz);
    }