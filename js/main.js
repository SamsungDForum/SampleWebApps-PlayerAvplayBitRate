App = window.App || {};

App.Main = (function Main() {
    var player;
    var logger;

    var playerStates = App.VideoPlayerBitRate.playerStates;
    var streamData = App.Config.streamData;
    var keyCodes = App.Config.keyCodes;
    var classNames = App.Config.classNames;

    var basicMenu = App.Navigation.getMenu('Basic');

    var dataEl;
    var popupEl;
    var videoListEl;
    var selectedVideoEl;

    var streamTracks = []; // List of possible tracks from manifest
    var shouldStreamInfoUdate = true; // Flag marking if reload of video shoud reload resolution buttons

    var current = { // Describes visual state of the application
        trackIndex: 'video-auto', // Which track is playing
        choosen: 'video-auto' // Which track user selected
    };


    function onReturn() {
        var playerState = player.getState();
        if (playerState !== playerStates.IDLE && playerState !== playerStates.NONE) {
            player.stop();
        } else {
            tizen.application.getCurrentApplication().hide();
        }
    }

    function registerKeyHandler(keyWithHandler) {
        App.KeyHandler.registerKeyHandler(keyWithHandler.keyCode, keyWithHandler.keyName, keyWithHandler.handler);
    }

    function registerKeyHandlers() {
        var keysWithHandlers = [
            { keyCode: keyCodes.MEDIA_PLAY_PAUSE, handler: player.playPause, keyName: 'MediaPlayPause' },
            { keyCode: keyCodes.MEDIA_PLAY, handler: player.play, keyName: 'MediaPlay' },
            { keyCode: keyCodes.MEDIA_PAUSE, handler: player.pause, keyName: 'MediaPause' },
            { keyCode: keyCodes.MEDIA_STOP, handler: player.stop, keyName: 'MediaStop' },
            { keyCode: keyCodes.MEDIA_FAST_FORWARD, handler: player.ff, keyName: 'MediaFastForward' },
            { keyCode: keyCodes.MEDIA_REWIND, handler: player.rew, keyName: 'MediaRewind' },
            { keyCode: keyCodes.KEY_1, handler: player.toggleUhd, keyName: '1' },
            { keyCode: keyCodes.KEY_2, handler: player.getTracks, keyName: '2' },
            { keyCode: keyCodes.KEY_3, handler: player.getProperties, keyName: '3' },
            { keyCode: keyCodes.RETURN, handler: onReturn }
        ];

        keysWithHandlers.forEach(registerKeyHandler);
    }

    function addButtonsHandlers() {
        var buttonsWithHandlers = [
            { elementSelector: '.play', handler: player.play },
            { elementSelector: '.pause', handler: player.pause },
            { elementSelector: '.stop', handler: player.stop },
            { elementSelector: '.ff', handler: player.ff },
            { elementSelector: '.rew', handler: player.rew },
            { elementSelector: '.fullscreen', handler: player.toggleFullscreen },
            { elementSelector: '.close', handler: returnFromPopup },
            { elementSelector: '.selected-video', handler: runPopupMenu }

        ];

        App.KeyHandler.addHandlersForButtons(buttonsWithHandlers);

        App.KeyHandler.addHandlerForDelegated('.data', streamButtonsHandler);
        App.KeyHandler.addHandlerForDelegated('#video-list', changeVideoHandler);
    }

    function runPopupMenu() {
        popupEl.classList.toggle('hidden');
        App.Navigation.changeActiveMenu('popupMenu');
    }

    function returnFromPopup() {
        popupEl.classList.toggle('hidden');
        App.Navigation.changeActiveMenu('Basic');
    }

    /**
     * This function takes button user clicked in a popup window,
     * and chooses correct stream, than closes popup.
     * @param {HTMLElement} el - HTML element clicked by user
     * @property {string} videoIndexStr - stringified index from streamData array
     * @property {number} videoIndex - parsed index from streamData array
     * @property {Object} stream - object containing manifest and streamName fields required by changeVideo function
     */
    function changeVideoHandler(el) {
        var videoIndexStr = el.id.slice(7);
        var videoIndex = parseInt(videoIndexStr, 10);
        var stream;
        if (!Number.isNaN(videoIndex)) {
            stream = streamData[videoIndex];
            changeVideo(stream);
            returnFromPopup();
        } else {
            returnFromPopup();
            logger.error('Something went wrong... This stream can\' be choosen');
        }
    }

    /**
     * This function takes button user clicked from Video section,
     * and sets aproperiate bitrate for player.
     * @param {HTMLElement} el - HTML element clicked by user
     * @property {string} index - Tells which resolution is choosen
     * @property {string} lowerLimit - Lower limit for the birate, at auto it's 0
     * @property {string} upperLimit - Upper limit for the bitrate,
     *  at auto it's some really high number, so all bitrates would be lower.
    */
    function streamButtonsHandler(el) {
        var index = el.id.slice(6);
        var lowerLimit = '0';
        var upperLimit = '10000000000000';

        if (index.slice(-4) === 'auto') {
            player.setBitrate(lowerLimit, upperLimit);
            switchTo(index, classNames.CHOOSEN);
        } else {
            switchTo(index, classNames.CHOOSEN);
            lowerLimit = +streamTracks[index].extraInfo.Bit_rate - 100;
            upperLimit = +streamTracks[index].extraInfo.Bit_rate + 100;
            player.setBitrate(lowerLimit, upperLimit);
        }

        updateStreamInfo();
    }

    function registerVideoMenu() {
        App.Navigation.registerMenu({
            domEl: dataEl,
            name: 'VideoMenu',
            alignment: 'vertical',
            previousMenu: 'chooseVideoButton',
            nextMenu: 'Logs',
            onAfterLastItem: function () {
                App.Navigation.changeActiveMenu('Basic');
            }
        });
    }

    function unregisterVideoMenu() {
        App.Navigation.unregisterMenu('VideoMenu');
    }

    function registerNavigation() {
        registerVideoMenu();

        App.Navigation.registerMenu({
            domEl: document.querySelector('#video-select'),
            name: 'chooseVideoButton',
            nextMenu: 'Basic',
            onAfterLastItem: function () {
                App.Navigation.changeActiveMenu('VideoMenu');
            }
        });

        App.Navigation.registerMenu({
            domEl: document.querySelector('#closeButton'),
            name: 'closePopup',
            nextMenu: 'popupMenu',
            previousMenu: 'popupMenu',
            onAfterLastItem: function () {
                App.Navigation.changeActiveMenu('popupMenu');
            },
            onBeforeFirstItem: function () {
                App.Navigation.changeActiveMenu('popupMenu');
            }
        });

        App.Navigation.registerMenu({
            domEl: videoListEl,
            name: 'popupMenu',
            alignment: 'vertical',
            onActiveItemChanged: scroll,
            nextMenu: 'closePopup'
        });

        basicMenu.previousMenu = 'chooseVideoButton';
    }

    function scroll(focusedEl) {
        App.Utils.scrollToCurrent(videoListEl, focusedEl);
    }

    /**
     * This function takes some (should be) unique, and text to be inputed,
     * and creates button appended to chosen element, making it navigateable
     * @param {*} element - element, on which new button will be appended
     * @param {*} id - hopefully unique id to be given to newly created button
     * @param {*} data - text displayed on the button
     */
    function appendButtonToEl(element, id, data) {
        var newEl = document.createElement('button');

        newEl.textContent = data;
        newEl.setAttribute('id', id);
        newEl.setAttribute('data-list-item', '');

        element.appendChild(newEl);
    }

    /**
     * This function takes streams provided in config file,
     * and pushes them into popup window, with aproperiete index,
     * so the user will be able to choose which one
     * is suposed to be playing.
     */
    function setStreams() {
        streamData.forEach(function appendStreamToPopup(streamObj, index) {
            appendButtonToEl(videoListEl, 'stream-' + index, streamObj.streamName);
        });
    }

    /**
     * This function uses player method getTracks,
     * and appends video tracks from the manifest
     * to the screen so the user can see
     * which one is currently playing
     * and choose which one should.
     */
    function setStreamTracks() {
        var availableTracks = player.getTracks();
        var i;

        current.trackIndex = 'video-auto';
        current.choosen = 'video-auto';

        unregisterVideoMenu();

        dataEl.innerHTML = '<h3>Video</h3>'
            + '<button data-list-item id="track-video-auto" class="'
            + classNames.CURRENT + ' ' + classNames.CHOOSEN
            + '">Auto</button>';
        streamTracks = [];

        registerVideoMenu();

        for (i = 0; i < availableTracks.length; i += 1) {
            try {
                availableTracks.tracks[i].extraInfo = JSON.parse(availableTracks.tracks[i].extraInfo);
            } catch (e) {
                logger.error(e);
            }

            if (availableTracks.tracks[i].type === App.VideoPlayerBitRate.TrackType.VIDEO) {
                streamTracks.push(availableTracks.tracks[i]);
                appendButtonToEl(
                    dataEl,
                    'track-' + i,
                    availableTracks.tracks[i].extraInfo.Height
                    + 'p ('
                    + availableTracks.tracks[i].extraInfo.Bit_rate
                    + ')'
                );
            }
        }

        updateStreamInfo();
    }

    /**
     * This function recieves string given by avplay API,
     * and parses it to retrieve stream data which matched,
     * with available stream enables user to recieve streams index
     * @param {string} data - Stringified object send by avplay API
     */
    function getIndexFromData(data) {
        var parsedData;
        var searchedResolution;
        var searchedBitRate;
        var index;

        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            logger.error(e);
        }

        searchedBitRate = parsedData.Bit_rate;
        searchedResolution = parsedData.Height;

        streamTracks.forEach(function match(obj) {
            // Check if height is correct,
            // then if either there was no index given before,
            // or this index is more likely as current bitrate is also higher than this,
            // use current object index.
            if (
                (searchedResolution && searchedResolution === obj.extraInfo.Height)
                && (!index || obj.extraInfo.Bit_rate <= searchedBitRate)
            ) {
                index = obj.index;
            }
        });

        return index || 0;
    }

    /**
     * This fucntion swithces the class from one HTML element to another
     * @param {string} newElementIndex - index of element on wich the class now should be.
     * @param {string} className - which class is beeing switched, either 'choosen' or 'current'
     */
    function switchTo(newElementIndex, className) {
        var currentIndex;
        var currentEl;
        var newEl = document.querySelector('#track-' + newElementIndex);

        if (className === classNames.CHOOSEN) {
            currentIndex = current.choosen;
            current.choosen = newElementIndex;
        } else if (className === classNames.CURRENT) {
            currentIndex = current.trackIndex;
            current.trackIndex = newElementIndex;
        }

        currentEl = document.querySelector('#track-' + currentIndex);

        if (currentEl) {
            currentEl.classList.remove(className);
        }

        if (newEl) {
            newEl.classList.add(className);
        }
    }

    /**
     * This function retrieves currently playing stream from player
     * and marks it on the screen
     */
    function updateStreamInfo() {
        var currentStreamInfo = player.getCurrentStreamInfo();
        var objIndex;
        var i = 0;

        for (i = 0; i < currentStreamInfo.length; i += 1) {
            if (currentStreamInfo[i].type === App.VideoPlayerBitRate.TrackType.VIDEO) {
                objIndex = getIndexFromData(currentStreamInfo[i].extra_info);
                switchTo(objIndex, classNames.CURRENT);
            }
        }
    }

    /**
     * This function changes currently playing video in AVPlayer,
     * into one specified as stream.manifest, also updating data on the screen,
     * to match newly choosen video.
     * @param {Object} stream - object with properites manifest, and stream name
     */
    function changeVideo(stream) {
        player.changeVideo(stream.manifest);
        shouldStreamInfoUdate = true;
        selectedVideoEl.innerHTML = stream.streamName;
        player.play();
    }

    window.onload = function onload() {
        var loggerContainer = document.querySelector('.logsContainer');
        var playerLogger = App.Logger.create({
            loggerEl: loggerContainer,
            loggerName: 'Player',
            logLevel: App.Logger.logLevels.ALL
        });
        var playerConfig = {
            url: streamData[0].manifest,
            playerEl: document.querySelector('#av-player'),
            controls: document.querySelector('.buttons'),
            timerEl: document.querySelector('.time'),
            logger: playerLogger
        };

        logger = App.Logger.create({
            loggerEl: loggerContainer,
            loggerName: 'Main',
            logLevel: App.Logger.logLevels.ALL
        });

        dataEl = document.querySelector('.data');
        popupEl = document.querySelector('.popup-box');
        videoListEl = document.querySelector('#video-list');
        selectedVideoEl = document.querySelector('.selected-video');

        // initialize player - loaded from videoPlayerBitRate.js
        player = App.VideoPlayerBitRate.create(playerConfig);

        registerNavigation();
        setStreams();
        registerKeyHandlers();
        addButtonsHandlers();

        document.addEventListener(App.VideoPlayerBitRate.PlayerEvents.BUFFERED, function () {
            if (shouldStreamInfoUdate) {
                setStreamTracks();
                shouldStreamInfoUdate = false;
            } else {
                updateStreamInfo();
            }
        });

        document.addEventListener(App.VideoPlayerBitRate.PlayerEvents.RES_CHANGED, function () {
            updateStreamInfo();
        });

        document.addEventListener(App.VideoPlayerBitRate.PlayerEvents.ENDED, function () {
            switchTo('video-auto', classNames.CURRENT);
        });
    };
}());
