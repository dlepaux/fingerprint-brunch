Fingerprint = require('../src/index')
expect      = require('chai').expect
fs          = require 'fs'
fse         = require 'fs-extra'
path        = require 'path'


Fingerprint.logger = {
  warn: (message) -> null # do nothing
}


ASSETS =
  'css/sample.css': 'css/sample-f7705669.css'
  'js/sample.js': 'js/sample-5d19fc29.js'

MAP =
  'public/css/sample.css': 'public/css/sample-24f9b0ba.css'
  'public/js/sample.js': 'public/js/sample-5d19fc29.js'

AUTOREPLACE_ASSETS =
  'css/sample.css': 'css/sample-24f9b0ba.css'
  'img/troll.png': 'img/troll-5f2d5cbe.png'
  'fonts/font.eot': 'fonts/font-45d860a3.eot'
  'fonts/font.woff': 'fonts/font-6ced13b9.woff'
  'fonts/font.ttf': 'fonts/font-82c653e7.ttf'
  'fonts/font.svg': 'fonts/font-52343d4f.svg'
  'fonts/font-relative.eot': 'fonts/font-45d860a3.eot'
  'fonts/font-relative.woff': 'fonts/font-6ced13b9.woff'
  'fonts/font-relative.ttf': 'fonts/font-82c653e7.ttf'
  'fonts/font-relative.svg': 'fonts/font-52343d4f.svg'

AUTOREPLACE_MAP =
  'public/css/sample.css': 'public/css/sample-24f9b0ba.css'
  'public/img/troll.png': 'public/img/troll-5f2d5cbe.png'
  'public/fonts/font.eot': 'public/fonts/font-45d860a3.eot'
  'public/fonts/font.woff': 'public/fonts/font-6ced13b9.woff'
  'public/fonts/font.ttf': 'public/fonts/font-82c653e7.ttf'
  'public/fonts/font.svg': 'public/fonts/font-52343d4f.svg'
  'public/fonts/font-relative.eot': 'public/fonts/font-relative-45d860a3.eot'
  'public/fonts/font-relative.woff': 'public/fonts/font-relative-6ced13b9.woff'
  'public/fonts/font-relative.ttf': 'public/fonts/font-relative-82c653e7.ttf'
  'public/fonts/font-relative.svg': 'public/fonts/font-relative-52343d4f.svg'

GENERATED_FILES = [
  {path:path.join(__dirname, 'public', 'js', 'sample.js')},
  {path:path.join(__dirname, 'public', 'css', 'sample.css')}
]


fingerprintFilename = (filename) ->
  filename = ASSETS[filename] || filename
  path.join(__dirname, 'public', filename)

fingerprintFileExists = (filename) ->
  pathFile = fingerprintFilename(filename)
  fs.existsSync(pathFile)

fingerprintAutoReplaceFilename = (filename) ->
  filename = AUTOREPLACE_ASSETS[filename] || filename
  path.join(__dirname, 'public', filename)

fingerprintAutoReplaceFileExists = (filename) ->
  pathFile = fingerprintAutoReplaceFilename(filename)
  fs.existsSync(pathFile)

setupFakeFileSystem = ->
  fse.removeSync path.join(__dirname, 'public')
  fse.copySync path.join(__dirname, 'fixtures'), path.join(__dirname, 'public')


