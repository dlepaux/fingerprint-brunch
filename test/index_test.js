const Fingerprint = require('../src/index');
const { expect }  = require('chai');
const fs          = require('fs');
const fse         = require('fs-extra');
const path        = require('path');

const ASSETS = {
  'css/sample-2.css': 'css/sample-2-7a6ebaa2.css',
  'css/sample.css': 'css/sample-2df77a0c.css',
  'js/sample.js': 'js/sample-5d19fc29.js'
};

const MAP = {
  'public/css/sample-2.css': 'public/css/sample-2-7a6ebaa2.css',
  'public/css/sample.css': 'public/css/sample-2df77a0c.css',
  'public/js/sample.js': 'public/js/sample-5d19fc29.js'
};

const AUTOREPLACE_ASSETS = {
  'css/sample.css': 'css/sample-2df77a0c.css',
  'css/sample-2.css': 'css/sample-2-7a6ebaa2.css',
  'img/troll.png': 'img/troll-5f2d5cbe.png',
  'fonts/font.eot': 'fonts/font-45d860a3.eot',
  'fonts/font.woff': 'fonts/font-6ced13b9.woff',
  'fonts/font.ttf': 'fonts/font-82c653e7.ttf',
  'fonts/font.svg': 'fonts/font-52343d4f.svg',
  'fonts/font-relative.eot': 'fonts/font-45d860a3.eot',
  'fonts/font-relative.woff': 'fonts/font-6ced13b9.woff',
  'fonts/font-relative.ttf': 'fonts/font-82c653e7.ttf',
  'fonts/font-relative.svg': 'fonts/font-52343d4f.svg'
};

const AUTOREPLACE_MAP = {
  'public/css/sample.css': 'public/css/sample-2df77a0c.css',
  'public/css/sample-2.css': 'public/css/sample-2-7a6ebaa2.css',
  'public/img/troll.png': 'public/img/troll-5f2d5cbe.png',
  'public/fonts/font.eot': 'public/fonts/font-45d860a3.eot',
  'public/fonts/font.woff': 'public/fonts/font-6ced13b9.woff',
  'public/fonts/font.ttf': 'public/fonts/font-82c653e7.ttf',
  'public/fonts/font.svg': 'public/fonts/font-52343d4f.svg',
  'public/fonts/font-relative.eot': 'public/fonts/font-relative-45d860a3.eot',
  'public/fonts/font-relative.woff': 'public/fonts/font-relative-6ced13b9.woff',
  'public/fonts/font-relative.ttf': 'public/fonts/font-relative-82c653e7.ttf',
  'public/fonts/font-relative.svg': 'public/fonts/font-relative-52343d4f.svg'
};

const GENERATED_FILES = [
  {path: path.join(__dirname, 'public', 'js', 'sample.js')},
  {path: path.join(__dirname, 'public', 'css', 'sample.css')},
  {path: path.join(__dirname, 'public', 'css', 'sample-2.css')}
];

const fingerprintFileExists = (filename, done) => {
  filename = path.join(__dirname, 'public', ASSETS[filename] || filename);
  fs.access(filename, fs.constants.R_OK, (err) => {
    done && done(err ? false : true);
  });
};

const fingerprintAutoReplaceFileExists = (filename) => {
  filename = path.join(__dirname, 'public', AUTOREPLACE_ASSETS[filename] || filename);
  fs.access(filename, fs.constants.R_OK, (err) => {
    done && done(err ? false : true);
  });
};

const setupFakeFileSystem = (done) => {
  fse.remove(path.join(__dirname, 'public'), () => {
    fse.copy(path.join(__dirname, 'fixtures'), path.join(__dirname, 'public'), (err) => {
      done && done();
    });
  });
};


