var Trace = require('./trace')

var eventPairs = [
  ['domainLookupStart', 'domainLookupEnd', 'DNS lookup'],
  ['connectStart', 'connectEnd', 'Connect'],
  ['requestStart', 'responseStart', 'Sending and waiting for first byte'],
  ['responseStart', 'responseEnd', 'Downloading'],
  ['domLoading', 'domInteractive', 'Fetching, parsing and sync. execution'],
  ['domContentLoadedEventStart', 'domContentLoadedEventEnd', '"DOMContentLoaded" event handling'],
  ['loadEventStart', 'loadEventEnd', '"load" event handling']
]

module.exports = function captureHardNavigation (transaction) {
  if (transaction.isHardNavigation && window.performance && window.performance.timing) {
    var baseTime = window.performance.timing.navigationStart
    var timings = window.performance.timing

    transaction._rootTrace._start = transaction._start = 0
    transaction.type = 'page-load'
    var traceThreshold = 5 * 60 * 1000 // 5 minutes
    for (var i = 0; i < eventPairs.length; i++) {
      // var transactionStart = eventPairs[0]
      var start = timings[eventPairs[i][0]]
      var end = timings[eventPairs[i][1]]
      if (start && end && end - start !== 0) {
        var trace = new Trace(transaction, eventPairs[i][2], 'hard-navigation.browser-timing')
        trace._start = timings[eventPairs[i][0]] - baseTime
        trace.ended = true
        trace.setParent(transaction._rootTrace)
        trace.end()
        trace._end = timings[eventPairs[i][1]] - baseTime
        trace.calcDiff()
        var d = trace.duration()
        if (d > traceThreshold || d < 0) {
          transaction.traces.splice(transaction.traces.indexOf(trace), 1)
        }
      }
    }

    if (window.performance.getEntriesByType) {
      var entries = window.performance.getEntriesByType('resource')
      for (i = 0; i < entries.length; i++) {
        var entry = entries[i]
        if (entry.initiatorType && entry.initiatorType === 'xmlhttprequest') {
          continue
        } else {
          var kind = 'resource'
          if (entry.initiatorType) {
            kind += '.' + entry.initiatorType
          }

          trace = new Trace(transaction, entry.name, kind)
          trace._start = entry.startTime
          trace.ended = true
          trace.setParent(transaction._rootTrace)
          trace.end()
          trace._end = entry.responseEnd
          trace.calcDiff()
        }
      }
    }

    transaction._adjustStartToEarliestTrace()
    transaction._adjustEndToLatestTrace()
  }
  return 0
}
