const addCorsHeaders = require('hapi-cors-headers')
const pkg = require('../package.json')

function corsPlugin (server, options, next) {
  server.ext('onPreResponse', addCorsHeaders)
  next()
}

corsPlugin.attributes = {
  pkg: pkg
}
module.exports = corsPlugin