describe('Fingerprint', () => {
  let fingerprint = null;

  // executed before each test
  beforeEach((done) => {
    Fingerprint.initClass();
    fingerprint = new Fingerprint({
      environments: ['production'],
      paths: {
        public: path.join('test', 'public')
      },
      plugins: {
        fingerprint: {
          publicRootPath: './test/public',
          manifest: './test/public/assets.json',
          // srcBasePath: './test/public',
          // destBasePath: './test/public'
        }
      }
    });
    setupFakeFileSystem(() => {
      done()
    });
  });

  // executed after each test
  afterEach((done) => {
    fse.remove(path.join(__dirname, 'public'), () => {
      fingerprint = null;
      done();
    });
  });


  // Test without config
  describe('Without configuration passed', () => {
    it('should work', () => {
      fingerprint = new Fingerprint({
        environments: ['production'],
        paths: {
          public: path.join('test', 'public')
        }
      });
      expect(fingerprint).to.be.instanceOf(Fingerprint);
    });
    
  });

  // General tests
  describe('General testing', () => {
    it('is an instance of Fingerprint', () => expect(fingerprint).to.be.instanceOf(Fingerprint));
    it('has default config keys', () => expect(fingerprint.options).to.include.keys('hashLength', 'environments'));
  });


  // Testing Unixifysiation
  describe('Unixify', function() {
    it('should work', function() {
      expect(fingerprint.unixify('c:\\Users\\JohnDoe\\project\\fingerprint-brunch')).to.be.equal('c:/Users/JohnDoe/project/fingerprint-brunch');
    });
  });

  // Testing pattern
  describe('Pattern testing', function() {

    it('assets inner finded', function() {
      const samplePath = path.join(__dirname, 'public', 'css', 'sample.css');
      fingerprint._matchAssetsPattern(samplePath, (data) => {
        expect(data.filePaths).to.not.equal(null);
      });
    });

    it('extract params from url assets', function() {
      const url = 'http://github.com/dlepaux/fingerprint-brunch?test=test';
      const hash = fingerprint._extractHashFromURL(url);
      expect(hash).to.be.equal('?test=test');
    });

    it('extract hash from url assets', function() {
      const url = 'http://github.com/dlepaux/fingerprint-brunch#test=test';
      const hash = fingerprint._extractHashFromURL(url);
      expect(hash).to.be.equal('#test=test');
    });

    it('extract both from url assets', function() {
      const url = 'http://github.com/dlepaux/fingerprint-brunch?test=test#test';
      const hash = fingerprint._extractHashFromURL(url);
      expect(hash).to.be.equal('?test=test#test');
    });

    it('escape string for regexifisation', function() {
      let string = 'url(/img/test.png)';
      string = fingerprint._escapeStringToRegex(string);
      expect(string).to.be.equal('url\\(\\/img\\/test\\.png\\)');
    });
  });


  // Cleaning in dev env
  describe('Cleanning old hashed files', function() {

    it('sample.js is exists', function() {
      const pathFile = path.join(__dirname, 'public', 'js/sample.js');
      fs.access(pathFile, fs.constants.R_OK, (err) => {
        expect(!err?true:false).to.be.true;
      })
    });

    it('sample.js well removed', function(done) {
      fingerprint._clearOldFilesAsync(path.join(__dirname, 'public', 'js'), 'sample', '.js', (err) => {
        fingerprintFileExists('js/sample.js', (isExist) => {
          expect(isExist).to.be.false;
          done();
        });
      });
    });

    it('sample.css is exists', function(done) {
      const pathFile = path.join(__dirname, 'public', 'css/sample.css');
      fs.access(pathFile, fs.constants.R_OK, (err) => {
        expect(!err?true:false).to.be.true;
        done();
      });
    });

    it('sample.css well removed', function(done) {
      fingerprint._clearOldFilesAsync(path.join(__dirname, 'public', 'css'), 'sample', '.css', (err) => {
        fingerprintFileExists('css/sample.css', (isExist) => {
          expect(isExist).to.be.false;
          done();
        });
      });
    });

    it('sample-2.css is exists', function(done) {
      const pathFile = path.join(__dirname, 'public', 'css/sample-2.css');
      fs.access(pathFile, fs.constants.R_OK, (err) => {
        expect(!err?true:false).to.be.true;
        done();
      });
    });

    it('sample-2.css well removed', function(done) {
      fingerprint._clearOldFilesAsync(path.join(__dirname, 'public', 'css'), 'sample-2', '.css', (err) => {
        fingerprintFileExists('css/sample-2.css', (isExist) => {
          expect(isExist).to.be.false;
          done();
        });
      });
    });

    it('test wrong dir took to cleaner', function(done) {
      fingerprint._clearOldFilesAsync(path.join(__dirname, 'this', 'dir', 'not', 'exist'), 'sample', '.css', (err) => {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.not.equal(null);
        done();
      });
    });
  });


  // Fingerprinting
  describe('Fingerprinting', function() {

    it('sample.js with fingerprint', function(done) {
      const fileName = path.join(__dirname, 'public', 'js', 'sample.js');
      fingerprint._fingerprintFileAsync(fileName, (err, fileNewName) => {
        expect(fileName).to.be.not.equal(fileNewName);
        done();
      });
    });

    it('sample.css with fingerprint', function(done) {
      const fileName = path.join(__dirname, 'public', 'css', 'sample.css');
      fingerprint._fingerprintFileAsync(fileName, (err, fileNewName) => {
        expect(fileName).to.be.not.equal(fileNewName);
        done();
      });
    });

    it('sample-2.css with fingerprint', function(done) {
      const fileName = path.join(__dirname, 'public', 'css', 'sample-2.css');
      fingerprint._fingerprintFileAsync(fileName, (err, fileNewName) => {
        expect(fileName).to.be.not.equal(fileNewName);
        done();
      });
    });

    it('with wrong filePath', function(done) {
      fingerprint._fingerprintFileAsync(path.join(__dirname, 'this', 'file', 'dont', 'exist.css'), (err, fileNewName) => {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.not.equal(null);
        done();
      });
    });
  });

  // Manifest
  describe('Manifest', function() {
    describe('The mapping', function() {
      it('add pair to map', function() {
        const sourcePath = path.join(fingerprint.options.publicRootPath, 'test/test.js');
        const destPath = path.join(fingerprint.options.publicRootPath, 'test/test-123456.js');
        fingerprint._addToMap(sourcePath, destPath);
        expect(fingerprint.map[fingerprint.unixify(sourcePath)]).to.be.equal(fingerprint.unixify(destPath));
      });
    });

    describe('_createAsync', function() {
      it('create with param (MAP)', function(done) {
        fingerprint.options.alwaysRun = true;
        fingerprint._createManifestAsync(MAP, (err) => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.true;
            done();
          });
        });
      });

      it('create with this.map setted', function(done) {
        fingerprint.map = MAP;
        fingerprint.options.alwaysRun = true;
        fingerprint._createManifestAsync((err) => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.true;
            done();
          });
        });
      });

      it('create (forced)', function(done) {
        fingerprint.options.manifestGenerationForce = true;
        fingerprint._createManifestAsync(MAP, (err) => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.true;
            done();
          });
        });
      });

      it('create with a unvalid name (?)', function(done) {
        fingerprint.options.manifestGenerationForce = true;
        fingerprint.options.manifest = './test/public/ass\0ets.json';
        fingerprint._createManifestAsync(MAP, (err) => {
          expect(err).to.be.instanceOf(Error);
          expect(err).to.not.equal(null);
          done();
        });
      });

      it('create MAP passed, but not written', function(done) {
        fingerprint.options.manifestGenerationForce = false;
        fingerprint.options.environments = [];
        fingerprint.options.alwaysRun = false;
        fingerprint._createManifestAsync(MAP, (err) => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.false;
            done();
          });
        });
      });
    });

    describe('_mergeAsync', function() {

      it('check manifest is not exist on init (access should be false)', (done) => {
        fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
          expect(!err?true:false).to.be.false;
          done();
        });
      });

      it('merging an non existing one (access should be false)', function(done) {
        fingerprint._mergeManifestAsync(() => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.false;
            done();
          });
        });
      });

      it('merging an non existing one with forcing (should create it)', function(done) {
        fingerprint.options.manifestGenerationForce = true;
        // Add key/value to map
        Object.keys(MAP).forEach( function(key) {
          fingerprint._addToMap(key, MAP[key]);
        });
        fingerprint._mergeManifestAsync((err) => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.true;
            done();
          });
        });
      });

      it('merging an existing manifest', function(done) {
        fingerprint.options.manifestGenerationForce = true;
        // Add key/value to map
        Object.keys(MAP).forEach( function(key) {
          fingerprint._addToMap(key, MAP[key]);
        });
        fs.writeFile(fingerprint.options.manifest, '{"hello/world":"hello/world"}', (err) => {
          fingerprint._mergeManifestAsync(() => {
            fs.readFile(fingerprint.options.manifest, (err, data) => {
              expect(!err?true:false).to.be.true;
              data = JSON.parse(data.toString());
              expect(data['hello/world']).to.be.equal('hello/world');
              done();
            });
          });
        });
      });
    });

    describe('_writeAsync', function() {

      it('write manifest with createManifest', function(done) {
        Object.keys(MAP).forEach( function(key) {
          fingerprint._addToMap(key, MAP[key]);
        });
        fingerprint.options.manifestGenerationForce = true;
        fingerprint._writeManifestAsync(() => {
          fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
            expect(!err?true:false).to.be.true;
            done();
          });
        });
      });

      it('write manifest with mergeManifest', function(done) {
        Object.keys(MAP).forEach( function(key) {
          fingerprint._addToMap(key, MAP[key]);
        });

        fs.writeFile(fingerprint.options.manifest, '{"hello/world":"hello/world"}', 'utf8', (err) => {
          fingerprint._writeManifestAsync(() => {
            fs.access(fingerprint.options.manifest, fs.constants.R_OK, (err) => {
              expect(!err?true:false).to.be.true;
              done();
            });
          });
        });
      });
    });
  });

  // Making coffee
  describe('Fingerprinting (non sub assets)', function() {

    it('should fingerprint file', function(done) {
      fingerprint.options.alwaysRun = true;
      const sourceFullPath = path.join(__dirname, 'public', 'css', 'sample.css');
      fingerprint._makeCoffee(sourceFullPath, (err, filePath) => {
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));
        done();
      });
    });

    it('should not fingerprint file', function(done) {
      fingerprint.options.alwaysRun = false;
      fingerprint.options.environments = [];
      fingerprint._fingerprintOneAsync(path.join(__dirname, 'public', 'css', 'sample.css'), (err, filePath) => {
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.equal(fingerprint.unixify(filePath));
        done();
      });
    });
  });
  


  // Environment detection
  describe('Environment detection', function() {

    it('does not run in non-production environment', function() {
      fingerprint.options.environments = ['development'];
      expect(fingerprint._isFingerprintable()).to.be.true;
    });

    it('does run with alwaysRun flag set', function() {
      fingerprint.options.environments = [];
      fingerprint.options.alwaysRun = true;
      expect(fingerprint._isFingerprintable()).to.be.true;
    });

    it('does run in production environment', function() {
      process.env.NODE_ENV = 'production';
      fingerprint.options.environments = ['production'];
      expect(fingerprint._isFingerprintable()).to.be.true;
    });
  });

  // Matching assets to hash
  describe('AutoReplace sub assets', function() {

    it('extract url from css "url()" attribute', function() {
      expect(fingerprint._extractURL('url("test.png")')).to.be.equal('test.png');
    });

    it('autoReplace in css sample', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.autoReplaceAndHash = true;
      fingerprint._findAndReplaceSubAssetsAsync(path.join(__dirname, 'public', 'css', 'sample.css'), (err, filePath) => {
        // Expect parent file well fingerprinted
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        
        // Expect children file well fingerprinted too
        filePath = path.join('test', 'public', 'img', 'troll.png');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));
        done() 
      });
    });

    it('autoReplace in css sample (with doublon in map)', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.autoReplaceAndHash = true;
      fingerprint._fingerprintAllAsync(path.join(__dirname, 'public', 'css', 'sample-2.css'), (err, filePath) => {
        // Expect parent file well fingerprinted
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        
        // Expect children file well fingerprinted too
        filePath = path.join('test', 'public', 'img', 'troll.png');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        // troll.png is in doublon
        fingerprint._findAndReplaceSubAssetsAsync(path.join(__dirname, 'public', 'css', 'sample.css'), (err, filePath) => {
          // Expect parent file well fingerprinted
          expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
          expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
          expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

          // Test if troll.png has been fingerprinted
          filePath = path.join('test', 'public', 'img', 'troll.png');
          fs.access(fingerprint.map[fingerprint.unixify(filePath)], fs.constants.R_OK, (err) => {
            done();
          });
        });
      });
    });

    it('autoReplace in css sample (without sub assets)', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.autoReplaceAndHash = true;
      fingerprint._findAndReplaceSubAssetsAsync(path.join(__dirname, 'public', 'css', 'sample-3.css'), (err, filePath) => {
        // Expect parent file well fingerprinted
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        done();
      });
    });
  });

  // Matching assets to hash
  describe('Fingerprint specific file', function() {
    it('should fingerprint one file', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.environments = ['development'];
      fingerprint.options.assetsToFingerprint = ['/img/oh-yeah.png'];
      fingerprint._fingerprintAllResolver(fingerprint.options.assetsToFingerprint, (resolve) => {
        resolve();
      }, () => {
        let filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        done();
      });
    });

    it('should fingerprint multiple files', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.environments = ['development'];
      fingerprint.options.assetsToFingerprint = ['/img/oh-yeah.png', '/fonts/font.ttf', '/fonts/font-relative.ttf'];
      fingerprint._fingerprintAllResolver(fingerprint.options.assetsToFingerprint, (resolve) => {
        resolve();
      }, () => {
        let filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        filePath = 'test/public/fonts/font.ttf';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        filePath = 'test/public/fonts/font-relative.ttf';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));
        done();
      });
    });
  });

  // Matching assets to hash
  describe('Fingerprint folder', function() {
    it('should fingerprint files into specific folder', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.foldersToFingerprint = '/img';
      fingerprint._fingerprintDir(fingerprint.options.foldersToFingerprint, () => {
        let filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));
        filePath = 'test/public/img/troll.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        done();
      });
    });

    it('should fingerprint files into specific folders', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.foldersToFingerprint = ['/img', '/fonts'];
      fingerprint._fingerprintDirs(fingerprint.options.foldersToFingerprint, (err) => {
        let filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));
        filePath = 'test/public/img/troll.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        filePath = 'test/public/fonts/font-relative.woff';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));  
        done();
      });
    });

    it('should fingerprint files into specific folders (with err)', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.foldersToFingerprint = ['/img', '/fonts', '/wrong-path'];
      fingerprint._fingerprintDirs(fingerprint.options.foldersToFingerprint, (err) => {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });
  });

  // Matching assets to hash
  describe('Full Test with onCompile', function() {
    it('test with one file (with autoReplace)', function(done) {
      fingerprint.options.autoReplaceAndHash = true;
      fingerprint.onCompile([{path: path.join(__dirname, 'public', 'js', 'sample.js')}], (filePath) => {
        expect(filePath).to.be.not.null();
        done();
      });
    });

    it('test with one file (without autoReplace)', function(done) {
      fingerprint.options.autoReplaceAndHash = false;
      fingerprint.onCompile([{path: path.join(__dirname, 'public', 'js', 'sample.js')}], (filePath) => {
        expect(filePath).to.be.not.null();
        done();
      });
    });

    it('test with one file (without autoClear)', function(done) {
      fingerprint.options.autoClearOldFiles = true;
      fingerprint.onCompile([{path: path.join(__dirname, 'public', 'js', 'sample.js')}], (filePath) => {
        expect(filePath).to.be.not.null();
        done();
      });
    });

    it('test with one file (with extra files : assetsToFingerprint)', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.assetsToFingerprint = ['/img/oh-yeah.png', '/fonts/font.ttf', '/fonts/font-relative.ttf'];
      fingerprint.onCompile([{path: path.join(__dirname, 'public', 'js', 'sample.js')}], (filePath) => {
        expect(filePath).to.be.not.null();

        filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        filePath = 'test/public/fonts/font.ttf';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        filePath = 'test/public/fonts/font-relative.ttf';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        done();
      });
    });

    it('test with one file (with extra files : foldersToFingerprint array)', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.foldersToFingerprint = ['/img', '/fonts'];
      fingerprint.onCompile([{path: path.join(__dirname, 'public', 'js', 'sample-3.js')}], (filePath) => {
        expect(filePath).to.be.not.null();

        filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        filePath = 'test/public/fonts/font.ttf';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        filePath = 'test/public/fonts/font-relative.ttf';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        done();
      });
    });

    it('test with one file (with extra files : foldersToFingerprint string)', function(done) {
      fingerprint.options.alwaysRun = true;
      fingerprint.options.foldersToFingerprint = '/img';
      fingerprint.onCompile([{path: path.join(__dirname, 'public', 'js', 'sample-3.js')}], (filePath) => {
        expect(filePath).to.be.not.null();

        filePath = 'test/public/img/oh-yeah.png';
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal('undefined');
        expect(typeof(fingerprint.map[fingerprint.unixify(filePath)])).to.be.not.equal(undefined);
        expect(fingerprint.map[fingerprint.unixify(filePath)]).to.be.not.equal(fingerprint.unixify(filePath));

        done();
      });
    });
  });
});
