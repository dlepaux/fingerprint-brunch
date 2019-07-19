# fingerprint-brunch [![Greenkeeper badge](https://badges.greenkeeper.io/dlepaux/fingerprint-brunch.svg)](https://greenkeeper.io/) [![Build Status](https://travis-ci.org/dlepaux/fingerprint-brunch.svg?branch=master)](https://travis-ci.org/dlepaux/fingerprint-brunch) [![Coverage Status](https://coveralls.io/repos/github/dlepaux/fingerprint-brunch/badge.svg?branch=master)](https://coveralls.io/github/dlepaux/fingerprint-brunch?branch=master) [![Join the chat at https://gitter.im/dlepaux/fingerprint-brunch](https://badges.gitter.im/dlepaux/fingerprint-brunch.svg)](https://gitter.im/dlepaux/fingerprint-brunch?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

<p align="center">
  <p align="center">
    <img src="./fingerprint.svg" height=128>
  </p>
</p>

A [Brunch][] plugin which renames assets with a SHA (generated from file content) to fingerprint it.

You're allowed to fingerprint specific files, assets folders, generated files and css linked assets.

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Testing / Issues](#testing)
- [Contributing](#contributing)
- [License](#license)

## <a name="installation"></a> Installation

`npm install fingerprint-brunch --save-dev`


## <a name="usage"></a> Usage

You can find [here](https://github.com/dlepaux/fingerprint-brunch-example) a working setup with fingerprint-brunch  

### Configuration

_Optional_ You can override fingerprint-brunch's default options by updating your `brunch-config.coffee` with your custom parameters.

* __manifest__: _(`String`)_ Defaults to `./assets.json`
  - Mapping fingerprinted files
* __srcBasePath__: _(`String`)_ Defaults to `example/`
  - The base Path you want to remove from the `key` string in the mapping file
* __destBasePath__: _(`String`)_ Defaults to `out/`
  - The base Path you want to remove from the `value` string in the mapping file
* __hashLength__: _(`Integer`)_ Defaults to `8`
  - How many digits of the SHA1
* __autoClearOldFiles__: _(`Boolean`)_ Defaults to `false`
  - Remove old fingerprinted files (usefull in development env)
* __targets__: _(`String|Array`)_ Defaults to `*`
  - Files you want to hash, default is all if not you can put an array of files in your `joinTo` like ['app.js', 'vendor.js', ...]
* __environments__: _(`Array`)_ Defaults to `['production']`
  - Environment to fingerprint files
* __alwaysRun__: _(`Boolean`)_ Defaults to `false`
  - Force fingerprint-brunch to run in all environments when true.
* __autoReplaceAndHash__: _(`Boolean`)_ Defaults to `false`
  - Find assets in your `jointTo` files. It will be finded with `url('path/to/assets.jpg')` in your css (for now)
* __assetsPrefix__: _(`Boolean|String`)_ Defaults to `false`
  - Prefix to prepend to replaced assets path.
* __publicRootPath__: _(`string`)_ Defaults to `/public`
  - For support multiple themes, you can set the public root path, exemple :
  - My config.paths.public is `../../public/theme/theme-1/` in `css` your fonts, images will be linked like that : `/theme/theme-1/img/troll.png`. 
  - You must set `publicRootPath` with `../../public` to conserve correct link in your css..
* __manifestGenerationForce__: _(`Boolean`)_ Defaults to `false`
  - Force the generation of the manifest, event if there are no fingerprinted files
* __foldersToFingerprint__: _(`Boolean|String|Array`)_ Defaults to  `false`
  - Asset to fingerprint (in brunch config `public`), all files will be fingerprinted and added to the manifest
  - Usage : `'/img'` or `['/img', '/svg']`
* __assetsToFingerprint__: _(`Boolean|Array`)_ Defaults to `false`
  - Specific asset to fingerprint (in public)
  - Usage : `['/img/troll.png']` or `['/img/troll.png', '/svg/logo.svg']`
* __assetsPatterns__: _(`RegExp Object`)_ Defaults to `new RegExp(/url\([\'\"]?[a-zA-Z0-9\-\/_.:]+\.(woff|woff2|eot|ttf|otf|jpg|jpeg|png|bmp|gif|svg)\??\#?[a-zA-Z0-9\-\/_]*[\'\"]?\)/g)`
  - Regex to match assets in css with `url()` attribute
* __paramettersPattern__: _(`Regex`)_ Defaults to `/(\?|\&|\#)([^=]?)([^&]*)/gm`
  - Match hash and parameters in an URL

### Example

```coffeescript
exports.config =
  # ...
  plugins:
    fingerprint:
      manifest: './assets.json'
      srcBasePath: './exemple/'
      destBasePath: './out/'
      hashLength: 8
      autoClearOldFiles: false
      targets: '*'
      environments: ['production']
      alwaysRun: false
      autoReplaceAndHash: false
      publicRootPath: './public'
      manifestGenerationForce: false
      foldersToFingerprint: false
      assetsToFingerprint: false
```

### The Manifest

```json
{
  "css/master.css": "css/master-364b42a1.css",
  "js/master.js": "js/master-cb60c02b.js",
  "img/troll.png": "img/troll-5f2d5cbe.png",
  "fonts/font.eot": "fonts/font-45d860a3.eot",
  "fonts/font.woff": "fonts/font-6ced13b9.woff",
  "fonts/font.ttf": "fonts/font-82c653e7.ttf",
  "fonts/font.svg": "fonts/font-52343d4f.svg"
}
```

##### Fingerprint All
To get this kind of result in your manifest you need to :
- Set `autoReplaceAndHash` to `true`
- Or set `foldersToFingerprint` pointing to one folder `./img`, or many `['./img', './svg']`
- Or set `assetsToFingerprint` pointing to files `['./img/troll.png']`

##### Cleaning Manifest

Use `srcBasePath` and `destBasePath` to remove some part of path files in the manifest.


## <a name="options"></a> Options

### assetsPrefix

Sometimes you may want to add a prefix to assets when replacing their path in your compiled css/js.

Say you have a CSS file containing:

```css
.logo {
  background-image: url('logo.svg');
}
```

once replaced, the content would look like:

```css
.logo {
  background-image: url('logo-f98d59ab3.svg');
}
```

if you were to set `assetsPrefix: '/custom/'` the result would be:

```css
.logo {
  background-image: url('/custom/logo-f98d59ab3.svg');
}
```

_Note: This could also be leveraged to prepend a CDN url for instance._


## <a name="testing"></a> Testing / Issues

Run `npm i && npm test`


## <a name="contributing"></a> Contributing

Pull requests are welcome. If you add functionality, then please add unit tests to cover it.

[Brunch]: http://brunch.io
[travis]: https://travis-ci.org/dlepaux/fingerprint-brunch
[travis-badge]: https://img.shields.io/travis/dlepaux/fingerprint-brunch.svg?style=flat
