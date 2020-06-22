App = window.App || {};
App.VideoPlayerBitRate = (function VideoPlayer() {
    var playerStates = {
        IDLE: 'IDLE',
        NONE: 'NONE',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        READY: 'READY'
    };
    var JUMP_MILISECONDS = 3000;
    var FULLSCREEN_CLASS = 'fullscreenMode';
    var PlayerEvents = {
        BUFFERED: 'BUFFERED',
        RES_CHANGED: 'RES_CHANGED',
        ENDED: 'ENDED'
    };
    var TrackType = {
        VIDEO: 'VIDEO',
        AUDIO: 'AUDIO'
    };

    /**
     * Creates a new player instance
     *
     * @param {Object} config - contains player configuration
     * @param {Element} config.playerEl - element of type <object> that player will play in
     * @param {String} config.url - video url
     * @param {Element} config.controls - element containing controls for the player
     * @param {Object} [config.logger] - custom logger object
     * @param {Boolean} [config.set4KMode] - flag defining whether 4K mode should be set
     *
     * @returns {Object} - player instance
     */
    function create(config) {
        var logger = config.logger || console;
        var playerEl = config.playerEl;
        var timerEl = config.timerEl;
        var isFullscreen = false;
        var playerCoords = {
            x: playerEl.offsetLeft,
            y: playerEl.offsetTop,
            width: playerEl.offsetWidth,
            height: playerEl.offsetHeight
        };
        var resolutionWidth;
        var resolutionHeight;
        var listeners = {
            onbufferingstart: function onbufferingstart() {
                logger.log('Buffering start.');
            },
            onbufferingprogress: function onbufferingprogress(percent) {
                logger.log('Buffering progress data : ' + percent);
            },
            onbufferingcomplete: function onbufferingcomplete() {
                var event = document.createEvent('Event');

                logger.log('Buffering complete.');

                event.initEvent(PlayerEvents.BUFFERED, true, true);
                document.dispatchEvent(event);
            },
            oncurrentplaytime: function oncurrentplaytime(currentTime) {
                logger.log('Current playtime: ' + currentTime);
                updateTime(
                    currentTime,
                    webapis.avplay.getDuration()
                );
            },
            onevent: function onevent(eventType, eventData) {
                var event = document.createEvent('Event');

                logger.log('event type: ' + eventType + ', data: ' + eventData);

                if (eventType === 'PLAYER_MSG_RESOLUTION_CHANGED') {
                    event.initEvent(PlayerEvents.RES_CHANGED, true, true);
                    document.dispatchEvent(event);
                }
            },
            onstreamcompleted: function onstreamcompleted() {
                var event = document.createEvent('Event');

                logger.log('Stream Completed');
                timerEl.textContent = '';
                stop();

                event.initEvent(PlayerEvents.ENDED, true, true);
                document.dispatchEvent(event);
            },
            onerror: function onerror(eventType) {
                logger.error('event type error : ' + eventType);
            }
        };

        logger.log('Open: ' + config.url);

        // Check the screen width so that the AVPlay can be scaled accordingly
        tizen.systeminfo.getPropertyValue(
            'DISPLAY',
            function successHandler(data) {
                resolutionWidth = data.resolutionWidth;
                resolutionHeight = data.resolutionHeight;
                updatePlayerCoords(resolutionHeight, resolutionWidth);
                initialize(config.url);
            },
            function errorHandler() {
                resolutionWidth = window.innerWidth;
                resolutionHeight = window.innerHeight;
                initialize(config.url);
            }
        );

        function prepareAndPlay() {
            logger.log('Prepare');
            webapis.avplay.prepareAsync(play, logger.error);
        }

        function play() {
            try {
                switch (webapis.avplay.getState()) {
                    case playerStates.IDLE:
                        prepareAndPlay();
                        break;
                    case playerStates.READY: // Fallthrough
                    case playerStates.PAUSED:
                        webapis.avplay.play();
                        logger.log('Play');
                        break;
                    default:
                        logger.warn('Unhandled player state');
                        break;
                }
            } catch (error) {
                logger.error(error.message);
            }
        }

        /**
         * Needed for 'PlayPause' key
         */
        function playPause() {
            if (webapis.avplay.getState() === playerStates.PLAYING) {
                pause();
            } else {
                play();
            }
        }

        function stop() {
            var playerState = webapis.avplay.getState();

            if (playerState === playerStates.PLAYING || playerState === playerStates.PAUSED) {
                webapis.avplay.stop();
                logger.log('Video stopped');

                updateTime(
                    0,
                    webapis.avplay.getDuration()
                );

                if (isFullscreen) {
                    toggleFullscreen();
                }
            }
        }

        function pause() {
            var playerState = webapis.avplay.getState();

            if (playerState === playerStates.PLAYING || playerState === playerStates.READY) {
                webapis.avplay.pause();
                logger.log('Video paused');
            }
        }

        function ff() {
            try {
                webapis.avplay.jumpForward(JUMP_MILISECONDS);
                updateTime(
                    webapis.avplay.getCurrentTime(),
                    webapis.avplay.getDuration()
                );
            } catch (error) {
                logger.error('Failed fast forwarding: ' + error.message);
            }
        }

        function rew() {
            try {
                webapis.avplay.jumpBackward(JUMP_MILISECONDS);
                updateTime(
                    webapis.avplay.getCurrentTime(),
                    webapis.avplay.getDuration()
                );
            } catch (error) {
                logger.error('Failed rewinding: ' + error.message);
            }
        }

        function is4KSupported() {
            return webapis.productinfo.isUdPanelSupported();
        }

        /**
         * Set to TV to play UHD content.
         */
        function set4K() {
            webapis.avplay.setStreamingProperty('SET_MODE_4K', 'true');
            logger.log('4K mode is active');
        }

        /**
         * Function to set specific bitrates used to play the stream.
         * In case of Smooth Streaming STARTBITRATE and SKIPBITRATE values 'LOWEST', 'HIGHEST', 'AVERAGE' can be set.
         * For other streaming engines there must be numeric values.
         *
         * @param {Number} from  - Lower value of bitrates range.
         * @param {Number} to    - Higher value of the bitrates range.
         * @param {Number} start - Bitrate which should be used for initial chunks.
         * @param {Number} skip  - Bitrate that will not be used.
         */
        function setBitrate(from, to, start, skip) {
            var bitrates = '|BITRATES=' + from + '~' + to;
            var playerState = webapis.avplay.getState();
            var currentTime;

            if (start !== '' && start !== undefined) {
                bitrates += '|STARTBITRATE=' + start;
            }

            if (to !== '' && to !== undefined) {
                bitrates += '|SKIPBITRATE=' + skip;
            }

            try {
                if (playerState === playerStates.PLAYING || playerState === playerStates.PAUSED) {
                    currentTime = webapis.avplay.getCurrentTime();
                    webapis.avplay.stop();
                    webapis.avplay.setStreamingProperty('ADAPTIVE_INFO', bitrates);
                    webapis.avplay.prepareAsync(
                        function onSuccess() {
                            webapis.avplay.play();
                            webapis.avplay.seekTo(currentTime);
                        },
                        function onError() {
                            throw new Error('Something went wrong while starting player with new bitrate');
                        }
                    );
                } else {
                    webapis.avplay.setStreamingProperty('ADAPTIVE_INFO', bitrates);
                }
            } catch (error) {
                logger.error('Failed setting bitrates: ' + error.message);
            }
        }

        /**
         * Function to change current VIDEO/AUDIO/TEXT track
         *
         * @param {String} type  - Streaming type received with webapis.avplay.getTotalTrackInfo(),
         *                          possible values are: VIDEO, AUDIO, TEXT.
         * @param {Number} index - Track id received with webapis.avplay.getTotalTrackInfo().
         */
        function setTrack(type, index) {
            try {
                webapis.avplay.setSelectTrack(type, index);
            } catch (error) {
                logger.error('Failed setting track: ' + error.message);
            }
        }

        /**
         * @returns {Object} - information about all available stream tracks
         */
        function getTracks() {
            var tracksObject = {};
            var trackInfo;

            try {
                trackInfo = webapis.avplay.getTotalTrackInfo();
                tracksObject = {
                    type: typeof trackInfo,
                    length: trackInfo.length,
                    tracks: trackInfo.map(function mapTrack(track) {
                        return {
                            index: track.index,
                            type: track.type,
                            extraInfo: track.extra_info
                        };
                    })
                };
            } catch (error) {
                logger.error('Failed getting tracks: ' + error.message);
            }
            return tracksObject;
        }

        /**
         * @returns {Object} - streaming properties
         */
        function getProperties() {
            var properties = {};

            try {
                properties = {
                    availableBitrate: webapis.avplay.getStreamingProperty('AVAILABLE_BITRATE'),
                    currentBandwidth: webapis.avplay.getStreamingProperty('CURRENT_BANDWITH'),
                    duration: webapis.avplay.getStreamingProperty('DURATION'),
                    bufferSize: webapis.avplay.getStreamingProperty('BUFFER_SIZE'),
                    startFragment: webapis.avplay.getStreamingProperty('START_FRAGMENT'),
                    cookie: webapis.avplay.getStreamingProperty('COOKIE'),
                    customMessage: webapis.avplay.getStreamingProperty('CUSTOM_MESSAGE')
                };
            } catch (error) {
                logger.error('Failed getting properties: ' + error.message);
            }

            return properties;
        }

        /**
         * Switch between full screen mode and normal windowed mode.
         */
        function toggleFullscreen() {
            if (!isFullscreen) {
                try {
                    webapis.avplay.setDisplayRect(0, 0, resolutionWidth, resolutionHeight);
                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_FULL_SCREEN');
                } catch (error) {
                    logger.log(error.message);
                }

                logger.log('Fullscreen on');
                playerEl.classList.add(FULLSCREEN_CLASS);
                timerEl.classList.add(FULLSCREEN_CLASS);
                config.controls.classList.add(FULLSCREEN_CLASS);
                isFullscreen = true;
            } else {
                try {
                    webapis.avplay.setDisplayRect(
                        playerCoords.x,
                        playerCoords.y,
                        playerCoords.width,
                        playerCoords.height
                    );
                    webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');
                } catch (error) {
                    logger.log(error.message);
                }

                logger.log('Fullscreen off');
                playerEl.classList.remove(FULLSCREEN_CLASS);
                config.controls.classList.remove(FULLSCREEN_CLASS);
                timerEl.classList.remove(FULLSCREEN_CLASS);
                isFullscreen = false;
            }
        }

        function initialize(url) {
            try {
                webapis.avplay.open(url);
                webapis.avplay.setDisplayRect(
                    playerCoords.x,
                    playerCoords.y,
                    playerCoords.width,
                    playerCoords.height
                );
                webapis.avplay.setListener(listeners);
                webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO');

                if (config.set4KMode) {
                    if (is4KSupported()) {
                        set4K();
                    } else {
                        logger.log('4K is not supported');
                    }
                }
            } catch (error) {
                logger.error(error.message);
            }
        }

        function changeVideo(url) {
            webapis.avplay.close();

            logger.log('Open: ' + url);

            initialize(url);
        }

        function updateTime(currentTime, duration) {
            timerEl.textContent = App.Utils.msToReadableTime(currentTime)
                + ' / '
                + App.Utils.msToReadableTime(duration);
        }

        function updatePlayerCoords(screenHeight, screenWidth) {
            var viewPortHeight = 1080;
            var viewPortWidth = 1920;
            playerCoords.x *= screenWidth / viewPortWidth;
            playerCoords.y *= screenHeight / viewPortHeight;
            playerCoords.width *= screenWidth / viewPortWidth;
            playerCoords.height *= screenHeight / viewPortHeight;
        }

        function getCurrentStreamInfo() {
            return webapis.avplay.getCurrentStreamInfo();
        }

        return {
            play: play,
            playPause: playPause,
            stop: stop,
            pause: pause,
            ff: ff,
            rew: rew,
            setBitrate: setBitrate,
            setTrack: setTrack,
            getTracks: getTracks,
            getProperties: getProperties,
            toggleFullscreen: toggleFullscreen,
            getCurrentStreamInfo: getCurrentStreamInfo,
            changeVideo: changeVideo
        };
    }

    return {
        create: create,
        playerStates: playerStates,
        PlayerEvents: PlayerEvents,
        TrackType: TrackType
    };
}());
