const Hapi = require('hapi')
const good = require('good')
const goodConsole = require('good-console')
const corsPlugin = require('./cors-plugin')

const loggerOptions = {
  opsInterval: 1000,
  reporters: [{
    reporter: goodConsole,
    events: {
      log: '*',
      request: '*',
      response: '*'
    }
  }]
}

const server = new Hapi.Server({})
const port = parseInt(process.env.PORT || 1337, 10)
const host = (process.env.HOST || '0.0.0.0')
const proxy = server.connection({ port: port, labels: ['proxy'], host: host })

const protocol = 'https://'
const hkepcLoginUrl = protocol + 'www.hkepc.com/forum/logging.php'

server.register(require('h2o2'), function () {})

// cors plugin
server.register(corsPlugin, {
  select: ['proxy']
}, function (error) {
  if (error) server.log('error', error)
})

// logger plugin
server.register({
  register: good,
  options: loggerOptions
}, function (error) {
  if (error) server.log('error', error)
})

// proxy route
proxy.route({
  method: ['GET', 'POST'],
  path: '/{host}/{path*}',
  handler: {
    proxy: {
      passThrough: true,
      xforward: true,
      localStatePassThrough: true,
      redirects: 1,
      timeout: 30000,
      mapUri: function (request, callback) {
        request.host = request.params.host
        request.path = request.path.substr(request.params.host.length + 1)
        const query = request.url.search ? request.url.search : ''

        request.headers['host'] = request.host
        request.headers['referer'] = protocol + request.host + request.path + query

        const url = protocol + request.host + request.path

        if (url !== hkepcLoginUrl) {
          // inject the header
          request.headers['cookie'] = request.headers['hkepc-token'] || ''
        }

        callback(null, protocol + request.host + request.path + query, request.headers)
      },
      // eslint-disable-next-line handle-callback-err
      onResponse: function (err, res, request, reply, settings, ttl) {
        const url = protocol + request.host + request.path

        if (url === hkepcLoginUrl) {
          // return the cookie for future browsering
          reply(res.headers['set-cookie'])
        } else {
          reply(res)
        }
      }
    }
  }
})

// default route
proxy.route({
  method: ['GET'],
  path: '/',
  handler: function (request, reply) {
    return reply('')
  }
})
proxy.route({
  method: 'OPTIONS',
  path: '/{host}/{path*}',
  handler: function (request, reply) {
    const response = reply()

    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    response.header('Access-Control-Max-Age', '86400')
  }
})

server.start(function (error) {
  if (error) server.log('error', error)

  server.log('info', 'CORS Proxy running at: ' + server.info.uri)
})