describe 'Fingerprint', ->
  fingerprint = null

  # executed before each test
  beforeEach ->
    fingerprint = new Fingerprint(
      env: ['production']
      paths:
        public: path.join('test', 'public')
      plugins:
        fingerprint:
          publicRootPath: './test/public'
          manifest: './test/public/assets.json'
    )

  # executed after each test
  after ->
    fse.removeSync path.join(__dirname, 'public')

  describe 'General testing', ->
    it 'is an instance of Fingerprint', ->
      expect(fingerprint).to.be.instanceOf(Fingerprint)

    it 'has default config keys', ->
      expect(fingerprint.options).to.include.keys('hashLength', 'environments')


  # Testing pattern
  describe 'Pattern testing', ->
    beforeEach ->
      setupFakeFileSystem()

    it 'assets inner finded', ->
      samplePath = path.join(__dirname, 'public', 'css', 'sample.css')
      data = fingerprint._getAssetsInner(samplePath)
      expect(data.filePaths).to.not.equal(null)

    it 'extract params from url assets', ->
      url = 'http://github.com/dlepaux/fingerprint-brunch?test=test'
      hash = fingerprint._extractHashFromURL(url)
      expect(hash).to.be.equal('?test=test')

    it 'extract hash from url assets', ->
      url = 'http://github.com/dlepaux/fingerprint-brunch#test=test'
      hash = fingerprint._extractHashFromURL(url)
      expect(hash).to.be.equal('#test=test')

    it 'extract both from url assets', ->
      url = 'http://github.com/dlepaux/fingerprint-brunch?test=test#test'
      hash = fingerprint._extractHashFromURL(url)
      expect(hash).to.be.equal('?test=test#test')

    it 'escape string for regexifisation', ->
      string = 'url(/img/test.png)'
      string = fingerprint._escapeStringToRegex(string)
      expect(string).to.be.equal('url\\(\\/img\\/test\\.png\\)')


  # Cleaning in dev env
  describe 'Cleanning old hashed files', ->
    beforeEach ->
      setupFakeFileSystem()

    it 'is exists', ->
      pathFile = path.join(__dirname, 'public', 'js/sample.js')
      expect(fs.existsSync(pathFile)).to.be.true

    it 'is not exists', ->
      fingerprint._clearOldFiles(path.join(__dirname, 'public', 'js'), 'sample', '.js')
      expect(fingerprintFileExists('js/sample.js')).to.be.false


  # Renaming
  describe 'Renaming', ->
    beforeEach ->
      setupFakeFileSystem()

    it 'renames sample.css with fingerprint', ->
      fingerprint.onCompile(GENERATED_FILES)
      expect(fingerprintFileExists('css/sample.css')).to.be.true

    it 'renames sample.js with fingerprint', ->
      fingerprint.onCompile(GENERATED_FILES)
      expect(fingerprintFileExists('js/sample.js')).to.be.true


  # Manifest
  describe 'Write Manifest', ->
    beforeEach ->
      setupFakeFileSystem()

    it 'as new one', ->
      fingerprint._writeManifest(MAP)
      exists = fs.existsSync(fingerprint.options.manifest)
      expect(exists).to.be.true

    it 'merging an already existing one', ->
      fingerprint._writeManifest(MAP)
      fingerprint._mergeManifest(ASSETS)
      exists = fs.existsSync(fingerprint.options.manifest)
      expect(exists).to.be.true

    it 'add data to @map', ->
      fingerprint._addToMap(path.join(fingerprint.options.publicRootPath, 'test/test.js'), path.join(fingerprint.options.publicRootPath, 'test/test-123456.js'))
      expect(fingerprint.map[path.join(fingerprint.options.publicRootPath, 'test/test.js')]).to.be.equal(path.join(fingerprint.options.publicRootPath, 'test/test-123456.js'))


  # Environment detection
  describe 'Environment detection', ->
    beforeEach ->
      setupFakeFileSystem()

    didRun = ->
      fingerprintFileExists('js/sample.js') &&
        fs.existsSync(fingerprint.options.manifest)

    it 'does not run in non-production environment', ->
      fingerprint.config.env = ['development']
      fingerprint.onCompile(GENERATED_FILES)
      expect(didRun()).to.be.false

    it 'does run with alwaysRun flag set', ->
      fingerprint.options.alwaysRun = true
      fingerprint.onCompile(GENERATED_FILES)
      expect(didRun()).to.be.true

    it 'does run in production environment', ->
      fingerprint.config.env = ['production']
      fingerprint.onCompile(GENERATED_FILES)
      expect(didRun()).to.be.true

  # Matching assets to hash
  describe 'AutoReplace inner assets', ->
    beforeEach ->
      setupFakeFileSystem()

    it 'extract url from css "url()" attribute', ->
      cssUrl = 'url("test.png")'
      url = fingerprint._extractURL(cssUrl)
      expect(url).to.be.equal('test.png')

    it 'autoReplace in css sample', ->
      fingerprint.options.alwaysRun = true
      fingerprint.options.autoReplaceAndHash = true
      fingerprint.onCompile(GENERATED_FILES)
      expect(fingerprintAutoReplaceFileExists('css/sample.css')).to.be.true
