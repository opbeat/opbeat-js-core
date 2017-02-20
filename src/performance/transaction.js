var Trace = require('./trace')
var utils = require('../lib/utils')

var Transaction = function (name, type, options) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false
  this._markDoneAfterLastTrace = false
  this._isDone = false
  this._options = options
  if (typeof options === 'undefined') {
    this._options = {}
  }

  this.contextInfo = {
    _debug: {},
    _metrics: {}
  }
  if (this._options.sendVerboseDebugInfo) {
    this.contextInfo._debug.log = []
    this.debugLog('Transaction', name, type)
  }

  this.traces = []
  this._activeTraces = {}

  this._scheduledTasks = {}

  this.events = {}

  Promise.call(this.donePromise = Object.create(Promise.prototype), function (resolve, reject) {
    this._resolve = resolve
    this._reject = reject
  }.bind(this.donePromise))

  // A transaction should always have a root trace spanning the entire transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction', {enableStackFrames: false})
  this._startStamp = new Date()
  this._start = this._rootTrace._start

  this.duration = this._rootTrace.duration.bind(this._rootTrace)
  this.nextId = 0

  this.isHardNavigation = false
}

Transaction.prototype.debugLog = function () {
  if (this._options.sendVerboseDebugInfo) {
    var messages = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
    messages.unshift(Date.now().toString())
    this.contextInfo._debug.log.push(messages.join(' - '))
  }
}

Transaction.prototype.addContextInfo = function (obj) {
  utils.merge(this.contextInfo, obj)
}

Transaction.prototype.setDebugData = function setDebugData (key, value) {
  this.contextInfo._debug[key] = value
}

Transaction.prototype.addMetrics = function (obj) {
  this.contextInfo._metrics = utils.merge(this.contextInfo._metrics, obj)
}

Transaction.prototype.redefine = function (name, type, options) {
  this.debugLog('redefine', name, type)
  this.name = name
  this.type = type
  this._options = options
}

Transaction.prototype.startTrace = function (signature, type, options) {
  // todo: should not accept more traces if the transaction is alreadyFinished
  this.debugLog('startTrace', signature, type)
  var opts = typeof options === 'undefined' ? {} : options
  opts.enableStackFrames = this._options.enableStackFrames === true && opts.enableStackFrames !== false

  var trace = new Trace(this, signature, type, opts)
  trace.traceId = this.nextId
  this.nextId++
  if (this._rootTrace) {
    trace.setParent(this._rootTrace)
    this._activeTraces[trace.traceId] = trace
  }

  return trace
}

Transaction.prototype.recordEvent = function (e) {
  var event = this.events[e.name]
  if (utils.isUndefined(event)) {
    event = { name: e.name, start: e.start, end: e.end, time: e.end - e.start, count: 0 }
    this.events[event.name] = event
  } else {
    event.time += (e.end - e.start)
    event.count++
    event.end = e.end
  }
}

Transaction.prototype.isFinished = function () {
  var scheduledTasks = Object.keys(this._scheduledTasks)
  var scheduledTraces = Object.keys(this._activeTraces)
  this.debugLog('isFinished scheduledTasks.length', scheduledTasks.length, "scheduledTraces.length", scheduledTraces.length)
  return (scheduledTasks.length === 0 && scheduledTraces.length === 0)
}

Transaction.prototype.detectFinish = function () {
  if (this.isFinished()) this.end()
}

Transaction.prototype.end = function () {
  if (this.ended) {
    return
  }
  this.debugLog('end')
  this.ended = true

  this.addContextInfo({
    url: {
      location: window.location.href
    }
  })
  this._rootTrace.end()

  if (this.isFinished() === true) {
    this._finish()
  }
  return this.donePromise
}

Transaction.prototype.addTask = function (taskId) {
  // todo: should not accept more tasks if the transaction is alreadyFinished]
  this.debugLog('addTask', taskId)
  this._scheduledTasks[taskId] = taskId
}

Transaction.prototype.removeTask = function (taskId) {
  this.debugLog('removeTask', taskId)
  this.setDebugData('lastRemovedTask', taskId)
  delete this._scheduledTasks[taskId]
}

Transaction.prototype.addEndedTraces = function (existingTraces) {
  this.traces = this.traces.concat(existingTraces)
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)
  trace._scheduledTasks = Object.keys(this._scheduledTasks)
  // Remove trace from _activeTraces
  delete this._activeTraces[trace.traceId]
}

Transaction.prototype._finish = function () {
  if (this._alreadFinished === true) {
    return
  }

  this._alreadFinished = true

  for (var key in this.events) {
    var event = this.events[key]
    var eventTrace = new Trace(this, key, key, this._options)
    eventTrace.ended = true
    eventTrace._start = event.start
    eventTrace._diff = event.time
    eventTrace._end = event.end
    eventTrace.setParent(this._rootTrace)
    this.traces.push(eventTrace)
  }

  this._adjustStartToEarliestTrace()
  this._adjustEndToLatestTrace()
  this.donePromise._resolve(this)
}

Transaction.prototype._adjustEndToLatestTrace = function () {
  var latestTrace = findLatestNonXHRTrace(this.traces)

  if (latestTrace) {
    this._rootTrace._end = latestTrace._end
    this._rootTrace.calcDiff()

    // set all traces that now are longer than the transaction to
    // be truncated traces
    for (var i = 0; i < this.traces.length; i++) {
      var trace = this.traces[i]
      if (trace._end > this._rootTrace._end) {
        trace._end = this._rootTrace._end
        trace.calcDiff()
        trace.type = trace.type + '.truncated'
      }
    }
  }
}

Transaction.prototype._adjustStartToEarliestTrace = function () {
  var trace = getEarliestTrace(this.traces)

  if (trace) {
    this._rootTrace._start = trace._start
    this._rootTrace.calcDiff()
    this._start = this._rootTrace._start
  }
}

function findLatestNonXHRTrace (traces) {
  var latestTrace = null
  for (var i = 0; i < traces.length; i++) {
    var trace = traces[i]
    if (trace.type && trace.type.indexOf('ext') === -1 &&
         trace.type !== 'transaction' &&
         (!latestTrace || latestTrace._end < trace._end)) {
      latestTrace = trace
    }
  }
  return latestTrace
}

function getEarliestTrace (traces) {
  var earliestTrace = null

  traces.forEach(function (trace) {
    if (!earliestTrace) {
      earliestTrace = trace
    }
    if (earliestTrace && earliestTrace._start > trace._start) {
      earliestTrace = trace
    }
  })

  return earliestTrace
}

module.exports = Transaction
