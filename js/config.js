App = window.App || {};
App.Config = (function Config() {
    var streamData = [
        {
            manifest: 'https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd',
            streamName: 'Star Trek'
        },
        {
            manifest: 'https://storage.googleapis.com/shaka-demo-assets/sintel-trickplay/dash.mpd',
            streamName: 'Sintel'
        },
        {
            manifest: 'https://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel.ism/.mpd',
            streamName: 'Tears of Steel'
        }
    ];

    var classNames = {
        CURRENT: 'current',
        CHOOSEN: 'choosen'
    };

    var keyCodes = {
        MEDIA_PLAY_PAUSE: 10252,
        MEDIA_PLAY: 415,
        MEDIA_PAUSE: 19,
        MEDIA_STOP: 413,
        MEDIA_FAST_FORWARD: 417,
        MEDIA_REWIND: 412,
        KEY_1: 49,
        KEY_2: 50,
        KEY_3: 51,
        RETURN: 10009
    };

    return {
        classNames: classNames,
        keyCodes: keyCodes,
        streamData: streamData
    };
}());
