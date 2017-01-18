var stackTrace = require('./stacktrace')
var utils = require('../lib/utils')

var ExceptionHandler = function (opbeatBackend, config, logger, stackFrameService) {
  this._opbeatBackend = opbeatBackend
  this._config = config
  this._logger = logger
  this._stackFrameService = stackFrameService
}

ExceptionHandler.prototype.install = function () {
  window.onerror = function (msg, file, line, col, error) {
    var options = {
      eventObject: {
        msg: msg, file: file, line: line, col: col
      }
    }
    this._processError(error, options)
  }.bind(this)
}

ExceptionHandler.prototype.uninstall = function () {
  window.onerror = null
}

ExceptionHandler.prototype.processError = function (err, options) {
  return this._processError(err, options)
}

ExceptionHandler.prototype._processError = function processError (error, options) {
  var eo = options && options.eventObject || {}
  var msg = eo.msg
  var file = eo.file
  var line = eo.line
  var col = eo.col
  if (msg === 'Script error.' && !file) {
    // ignoring script errors: See https://github.com/getsentry/raven-js/issues/41
    return
  }

  var extraContext = error ? getProperties(error) : undefined // error ? error['_opbeat_extra_context'] : undefined
  if (options && options.extra) {
    extraContext = utils.merge({}, extraContext, options.extra)
  }

  var exception = {
    'message': error ? error.message : msg,
    'type': error ? error.name : null,
    'fileurl': file || null,
    'lineno': line || null,
    'colno': col || null,
    'extra': extraContext
  }

  if (!exception.type) {
    // Try to extract type from message formatted like 'ReferenceError: Can't find variable: initHighlighting'
    if (exception.message.indexOf(':') > -1) {
      exception.type = exception.message.split(':')[0]
    }
  }

  var resolveStackFrames

  if (error) {
    resolveStackFrames = stackTrace.fromError(error)
  } else {
    resolveStackFrames = new Promise(function (resolve, reject) {
      resolve([{
        'fileName': file,
        'lineNumber': line,
        'columnNumber': col
      }])
    })
  }

  var exceptionHandler = this
  return resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return exceptionHandler._stackFrameService.stackInfoToOpbeatException(exception).then(function (exception) {
      var data = exceptionHandler._stackFrameService.processOpbeatException(exception, exceptionHandler._config.get('context.user'), exceptionHandler._config.get('context.extra'))
      exceptionHandler._opbeatBackend.sendError(data)
    })
  })['catch'](function (error) {
    exceptionHandler._logger.warn(error)
  })
}

function getProperties (err) {
  var properties = {}
  Object.keys(err).forEach(function (key) {
    if (key === 'stack') return
    var val = err[key]
    if (val === null) return // null is typeof object and well break the switch below
    switch (typeof val) {
      case 'function':
        return
      case 'object':
        // ignore all objects except Dates
        if (typeof val.toISOString !== 'function') return
        val = val.toISOString()
    }
    properties[key] = val
  })
  return properties
}

module.exports = ExceptionHandler
