var utils = require('../lib/utils')
var stackTrace = require('./stacktrace')

var promiseSequence = function (tasks) {
  var current = Promise.resolve()
  var results = []

  for (var k = 0; k < tasks.length; ++k) {
    results.push(current = current.then(tasks[k]))
  }

  return Promise.all(results)
}

function StackFrameService (config, logger) {
  this._logger = logger
  this._config = config
}

StackFrameService.prototype.getFramesForCurrent = function getFramesForCurrent () {
  return stackTrace.get().then(function (frames) {
    var tasks = frames.map(function (frame) {
      return this.buildOpbeatFrame.bind(this, frame)
    }.bind(this))

    var allFrames = promiseSequence(tasks)

    return allFrames.then(function (opbeatFrames) {
      return opbeatFrames
    })
  }.bind(this))
}

StackFrameService.prototype.buildOpbeatFrame = function buildOpbeatFrame (stack) {
  return new Promise(function (resolve, reject) {
    if (!stack.fileName && !stack.lineNumber) {
      // Probably an stack from IE, return empty frame as we can't use it.
      return resolve({})
    }

    if (!stack.columnNumber && !stack.lineNumber) {
      // We can't use frames with no columnNumber & lineNumber, so ignore for now
      return resolve({})
    }

    var filePath = this.cleanFilePath(stack.fileName)
    var fileName = this.filePathToFileName(filePath)

    if (this.isFileInline(filePath)) {
      fileName = '(inline script)'
    }

    // Build Opbeat frame data
    var frame = {
      'filename': fileName,
      'lineno': stack.lineNumber,
      'colno': stack.columnNumber,
      'function': stack.functionName || '<anonymous>',
      'abs_path': stack.fileName,
      'in_app': this.isFileInApp(filePath),
      'debug': []
    }

    resolve(frame)
  }.bind(this))
}

StackFrameService.prototype.stackInfoToOpbeatException = function stackInfoToOpbeatException (stackInfo) {
  return new Promise(function (resolve, reject) {
    if (stackInfo.stack && stackInfo.stack.length) {
      var tasks = stackInfo.stack.map(function (frame) {
        return this.buildOpbeatFrame.bind(this, frame)
      }.bind(this))

      var allFrames = promiseSequence(tasks)

      allFrames.then(function (frames) {
        stackInfo.frames = frames
        stackInfo.stack = null
        resolve(stackInfo)
      })
    } else {
      resolve(stackInfo)
    }
  }.bind(this))
}

StackFrameService.prototype.processOpbeatException = function (exception, userContext, extraContext) {
  var type = exception.type
  var message = String(exception.message) || 'Script error'
  var filePath = this.cleanFilePath(exception.fileurl)
  var fileName = this.filePathToFileName(filePath)
  var frames = exception.frames || []
  var culprit

  if (frames && frames.length) {
    // Opbeat.com expects frames oldest to newest and JS sends them as newest to oldest
    frames.reverse()
  } else if (fileName) {
    frames.push({
      filename: fileName,
      lineno: exception.lineno
    })
  }

  var stacktrace = {
    frames: frames
  }

  // Set fileName from last frame, if filename is missing
  if (!fileName && frames.length) {
    var lastFrame = frames[frames.length - 1]
    if (lastFrame.filename) {
      fileName = lastFrame.filename
    } else {
      // If filename empty, assume inline script
      fileName = '(inline script)'
    }
  }

  if (this.isFileInline(filePath)) {
    culprit = '(inline script)'
  } else {
    culprit = fileName
  }

  var messagePrefix = ''
  if (type && typeof message === 'string' && message.indexOf('Error:') !== 0) {
    messagePrefix = type + ': '
  }

  var data = {
    message: messagePrefix + message,
    culprit: culprit,
    exception: {
      type: type,
      value: message
    },
    http: {
      url: window.location.href
    },
    stacktrace: stacktrace,
    user: userContext || {},
    level: null,
    logger: null,
    machine: null
  }

  var browserMetadata = this.getBrowserSpecificMetadata()
  data.extra = utils.merge({}, browserMetadata, extraContext, exception.extra)

  this._logger.debug('opbeat.exceptions.processOpbeatException', data)
  return data
}
StackFrameService.prototype.cleanFilePath = function (filePath) {
  if (!filePath) {
    filePath = ''
  }

  if (filePath === '<anonymous>') {
    filePath = ''
  }

  return filePath
}

StackFrameService.prototype.filePathToFileName = function (fileUrl) {
  var origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '')

  if (fileUrl.indexOf(origin) > -1) {
    fileUrl = fileUrl.replace(origin + '/', '')
  }

  return fileUrl
}

StackFrameService.prototype.isFileInline = function (fileUrl) {
  if (fileUrl) {
    return window.location.href.indexOf(fileUrl) === 0
  } else {
    return false
  }
}
StackFrameService.prototype.isFileInApp = function (filename) {
  var pattern = this._config.get('libraryPathPattern')
  return !RegExp(pattern).test(filename)
}

StackFrameService.prototype.getBrowserSpecificMetadata = function () {
  var viewportInfo = utils.getViewPortInfo()
  var extra = {
    'environment': {
      'utcOffset': new Date().getTimezoneOffset() / -60.0,
      'browserWidth': viewportInfo.width,
      'browserHeight': viewportInfo.height,
      'screenWidth': window.screen.width,
      'screenHeight': window.screen.height,
      'language': navigator.language,
      'userAgent': navigator.userAgent,
      'platform': navigator.platform
    },
    'page': {
      'referer': document.referrer,
      'host': document.domain,
      'location': window.location.href
    }
  }

  return extra
}

module.exports = StackFrameService
