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

var navigationTimingKeys = [
  'navigationStart', 'unloadEventStart', 'unloadEventEnd', 'redirectStart', 'redirectEnd', 'fetchStart', 'domainLookupStart', 'domainLookupEnd', 'connectStart',
  'connectEnd', 'secureConnectionStart', 'requestStart', 'responseStart', 'responseEnd', 'domLoading', 'domInteractive', 'domContentLoadedEventStart', 'domContentLoadedEventEnd', 'domComplete', 'loadEventStart', 'loadEventEnd']

var traceThreshold = 5 * 60 * 1000 // 5 minutes
function isValidTrace (transaction, trace) {
  var d = trace.duration()
  return (d < traceThreshold && d > 0 && trace._start <= transaction._rootTrace._end && trace._end <= transaction._rootTrace._end)
}

module.exports = function captureHardNavigation (transaction) {
  if (transaction.isHardNavigation && window.performance && window.performance.timing) {
    var baseTime = window.performance.timing.fetchStart
    var timings = window.performance.timing

    transaction._rootTrace._start = transaction._start = 0
    transaction.type = 'page-load'
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
        if (!isValidTrace(transaction, trace)) {
          transaction.traces.splice(transaction.traces.indexOf(trace), 1)
        }
      }
    }

    if (window.performance.getEntriesByType) {
      var entries = window.performance.getEntriesByType('resource')

      var ajaxUrls = transaction.traces
          .filter(function (trace) { return trace.type.indexOf('ext.HttpRequest') > -1 } )
          .map(function (trace) { return trace.signature.split(' ')[1] })

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i]
        if (entry.initiatorType && entry.initiatorType === 'xmlhttprequest') {
          continue
        } else if (entry.initiatorType !== 'css' && entry.initiatorType !== 'img' && entry.initiatorType !== 'script' && entry.initiatorType !== 'link') {
          // is web request? test for css/img before the expensive operation
          var foundAjaxReq = false
          for (var j = 0; j < ajaxUrls.length; j++) {
            // entry.name.endsWith(ajaxUrls[j])
            var idx = entry.name.lastIndexOf(ajaxUrls[j])
            if (idx > -1 && idx === (entry.name.length - ajaxUrls[j].length)) {
              foundAjaxReq = true
              break
            }
          }
          if (foundAjaxReq) {
            continue
          }
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
          if (!isValidTrace(transaction, trace)) {
            transaction.traces.splice(transaction.traces.indexOf(trace), 1)
          }
        }
      }
    }
    transaction._adjustStartToEarliestTrace()
    transaction._adjustEndToLatestTrace()

    var metrics = {
      timeToComplete: transaction._rootTrace._end
    }
    navigationTimingKeys.forEach(function (timingKey) {
      var m = timings[timingKey]
      if (m) {
        metrics[timingKey] = m - baseTime
      }
    })
    transaction.addMetrics(metrics)
  }
  return 0
}
