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
    // onCompile is ended
    const onCompileEnded = (err, filePath) => {
      // Make array for manifest
      return this._writeManifestAsync(() => {
        typeof(callback) == 'function' && callback(filePath);
      });
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

  // Find dependencied like image, fonts.. Hash them and rewrite files (CSS only for now)
  _findAndReplaceSubAssetsAsync(filePath, done) {
    const that = this;
    // Return content of filePath and match pattern
    this._matchAssetsPattern(filePath, (data) => {
      if (data.filePaths !== null) {
        // Store promise in an array
        const promiseArray = [];
        Object.keys(data.filePaths).forEach( function(key) {
          promiseArray.push(() => {
            return new Promise((resolve) => {
              // Save matched string and extract filePath
              const match = new RegExp(that._escapeStringToRegex(data.filePaths[key]), 'g');
              data.filePaths[key] = that._extractURL(data.filePaths[key]);

              // Save Hash from filePath and remove it from filePath
              const finalHash = that._extractHashFromURL(data.filePaths[key]);
              data.filePaths[key] = data.filePaths[key].replace(that.options.paramettersPattern, '');

              // Relative path with '../' at FIRST position is replaced with '/' for bootstrap font link
              if (data.filePaths[key].indexOf('../') === 0) {
                data.filePaths[key] = data.filePaths[key].substring(2);
              }
              const targetPath = that.unixify(path.join(that.options.publicRootPath, data.filePaths[key]));

              // Adding to map
              if (typeof(that.map[targetPath]) == 'undefined') {
                that._fingerprintFileAsync(targetPath, (err, targetNewName) => {
                  if (err) return resolve(err);
                  that._addToMap(targetPath, path.join(that.config.paths.public, targetNewName.substring(that.config.paths.public.length)));
                  // Rename unhashed filePath by the hashed new name
                  data.fileContent = data.fileContent.replace(match, `url('${that.unixify(targetNewName.substring(that.options.publicRootPath.length - 2))}${finalHash}')`);
                  resolve();
                });
              // Resource is already in the map (maybe linked from an other file..) so we try to replace path with hashed one.
              } else {
                let targetNewName = that.map[targetPath];
                // Rename unhashed filePath by the hashed new name
                data.fileContent = data.fileContent.replace(match, `url('${that.unixify(targetNewName.substring(that.options.publicRootPath.length - 2))}${finalHash}')`);
                resolve();
              }
            });
          });
        });
        // Resolve promises
        promiseArray.reduce((previousPromise, promise, index) => {
          return previousPromise.then(() => {
            return promise();
          })
        }, Promise.resolve())
        // Final treatment
        .then(() => { 
          let fileNewName = filePath;
          if (this._isFingerprintable()) fileNewName = this._fingerprintCompose(filePath, data.fileContent);
          // Write file to generate and rename it
          fs.writeFile(filePath, data.fileContent, (err) => {
            if (err) return done(err);
            fs.rename(filePath, fileNewName, () => {
              this._addToMap(filePath, fileNewName);
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
    return (Array.from(this.options.environments).includes(this.options.environments[0])) || this.options.alwaysRun;
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
