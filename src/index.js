"use strict";
const fs       = require('fs');
const path     = require('path');
const CryptoJS = require('crypto-js');

class Fingerprint {
  
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

  constructor(config) {
    // Get Brunch global config
    this.config = config;
    // Merge config into this.options
    this.options = Object.assign(this.options, config && config.plugins && config.plugins.fingerprint || {});
  }

  // Main method
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
    let treatedFiles = 0;
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
        treatedFiles++;
        if (this.options.autoReplaceAndHash) {
          // Fingerprint sub files
          this._findAndReplaceSubAssetsAsync(filePath, onCompileEnded);
        } else {
          this._makeCoffee(filePath, onCompileEnded);
        }
      }
    }

    // Close onCompile if any files are treated
    // if (treatedFiles > 0) onCompileEnded();
  }

  unixify(pathFile) {
    return pathFile.split('\\').join('/');
  }

  // Wana coffee?
  _makeCoffee(filePath, done) {
    let fileNewName = filePath;
    if (this._isFingerprintable()) {
      // Just fingerprint targets
      this._fingerprintFileAsync(filePath, (err, fileNewName) => {
        if (err) return done(err);
        this._addToMap(filePath, fileNewName);
        done && done(null, filePath);
      });
    } else {
      this._addToMap(filePath, fileNewName);
      done && done(null, filePath);
    }
  }

  // Unixify & Remove part from original path
  _addToMap(fileInput, fileOutput) {
    fileInput = this._removePathBeforePublic(fileInput);
    fileOutput = this._removePathBeforePublic(fileOutput);
    // Remove srcBasePath/destBasePath
    fileInput = fileInput.replace(this.options.srcBasePath, "");
    fileOutput = fileOutput.replace(this.options.destBasePath, "");
    // Adding to @map var
    this.map[fileInput] = fileOutput;
  }

  // Remove path before the public
  _removePathBeforePublic(pathFile) {
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
    this._matchAssetsPattern(filePath, (data) => {
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
        return this._makeCoffee(filePath, done);
      }
    });
  }

  _matchAssetsPattern(filePath, done) {
    const that = this;
    fs.readFile(filePath, (err, data) => {
      const fileContent = data.toString();
      done && done({fileContent, filePaths:fileContent.match(that.options.assetsPattern)});
    });
  }

  // Extract paths from filePath
  _extractHashFromURL(filePath) {
    let finalHash = '';
    const param = filePath.match(this.options.paramettersPattern);
    if (param !== null) {
      Object.keys(param).map(key => finalHash += param[key]);
    }
    return finalHash;
  }

  // Extract URL from url('>url<')
  _extractURL(string) {
    return string.substring(string.lastIndexOf("(")+1,string.lastIndexOf(")")).replace(/\"/g,'').replace(/\'/g,"");
  }

  // Escape strng for regex
  _escapeStringToRegex(string) {
    return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  // IsFingerprintable
  _isFingerprintable() {
    return (Array.from(this.options.environments).includes(process.env.NODE_ENV || 'development')) || this.options.alwaysRun;
  }

  // Clear all the fingerprinted files
  _clearOldFilesAsync(dir, base, ext, done) {
    // Find and remove file in dir/base-{hash}.ext
    const pattern = new RegExp(base + '\\-\\w+\\' + ext + '$');
    fs.readdir(dir, function (err, files) {
      if (err) return done && done(err);
      for (let oldFile of Array.from(files)) {
        const filePath = path.normalize(dir + '/' + oldFile);
        if (pattern.test(oldFile)) fs.unlink(filePath);
      }
      done && done(null)
    });
  }

  // Make hash from fileContent
  _makeHashFromFileContent(fileContent) {
    return CryptoJS.SHA1(fileContent.toString('utf8')).toString().substring(0, +(this.options.hashLength-1) + 1 || undefined);
  }

  // Compose file name
  _fingerprintCompose(filePath, fileContent) {
    let hash = this._makeHashFromFileContent(fileContent);
    const dir   = path.dirname(filePath);
    const ext   = path.extname(filePath);
    const base  = path.basename(filePath, ext);
    const newName = `${base}-${hash}${ext}`;
    return path.join(dir, newName);
  }

  // Rename file with his new fingerprint
  _fingerprintFileAsync(filePath, done) {
    const that = this;
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) return done(err); // filePath + " does not exist !"
      const fileNewName = that._fingerprintCompose(filePath, data);
      // Rename file, with hash
      fs.rename(filePath, fileNewName, () => {
        done && done(null, fileNewName);
      });
    })
  }

  // Write manifest (Finish onCompile)
  // Make array for manifest
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

  // Write a new manifest
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

  // Merging existing manifest with new entree
  _mergeManifestAsync(done) {
    const that = this;
    if (this._isFingerprintable() || this.options.manifestGenerationForce) {
      fs.readFile(this.options.manifest, 'utf-8', (err, data) => {
        if (err) return that._createManifestAsync(done);
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
