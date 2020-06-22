# AVPlay Bitrate Indicator

This application demonstrates the usage of `webapis.avplay` API. With this API it is possible to have a video player in application. AVPlay is alternative to HTML5 player and has many advantages over it including: wider range of codecs and formats, DRMs support, hardware acceleration.
It is highly recommended for handling videos in SmartTV applications.

Adaptive streaming takes many versions of same media and plays accordingly to users bandwith and CPU capacity.
Thanks to this application user will be able to see which video track is used at the moment by avplay from MPEG-DASH adaptive stream.
User will be able to switch beetween tracks and see how it affects video quality.


## How to use the AVPlay Bitrate Indicator application

Use TV remote controller to navigate.

Under Current Video label, there is button letting user switch video which is currently playing.

Under Video label, there are buttons letting user see how adaptive stream is playing. Red triangle points to a box with current bitrate,
while red border marks which bitrate was choosen by user.

If user wants to add owned stream to this application, one needs to add it to an array `streamData` in `config.js` file in form: 
```
{
    manifest: 'Here should be link to the manifest file of the stream in string form',
    streamName: 'Here should be string with the name of the stream to be displayed on the screen'
}
```


## Supported platforms

2015 and newer


## Prerequisites

To use `webapis.avplay` API, embed below script into your `index.html`:

```html
<script src="$WEBAPIS/webapis/webapis.js"></script>
```

## Privileges and metadata

In order to use `webapis.avplay` API the following privilege must be included in `config.xml`:

```xml
<tizen:privilege name="http://developer.samsung.com/privilege/avplay" />
```

### File structure

```
PlayerAvplayBitRate/ - PlayerAvplayBitRate sample app root folder
│
├── assets/ - resources used by this app
│   │
│   ├── JosefinSans-Light.ttf - font used in application
│   └── RobotoMono-Regular.ttf - font used in application
│
├── css/ - styles used in the application
│   │
│   ├── main.css - styles specific for the application
│   └── style.css - style for application's template
│
├── js/ - scripts used in the application
│   │
│   ├── init.js - script that runs before any other for setup purpose
│   ├── keyhandler.js - module responsible for handling keydown events
│   ├── logger.js - module allowing user to register logger instances
│   ├── main.js - main application script
│   ├── navigation.js - module responsible for handling in-app focus and navigation
│   ├── utils.js - module with useful tools used through application
│   └── videoPlayerBitRate.js - module controlling AVPlay player with bitrate choice addition
│
├── CHANGELOG.md - changes for each version of application
├── config.xml - application's configuration file
├── icon.png - application's icon
├── index.html - main document
└── README.md - this file
```

## Other resources

*  **AVPlay API**  
  https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/avplay-api

* **AVPlay guide**  
  https://developer.samsung.com/tv/develop/guides/multimedia/media-playback/using-avplay


## Copyright and License

**Copyright 2019 Samsung Electronics, Inc.**

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
