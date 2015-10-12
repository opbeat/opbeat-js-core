'use strict'

var Trace = require('./trace')

var Transaction = function (queue, name, type) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false

  this.traces = []
  this.activetraces = []
  this._queue = queue

  console.log('- %c opbeat.instrumentation.transaction.ctor', 'color: #3360A3', this.name)

  // A transaction should always have a root trace spanning the entire
  // transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction')


  this._startStamp = this._rootTrace._startStamp
  this._start = this._rootTrace._start
  this.duration = this._rootTrace.duration.bind(this._rootTrace)
}

Transaction.prototype.end = function () {
  this.ended = true

  this._rootTrace.end()
  this._queue.add(this)

  console.log('- %c opbeat.instrumentation.transaction.end', 'color: #3360A3', this.name, this.activetraces.length)
}

Transaction.prototype.startTrace = function (signature, type) {
  var trace = new Trace(this, signature, type)
  trace.setParent(this._rootTrace)

  this.activetraces.push(trace)

  return trace
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)

  var index = this.activetraces.indexOf(trace)
  if (index > -1) {
    this.activetraces.splice(index, 1)
  }

  console.log('opbeat.instrumentation.transaction._endTrace', this.name, this.activetraces.length)

}

module.exports = Transaction
