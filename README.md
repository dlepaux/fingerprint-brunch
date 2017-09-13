# fingerprint-brunch [![Build Status][travis-badge]][travis] [![Join the chat at https://gitter.im/dlepaux/fingerprint-brunch](https://badges.gitter.im/dlepaux/fingerprint-brunch.svg)](https://gitter.im/dlepaux/fingerprint-brunch?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Greenkeeper badge](https://badges.greenkeeper.io/dlepaux/fingerprint-brunch.svg)](https://greenkeeper.io/)

A [Brunch][] plugin witch rename assets with a SHA for fingerprinted it.

Stable version are : [v1.0.11][] and [v1.2.5][]

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Testing / Issues](#testing)
- [Contributing](#contributing)
- [License](#license)

[![NPM](https://nodei.co/npm/fingerprint-brunch.png)](https://nodei.co/npm/fingerprint-brunch/)
[![NPM](https://nodei.co/npm-dl/fingerprint-brunch.png?months=3)](https://nodei.co/npm/fingerprint-brunch/)

## <a name="installation"></a> Installation

`npm install fingerprint-brunch --save-dev`


## <a name="usage"></a> Usage

### Configuration

_Optional_ You can override fingerprint-brunch's default options by updating your `brunch-config.coffee` with overrides.

```coffeescript
exports.config =
  # ...
  plugins:
    fingerprint:
      # Mapping file so your server can serve the right files
      manifest: './path/to/assets.json'

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

With the option `autoReplaceAndHash` to `true` you will have all fingerprint
With `srcBasePath` and `destBasePath` you can remove some part of your path files.


## <a name="options"></a> Options

### manifest

Type: `String`
Default: `./assets.json`

Mapping fingerprinted files

### srcBasePath

Type: `String`
Default: `exemple/`

The base Path you want to remove from the `key` string in the mapping file

### destBasePath

Type: `String`
Default: `out/`

The base Path you want to remove from the `value` string in the mapping file

### hashLength

Type: `Integer`
Default: `8`

How many digits of the SHA1

### autoClearOldFiles

Type: `Boolean`
Default: `false`

Remove old fingerprinted files (usefull in development env)

### targets

Type: `String|Array`
Default: `*`

Files you want to hash, default is all if not you can put an array of files in your `joinTo` like ['app.js', 'vendor.js', ...]

### environments

Type: `Array`
Default: `['production']`

Environment to fingerprint files

### alwaysRun

Type: `Boolean`
Default: `false`

Force fingerprint-brunch to run in all environments when true.

### autoReplaceAndHash

Type: `Boolean`
Default: `false`

Find assets in your `jointTo` files. It will be finded with `url('path/to/assets.jpg')` in your css (for now)

### publicRootPath

Type: `string`
Default: `/public`

For support multiple themes, you can set the public root path, exemple :

My config.paths.public is `../../public/theme/theme-1/` in `css` your fonts, images will be linked like that : `/theme/theme-1/img/troll.png`. 

You must set `publicRootPath` with `../../public` to conserve correct link in your css..

### manifestGenerationForce

Type: `Boolean`
Default: `false`

Force the generation of the manifest, event if there are no fingerprinted files

### assetsPatterns

Type: `RegExp Object`
Default: `new RegExp(/url\([\'\"]?[a-zA-Z0-9\-\/_.:]+\.(woff|woff2|eot|ttf|otf|jpg|jpeg|png|bmp|gif|svg)\??\#?[a-zA-Z0-9\-\/_]*[\'\"]?\)/g)`

Regex to match assets in css with `url()` attribute

### paramettersPattern

Type: `Regex`
Default: `/(\?|\&|\#)([^=]?)([^&]*)/gm`

Match hash and parameters in an URL

### verbose

Type: `Boolean`
Default: `false`

Return more info on compile


## <a name="testing"></a> Testing / Issues

Run `npm i && npm test`

Know Issue on Windows : the fingerprint (hash) of `sample.css`is differents cause the sha1 lib isn't same.


## <a name="contributing"></a> Contributing

Pull requests are welcome. If you add functionality, then please add unit tests to cover it.


## <a name="license"></a> License

« Copyright ©

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

The Software is provided “as is”, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the Software. »

[Brunch]: http://brunch.io
[travis]: https://travis-ci.org/dlepaux/fingerprint-brunch
[travis-badge]: https://img.shields.io/travis/dlepaux/fingerprint-brunch.svg?style=flat
[v1.0.11]: https://github.com/dlepaux/fingerprint-brunch/releases/tag/v1.0.11
[v1.2.5]: https://github.com/dlepaux/fingerprint-brunch/releases/tag/v1.2.5
