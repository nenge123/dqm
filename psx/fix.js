;function _RWebAudioStart() {
    Module.reloadAudio();
    return true
}
Module.RA = RA;
Module.FS = FS;
Module.MEMFS = MEMFS;
if(typeof JSEvents !='undefined')Module.JSEvents = JSEvents;
function _RWebAudioInit(latency) {
    RA.numBuffers = latency * RA.context.sampleRate / (1e3 * RA.BUFFER_SIZE) | 0;
    if (RA.numBuffers < 2) RA.numBuffers = 2;
    for (var i = 0; i < RA.numBuffers; i++) {
        RA.buffers[i] = RA.context.createBuffer(2, RA.BUFFER_SIZE, RA.context.sampleRate);
        RA.buffers[i].endTime = 0
    }
    RA.nonblock = false;
    RA.startTime = 0;
    RA.context.createGain();
    window["setTimeout"](RA.setStartTime, 0);
    Module["pauseMainLoop"]();
    return 1
}