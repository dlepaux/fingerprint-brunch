"use strict"
fs       = require 'fs'
path     = require 'path'
crypto   = require 'crypto'

warn = (message) -> Fingerprint.logger.warn "fingerprint-brunch WARNING: #{message}"

unixify = (pathFile) -> pathFile.split('\\').join('/')

class Fingerprint

  brunchPlugin: true

  constructor: (@config) ->
    # Defaults options
    @options = {
      # Mapping file so your server can serve the right files
      manifest: './assets.json'
      # The base Path you want to remove from the `key` string in the mapping file
      srcBasePath: 'exemple/'
      # The base Path you want to remove from the `value` string in the mapping file
      destBasePath: 'out/'
      # How many digits of the SHA1.
      hashLength: 8
      # Remove old fingerprinted files
      autoClearOldFiles: false
      # Files you want to hash, default is all else put an array of files like ['app.js', 'vendor.js', ...]
      targets: '*'
      # Environment to make hash on files
      environments: ['production']
      # Force fingerprint-brunch to run in all environments when true.
      alwaysRun: false
      # autoReplaceAndHash assets in css/js, like a font linked in an url() in your css
      autoReplaceAndHash: false
      # public root path ( for multi theme support)
      publicRootPath: '/public'
      # Force the generation of the manifest, event if there are no fingerprinted files
      manifestGenerationForce: false

      # Assets pattern
      assetsPattern: new RegExp(/url\([\'\"]?[a-zA-Z0-9\-\/_.:]+\.(woff|woff2|eot|ttf|otf|jpg|jpeg|png|bmp|gif|svg)\??\#?[a-zA-Z0-9\-\/_]*[\'\"]?\)/g)
      # URL parameters pattern
      # authorized chars : ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=
      paramettersPattern: /(\?|\&|\#)([^=]?)([^&]*)/gm

      # verbose flag
      verbose: false
    }
    # Map of assets
    @map = {}

    # Merge config
    cfg = @config.plugins?.fingerprint ? {}
    @options[k] = cfg[k] for k of cfg

  # Main method
  onCompile: (generatedFiles) ->
    # Open files
    for file in generatedFiles
      # Set var with generatedFile
      filePath = file.path
      dir   = path.dirname(filePath)
      ext   = path.extname(filePath)
      base  = path.basename(filePath, ext)

      # Search and destory old files if option is enable
      if @options.autoClearOldFiles
        @_clearOldFiles(dir, base, ext)

      # Hash only file in targets option key
      if @options.targets == '*' or (base + ext) in @options.targets
        if @options.autoReplaceAndHash and fs.existsSync(filePath)
          # Fingerprint sub files
          @_findAndReplaceSubAssets(filePath)
        else
          @_makeCoffee(filePath)

    # Make array for manifest
    if fs.existsSync @options.manifest
      # Merge array to keep not watched files
      @_mergeManifest()
    else
      @_writeManifest()

  # Wana coffee?
  _makeCoffee: (filePath) ->
    fileNewName = filePath
    if @_isFingerprintable()
      # Just fingerprint targets
      fileNewName = @_fingerprintFile(filePath)
    @_addToMap(filePath, fileNewName)

  # Unixify & Remove part from original path
  _addToMap: (fileInput, fileOutput) ->
    fileInput = @_removePathBeforePublic(fileInput)
    fileOutput = @_removePathBeforePublic(fileOutput)

    # Remove srcBasePath/destBasePath
    fileInput = fileInput.replace @options.srcBasePath, ""
    fileOutput = fileOutput.replace @options.destBasePath, ""
    # Adding to @map var
    @map[fileInput] = fileOutput

  # Remove path before the public
  _removePathBeforePublic: (pathFile) ->
    pathFile = unixify pathFile
    pathPublicIndex = pathFile.indexOf(unixify(@options.publicRootPath))
    if (pathPublicIndex != 0)
      pathFile = pathFile.substring(pathPublicIndex)
    return pathFile

  # Find dependencied like image, fonts.. Hash them and rewrite files (CSS only for now)
  _findAndReplaceSubAssets: (filePath) ->
    # Manage subFunction for 'this'
    config = @config
    options = @options
    that = this

    # Return content of filePath and match pattern
    data = @_getAssetsInner(filePath)
    console.log 'data'
    console.log data
    if data.filePaths != null
      Object.keys(data.filePaths).forEach (key) ->

        # Save matched string and extract filePath
        match = new RegExp(that._escapeStringToRegex(data.filePaths[key]), 'g')
        data.filePaths[key] = that._extractURL(data.filePaths[key])

        # Save Hash from filePath and remove it from filePath
        finalHash = that._extractHashFromURL(data.filePaths[key])
        console.log 'finalHash'
        console.log finalHash
        data.filePaths[key] = data.filePaths[key].replace(options.paramettersPattern, '')

        # Relative path with '../' is replaced with '/' for bootstrap font link
        if data.filePaths[key].indexOf('../') == 0
          data.filePaths[key] = data.filePaths[key].substring(2)

        targetPath = unixify(path.join(options.publicRootPath, data.filePaths[key]))

        # Target is local and exist?
        if fs.existsSync(that.map[targetPath] || targetPath)

          # Adding to map
          if typeof(that.map[targetPath]) == 'undefined'
            targetNewName = that._fingerprintFile(targetPath)
            that._addToMap(targetPath, path.join(config.paths.public, targetNewName.substring(config.paths.public.length)))
          else
            targetNewName = that.map[targetPath]

          # Rename unhashed filePath by the hashed new name
          data.fileContent = data.fileContent.replace(match, "url('" + unixify(targetNewName.substring(options.publicRootPath.length)) + finalHash + "')")
        else if options.verbose
          console.log 'no such file : ' + (that.map[targetPath] || targetPath)
      # END forEach

      modifiedFilePath = filePath
      if @_isFingerprintable()
        modifiedFilePath = @_fingerprintCompose(filePath, data.fileContent)

      # Write file to generate and rename it
      fs.writeFileSync(filePath, data.fileContent, 'utf8')
      fs.renameSync(filePath, modifiedFilePath);
      @_addToMap(filePath, modifiedFilePath)
    else
      @_makeCoffee(filePath)

  _getAssetsInner: (filePath) ->
    fileContent = fs.readFileSync(filePath).toString()
    return {fileContent:fileContent, filePaths:fileContent.match(@options.assetsPattern)}

  # Extract paths from filePath
  _extractHashFromURL: (filePath) ->
    finalHash = ''
    param = filePath.match(@options.paramettersPattern)
    if param != null
      Object.keys(param).map (key) ->
        finalHash += param[key]
    return finalHash

  # Extract URL from url('>url<')
  _extractURL: (string) ->
    return string.substring(string.lastIndexOf("(")+1,string.lastIndexOf(")")).replace(/\"/g,'').replace(/\'/g,"")

  # Escape strng for regex
  _escapeStringToRegex: (string) ->
    return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")

  # IsFingerprintable
  _isFingerprintable: ->
    return (@config.env[0] in @options.environments) or @options.alwaysRun

  # Clear all the fingerprinted files
  _clearOldFiles: (dir, base, ext) ->
    # Find and remove file in dir/base-{hash}.ext
    pattern = new RegExp(base + '\\-\\w+\\' + ext + '$');
    files = fs.readdirSync dir
    for oldFile in files
      filePath = path.normalize(dir + '/' + oldFile)
      if pattern.test oldFile then fs.unlinkSync filePath

  # Make hash from data of file
  _makeFingerprintWithData: (data) ->
    shasum = crypto.createHash 'sha1'
    shasum.update(data.toString('utf8'), 'utf8')
    return shasum.digest('hex')[0..@options.hashLength-1]

  # Compose file name
  _fingerprintCompose: (filePath) ->
    hash = null
    if (arguments[1])
      hash = @_makeFingerprintWithData(arguments[1])
    else
      data = fs.readFileSync filePath
      hash = @_makeFingerprintWithData(data)

    dir   = path.dirname(filePath)
    ext   = path.extname(filePath)
    base  = path.basename(filePath, ext)
    newName = "#{base}-#{hash}#{ext}"
    return path.join(dir, newName)

  # Rename file with his new fingerprint
  _fingerprintFile: (filePath) ->
    fileNewName = @_fingerprintCompose(filePath)
    # Rename file, with hash
    fs.renameSync(filePath, fileNewName)
    fileNewName

  # Remove existing manifest
  _removeManifest: ->
    if fs.existsSync(@options.manifest) then fs.unlinkSync @options.manifest

  # Write a new manifest
  _writeManifest: ->
    if @_isFingerprintable() or @options.manifestGenerationForce
      output = JSON.stringify @map, null, "  "
      fs.writeFileSync(@options.manifest, output)

  # Merging existing manifest with new entree
  _mergeManifest: ->
    if @_isFingerprintable() or @options.manifestGenerationForce
      manifest = fs.readFileSync @options.manifest, 'utf8'
      manifest = JSON.parse manifest
      manifest[k] = @map[k] for k of @map
      @_writeManifest(manifest)

module.exports = Fingerprint
