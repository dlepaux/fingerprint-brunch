exports.config =
  paths:
    public: './public'
    watched: ['app']

  files:
    javascripts:
      joinTo:
        '/js/master.js': /^(app)/
    stylesheets:
      joinTo:
        '/css/master.css': /^(app)/

  npm:
    enabled: false

  plugins:
    cleancss:
      keepSpecialComments: 0
      removeEmpty: true
    sass:
      mode: 'native'
      debug: 'comments'
      allowCache: true
    fingerprint:
      # Mapping file so your server can serve the right files
      targets: '*'
      environments: ['production']
      alwaysRun: true
      autoReplaceAndHash: true
      manifest: './assets.json'
      publicRootPath: './public'
      srcBasePath: './public'
      destBasePath: './public'
