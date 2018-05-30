"use strict";
const fs       = require('fs');
const path     = require('path');
const CryptoJS = require('crypto-js');

class Fingerprint {
  
  /**
   * Set initial state of plugin, options, map
   */
  static initClass() {
    this.prototype.brunchPlugin = true;
    // Defaults options
    this.prototype.options = {
      // Mapping file so your server can serve the right files !!! put a './' before your path
      manifest: './assets.json',
      // The base Path you want to remove from the `key` string in the mapping file !!! put a './' before your path
      srcBasePath: './exemple/',
      // The base Path you want to remove from the `value` string in the mapping file !!! put a './' before your path
      destBasePath: './out/',
      // How many digits of the SHA1.
      hashLength: 8,
      // Remove old fingerprinted files
      autoClearOldFiles: false,
      // Files you want to hash, default is all else put an array of files like ['app.js', 'vendor.js', ...]
      targets: '*',
      // Environment to make hash on files
      environments: ['production'],
      // Force fingerprint-brunch to run in all environments when true.
      alwaysRun: false,
      // autoReplaceAndHash assets in css/js, like a font linked in an url() in your css
      autoReplaceAndHash: false,
      // public root path ( for multi theme support) !!! put a './' before your path
      publicRootPath: './public',
      // Force the generation of the manifest, event if there are no fingerprinted files
      manifestGenerationForce: false,
      // Asset to fingerprint (in public), files will be fingerprinted and added to the manifest
      foldersToFingerprint: false, // or ['/img'] or ['/img', '/svg']
      // Specific asset to fingerprint (in public)
      assetsToFingerprint: false, // or ['/img/troll.png'] or ['/img/troll.png', '/svg/logo.svg']

      // Assets pattern
      assetsPattern: new RegExp(/url\([\'\"]?[a-zA-Z0-9\-\/_.:]+\.(woff|woff2|eot|ttf|otf|jpg|jpeg|png|bmp|gif|svg)\??\#?[a-zA-Z0-9\-\/_]*[\'\"]?\)/g),
      // URL parameters pattern
      // authorized chars : ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=
      paramettersPattern: /(\?|\&|\#)([^=]?)([^&]*)/gm,
    };
    // Map of assets
    this.prototype.map = {};
  }

  /**
   * Override plugin options with config.plugins.fingerprint
   * @param  {Object} config This is the global config of the brunch-config file
   */
  constructor(config) {
    // Get Brunch global config
    this.config = config;
    // Merge config into this.options
    this.options = Object.assign(this.options, config && config.plugins && config.plugins.fingerprint || {});
  }

  /**
   * Brunch native method
   * @param  {Array}    generatedFiles Contain an array of object (path: {filePath})
   * @param  {Function} callback       Use for tests, in regular mode it's generaly map files
   */
  onCompile(generatedFiles, callback) {
    const that = this;

    // onCompile is ended
    const onCompileEnded = (err, filePath) => {
      if (that.options.foldersToFingerprint) {
        let callee = '_fingerprintDirs';
        if (typeof(that.options.foldersToFingerprint) == 'string') callee = '_fingerprintDir';
        return that[callee](that.options.foldersToFingerprint, () => {
          that._writeManifestAsync(() => {
            typeof(callback) == 'function' && callback(filePath);
          });
        })
      } else if (that.options.assetsToFingerprint) {
        return that._fingerprintAllResolver(that.options.assetsToFingerprint, (resolve) => resolve(), () => {
          that._writeManifestAsync(() => {
            typeof(callback) == 'function' && callback(filePath);
          });
        });
      } else {
        // Make array for manifest
        return that._writeManifestAsync(() => {
          typeof(callback) == 'function' && callback(filePath);
        });
      }
    }

    // Inspect files
    for (let file of Array.from(generatedFiles)) {
      // Set var with generatedFile
      const filePath = file.path;
      const dir      = path.dirname(filePath);
      const ext      = path.extname(filePath);
      const base     = path.basename(filePath, ext);

      // Delete old fingerprinted files if option's flag is enable
      if (this.options.autoClearOldFiles) this._clearOldFilesAsync(dir, base, ext);
      // Hash only file in targets option key
      if (this.options.targets === '*' || Array.from(this.options.targets).includes(base + ext)) {
        if (this.options.autoReplaceAndHash) {
          // Fingerprint sub files
          this._fingerprintAllAsync(filePath, onCompileEnded);
        } else {
          this._fingerprintOneAsync(filePath, onCompileEnded);
        }
      }
    }
  }

  /**
   * Normalize path between Win/Linux
   * @param  {String} pathFile Path to unixify
   * @return {String}          Path unixifyed
   */
  unixify(pathFile) {
    return pathFile.split('\\').join('/');
  }

  /**
   * Fingerprint file if it is fingerprintable
   * @param  {String}   filePath Path to file we want to fingerprint
   * @param  {Function} done     Callback(err, filePath)
   */
  _fingerprintOneAsync(filePath, done) {
    let fileNewName = filePath;
    if (this._isFingerprintable()) {
      // Just fingerprint targets
      this._fingerprintFileAsync(filePath, (err, fileNewName) => {
        if (err) return done(err);
        this._addPairToMap(filePath, fileNewName);
        done && done(null, filePath);
      });
    } else {
      this._addPairToMap(filePath, fileNewName);
      done && done(null, filePath);
    }
  }

  /**
   * Add pair; originalFileName => fingerprintedFileName
   * @param {String} fileInput  filePath with original name
   * @param {String} fileOutput filePath with fingerprinted name
   */
  _addPairToMap(input, output) {
    input = this._relativizePublicPath(input);
    output = this._relativizePublicPath(output);
    // Remove srcBasePath/destBasePath
    input = input.replace(this.options.srcBasePath, "");
    output = output.replace(this.options.destBasePath, "");
    // Adding to @map var
    this.map[input] = output;
  }

  /**
   * Relativize path; remove absolute begin path
   * @param  {String} pathFile Path to relativize
   * @return {String}          Relativized path
   */
  _relativizePublicPath(pathFile) {
    pathFile = this.unixify(pathFile);
    const pathPublicIndex = pathFile.indexOf(this.unixify(this.options.publicRootPath));
    if (pathPublicIndex !== 0) pathFile = pathFile.substring(pathPublicIndex);
    return pathFile;
  }

  /**
   * [_fingerprintDirs description]
   * @param  {[type]}   dirs [description]
   * @param  {Function} done [description]
   * @return {[type]}        [description]
   */
  _fingerprintDirs(dirs, done) {
    const that = this;
    let dirDoneCounter = 0;
    dirs.forEach((dir) => {
      that._fingerprintDir(dir, (err) => {
        if (err) return done && done(err);
        dirDoneCounter++;
        if (dirs.length == dirDoneCounter) return done && done();
      });
    })
  }


  /**
   * [_fingerprintDir description]
   * @param  {[type]}   dir  [description]
   * @param  {Function} done [description]
   * @return {[type]}        [description]
   */
  _fingerprintDir(dir, done) {
    const that = this;
    fs.readdir(path.join(that.config.paths.public, dir), function (err, files) {
      if (err) return done && done(err);
      files.forEach((part, index, theArray) => {
        theArray[index] = path.join(dir, part);
      });
      that._fingerprintAllResolver(files, (resolve) => resolve(), () => done && done());
    });
  }


  /**
   * [_fingerprintAllResolver description]
   * @param  {[type]} filePaths [description]
   * @param  {[type]} promise   [description]
   * @param  {[type]} resolver  [description]
   * @return {[type]}           [description]
   */
  _fingerprintAllResolver(filePaths, promise, resolver) {
    const that = this;
    const promiseArray = [];
    Object.keys(filePaths).forEach( function(key) {
      promiseArray.push(() => {
        return new Promise((resolve, reject) => {
          let match = null;
          let finalHash = null;

          if (filePaths[key].indexOf('url(') != -1) {
            // Save matched string and extract filePath
            match = new RegExp(that._parseStringToRegex(filePaths[key]), 'g');
            filePaths[key] = that._getPathFromCSS(filePaths[key]);

            // Save Hash from filePath and remove it from filePath
            finalHash = that._getHashFromURL(filePaths[key]);
            filePaths[key] = filePaths[key].replace(that.options.paramettersPattern, '');

            // Relative path with '../' at FIRST position is replaced with '/' for bootstrap font link
            if (filePaths[key].indexOf('../') === 0) filePaths[key] = filePaths[key].substring(2);
          }

          const targetPath = that.unixify(path.join(that.options.publicRootPath, filePaths[key]));

          // Adding to map
          if (typeof(that.map[targetPath]) == 'undefined') {
            that._fingerprintFileAsync(targetPath, (err, targetNewName) => {
              if (err) return resolve(err);
              that._addPairToMap(targetPath, path.join(that.config.paths.public, targetNewName.substring(that.config.paths.public.length)));
              // Rename unhashed filePath by the hashed new name
              return promise(resolve, targetNewName, finalHash, match);
            });
          // Resource is already in the map (maybe linked from an other file..) so we try to replace path with hashed one.
          } else {
            let targetNewName = that.map[targetPath];
            // Rename unhashed filePath by the hashed new name
            return promise(resolve, targetNewName, finalHash, match);
          }
        });
      });
    });
    // Resolve promises
    promiseArray.reduce((previousPromise, promise, index) => previousPromise.then(() => promise()), Promise.resolve()).then(() => resolver());
  }

  /**
   * Fingerprint all assets in the filePath and itself
   * @param  {String}   filePath File to fingerprint
   * @param  {Function} done     Callback(err, filePath)
   */
  _fingerprintAllAsync(filePath, done) {
    const that = this;
    // Return content of filePath and match pattern
    this._getFingerprintAllData(filePath, (data) => {
      if (data.filePaths !== null) {
        that._fingerprintAllResolver(data.filePaths, (resolve, targetNewName, finalHash, match) => {
          // Add real path into the css file
          data.fileContent = data.fileContent.replace(match, `url('${that.unixify(targetNewName.substring(that.options.publicRootPath.length - 2))}${finalHash}')`);
          resolve();
        }, () => {
          let fileNewName = filePath;
          if (that._isFingerprintable()) fileNewName = that._getFingerprintedPath(filePath, data.fileContent);
          // Write file to generate and rename it
          fs.writeFile(filePath, data.fileContent, (err) => {
            // if (err) return done(err); // how test this branch ?
            fs.rename(filePath, fileNewName, () => {
              that._addPairToMap(filePath, fileNewName);
              done && done(null, filePath);
            });
          });
        });
      } else {
        return this._fingerprintOneAsync(filePath, done);
      }
    });
  }

  /**
   * Get fileContent and filePaths to fingerprint into it
   * @param  {String}   filePath File to fingerprint
   * @param  {Function} done     Callback({fileContent, filePaths})
   */
  _getFingerprintAllData(filePath, done) {
    const that = this;
    fs.readFile(filePath, (err, data) => {
      const fileContent = data.toString();
      done && done({fileContent, filePaths:fileContent.match(that.options.assetsPattern)});
    });
  }

  // Extract paths from filePath
  /**
   * Get HASH (#imahash) from an URL
   * @param  {String} filePath Path to test
   * @return {String}          Return hash if it exist if not, empty string
   */
  _getHashFromURL(filePath) {
    let finalHash = '';
    const param = filePath.match(this.options.paramettersPattern);
    if (param !== null) {
      Object.keys(param).map(key => finalHash += param[key]);
    }
    return finalHash;
  }

  /**
   * Get real path from an 'url(path)' in CSS content
   * @param  {String} string CSS definition
   * @return {String}        Real path
   */
  _getPathFromCSS(string) {
    return string.substring(string.lastIndexOf("(")+1,string.lastIndexOf(")")).replace(/\"/g,'').replace(/\'/g,"");
  }

  /**
   * Convert string to searchable string regex
   * @param  {String} string Path
   * @return {String}        Valid regex string
   */
  _parseStringToRegex(string) {
    return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  /**
   * Test if environment permit to fingerprint file OR if we force it by flag
   * @return {Boolean} Allow or not to fingerprint file
   */
  _isFingerprintable() {
    return (Array.from(this.options.environments).includes(process.env.NODE_ENV || 'development')) || this.options.alwaysRun;
  }

  /**
   * Remove old fingerprinted files
   * @param  {String}   dir  Path to file directory
   * @param  {String}   base File name 
   * @param  {String}   ext  File extension
   * @param  {Function} done Callback(err)
   */
  _clearOldFilesAsync(dir, base, ext, done) {
    // Find and remove file in dir/base-{hash}.ext
    const pattern = new RegExp(base + '\\-\\w+\\' + ext + '$');
    fs.readdir(dir, function (err, files) {
      if (err) return done && done(err);
      for (let oldFile of Array.from(files)) {
        const filePath = path.normalize(dir + '/' + oldFile);
        if (pattern.test(oldFile)) fs.unlink(filePath, function(err) {
          if (err) return done && done(err);
        });
      }
      done && done()
    });
  }

  /**
   * Generate fingerprint signature from file content
   * @param  {Buffer} fileContent File content buffer
   * @return {String}             Fingerprint signature sized by hashLength
   */
  _getFingerprintFromFileContent(fileContent) {
    return CryptoJS.SHA1(fileContent.toString('utf8')).toString().substring(0, +(this.options.hashLength-1) + 1 || undefined);
  }

  /**
   * Generate fingerprinted filePath from original file
   * @param  {String} filePath    Path to file
   * @param  {Buffer} fileContent File content Buffer
   * @return {String}             Path to fingerprinted file
   */
  _getFingerprintedPath(filePath, fileContent) {
    let hash = this._getFingerprintFromFileContent(fileContent);
    const dir   = path.dirname(filePath);
    const ext   = path.extname(filePath);
    const base  = path.basename(filePath, ext);
    const newName = `${base}-${hash}${ext}`;
    return path.join(dir, newName);
  }

  /**
   * Read and rename file with his fingerprint
   * @param  {String}   filePath Path to file
   * @param  {Function} done     Callback(err, fileNewName)
   */
  _fingerprintFileAsync(filePath, done) {
    const that = this;
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) return done(err); // filePath + " does not exist !"
      const fileNewName = that._getFingerprintedPath(filePath, data);
      // Rename file, with hash
      fs.rename(filePath, fileNewName, () => {
        done && done(null, fileNewName);
      });
    })
  }

  /**
   * Write manifest
   * @param  {Function} done Callback(err)
   */
  _writeManifestAsync(done) {
    fs.access(this.options.manifest, fs.constants.R_OK, (err) => {
      // Merge array to keep not watched files
      if (err) {
        this._createManifestAsync(done);
      } else {
        this._mergeManifestAsync(done);
      }
    });
  }

  /**
   * Create Manifest
   * @param  {Object|Function}  map  Object with {filePath: fileNewPath}
   * @param  {Function}         done Callback(err)
   */
  _createManifestAsync(map = null, done) {
    map = map == null ? this.map : map;
    // Map is obtionnable
    if (typeof(map) == 'function') {
      done = map;
      map = this.map;
    }

    if (this._isFingerprintable() || this.options.manifestGenerationForce) {
      const output = JSON.stringify(map, null, "  ");
      fs.writeFile(this.options.manifest, output, (err) => {
        if (err) return done && done(err);
        done && done();
      });
    } else {
      done && done();
    }
  }

  /**
   * Merge current manifest with map
   * @param  {Function} done Callback(err)
   */
  _mergeManifestAsync(done) {
    const that = this;
    if (this._isFingerprintable() || this.options.manifestGenerationForce) {
      fs.readFile(this.options.manifest, 'utf-8', (err, data) => {
        if (err || data == '') return that._createManifestAsync(done);
        let manifest = JSON.parse(data);
        // Merge previous manifest with map
        manifest = Object.assign(manifest, that.map);
        that._createManifestAsync(manifest, done);
      });
    } else {
      done && done();
    }
  }
}
Fingerprint.initClass();

module.exports = Fingerprint;
