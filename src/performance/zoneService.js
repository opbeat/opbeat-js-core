var Subscription = require('../common/subscription')
var patchUtils = require('../common/patchUtils')
var opbeatTaskSymbol = patchUtils.opbeatSymbol('taskData')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')

var XMLHttpRequest_send = 'XMLHttpRequest.send'

var opbeatDataSymbol = patchUtils.opbeatSymbol('opbeatData')

var testTransactionAfterEvents = ['click', 'contextmenu', 'dblclick', 'mousedown', 'keydown', 'keypress', 'keyup'] // leave these out for now: 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 
var testTransactionAfterEventsObj = {}
testTransactionAfterEvents.forEach(function (ev) {
  testTransactionAfterEventsObj[ev] = 1
})

function ZoneService (logger, config) {
  this.events = new Subscription()

  var nextId = 0

  // var zoneService = this
  function noop () { }
  var spec = this.spec = {
    onScheduleTask: noop,
    onBeforeInvokeTask: noop,
    onInvokeTask: noop,
    onCancelTask: noop,
    onHandleError: noop,
    onInvokeStart: noop,
    onInvokeEnd: noop
  }

  this.zoneConfig = {
    name: 'opbeatRootZone',
    onScheduleTask: function (parentZoneDelegate, currentZone, targetZone, task) {
      if (task.type === 'eventTask' && task.data.eventName === 'opbeatImmediatelyFiringEvent') {
        task.data.handler(task.data)
        return task
      }

      var hasTarget = task.data && task.data.target
      if (hasTarget && typeof task.data.target[opbeatDataSymbol] === 'undefined') {
        task.data.target[opbeatDataSymbol] = {registeredEventListeners: {}}
      }

      logger.trace('zoneservice.onScheduleTask', task.source, ' type:', task.type)
      if (task.type === 'macroTask') {
        logger.trace('Zone: ', targetZone.name)
        var taskId = nextId++
        var opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: task.type
        }

        if (task.source === 'setTimeout') {
          if (task.data.args[1] === 0 || typeof task.data.args[1] === 'undefined') {
            task[opbeatTaskSymbol] = opbeatTask
            spec.onScheduleTask(opbeatTask)
          }
        } else if (task.source === XMLHttpRequest_send) {
          /*
                  "XMLHttpRequest.addEventListener:load"
                  "XMLHttpRequest.addEventListener:error"
                  "XMLHttpRequest.addEventListener:abort"
                  "XMLHttpRequest.send"
                  "XMLHttpRequest.addEventListener:readystatechange"
          */

          opbeatTask['XHR'] = {
            resolved: false,
            'send': false,
            url: task.data.target[urlSympbol],
            method: task.data.target[methodSymbol]
          }

          // target for event tasks is different instance from the XMLHttpRequest, on mobile browsers
          // A hack to get the correct target for event tasks
          task.data.target.addEventListener('opbeatImmediatelyFiringEvent', function (event) {
            if (typeof event.target[opbeatDataSymbol] !== 'undefined') {
              task.data.target[opbeatDataSymbol] = event.target[opbeatDataSymbol]
            } else {
              task.data.target[opbeatDataSymbol] = event.target[opbeatDataSymbol] = {registeredEventListeners: {}}
            }
          })

          task.data.target[opbeatDataSymbol].task = opbeatTask
          task.data.target[opbeatDataSymbol].typeName = 'XMLHttpRequest'

          spec.onScheduleTask(opbeatTask)
        }
      } else if (task.type === 'eventTask' && hasTarget && (task.data.eventName === 'readystatechange' || task.data.eventName === 'load')) {
        task.data.target[opbeatDataSymbol].registeredEventListeners[task.data.eventName] = {resolved: false}
      } else if (task.type === 'microTask' && task.source === 'Promise.then') {
        taskId = nextId++
        var opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: task.type
        }

        task[opbeatTaskSymbol] = opbeatTask
        spec.onScheduleTask(opbeatTask)
      }

      var delegateTask = parentZoneDelegate.scheduleTask(targetZone, task)
      return delegateTask
    },
    onInvoke: function (parentZoneDelegate, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
      var taskId = nextId++
      var opbeatTask = {
          taskId: source + taskId,
          source: source,
          type: 'invoke',
        }
      spec.onInvokeStart(opbeatTask)
      var result = delegate.apply(applyThis, applyArgs)
      spec.onInvokeEnd(opbeatTask)
      return result
    },
    onInvokeTask: function (parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs) {
      spec.onInvokeStart({source: task.source, type: task.type})
      logger.trace('zoneservice.onInvokeTask', task.source, ' type:', task.type)
      var hasTarget = task.data && task.data.target
      var result

      if (hasTarget && task.data.target[opbeatDataSymbol].typeName === 'XMLHttpRequest') {
        var opbeatData = task.data.target[opbeatDataSymbol]
        logger.trace('opbeatData', opbeatData)
        var opbeatTask = opbeatData.task

        if (opbeatTask && task.data.eventName === 'readystatechange' && task.data.target.readyState === task.data.target.DONE) {
          opbeatData.registeredEventListeners['readystatechange'].resolved = true
          spec.onBeforeInvokeTask(opbeatTask)
        } else if (opbeatTask && task.data.eventName === 'load' && 'load' in opbeatData.registeredEventListeners) {
          opbeatData.registeredEventListeners.load.resolved = true
        } else if (opbeatTask && task.source === XMLHttpRequest_send) {
          opbeatTask.XHR.resolved = true
        }

        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        if (opbeatTask && (!opbeatData.registeredEventListeners['load'] || opbeatData.registeredEventListeners['load'].resolved) && (!opbeatData.registeredEventListeners['readystatechange'] || opbeatData.registeredEventListeners['readystatechange'].resolved) && opbeatTask.XHR.resolved) {
          spec.onInvokeTask(opbeatTask)
        }
      } else if (task[opbeatTaskSymbol] && (task.source === 'setTimeout' || task.source === 'Promise.then')) {
        spec.onBeforeInvokeTask(task[opbeatTaskSymbol])
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        spec.onInvokeTask(task[opbeatTaskSymbol])
      } else if (task.type === 'eventTask' && hasTarget && task.data.eventName in testTransactionAfterEventsObj) {
        var taskId = nextId++
        var opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: 'interaction',
          applyArgs: applyArgs
        }

        spec.onScheduleTask(opbeatTask)

        // clear traces on the zone transaction
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        spec.onInvokeTask(opbeatTask)
      } else {
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
      }
      spec.onInvokeEnd({source: task.source, type: task.type})
      return result
    },
    onCancelTask: function (parentZoneDelegate, currentZone, targetZone, task) {
      // logger.trace('Zone: ', targetZone.name)
      var opbeatTask
      if (task.type === 'macroTask') {
        if (task.source === XMLHttpRequest_send) {
          opbeatTask = task.data.target[opbeatDataSymbol].task
          spec.onCancelTask(opbeatTask)
        } else if (task[opbeatTaskSymbol] && (task.source === 'setTimeout')) {
          opbeatTask = task[opbeatTaskSymbol]
          spec.onCancelTask(opbeatTask)
        }
      }
      return parentZoneDelegate.cancelTask(targetZone, task)
    }
  // onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
  //   spec.onHandleError(error)
  //   parentZoneDelegate.handleError(targetZone, error)
  // }
  }

  // if (config.get('debug') === true) {
  //   zoneConfig.properties = {opbeatZoneData: {name: 'opbeatRootZone', children: []}}
  //   zoneConfig.onFork = function (parentZoneDelegate, currentZone, targetZone, zoneSpec) {
  //     var childZone = parentZoneDelegate.fork(targetZone, zoneSpec)
  //     console.log('onFork: ', arguments)
  //     console.log('onFork: ', childZone)

  //     var childZoneData = {name: childZone.name}

  //     if (targetZone._properties['opbeatZoneData']) {
  //       targetZone._properties['opbeatZoneData'].children.push(childZoneData)
  //     } else {
  //       targetZone._properties['opbeatZoneData'] = {
  //         name: targetZone.name,
  //         children: [childZoneData]
  //       }
  //     }
  //     console.log('onFork:opbeatZoneData:', targetZone._properties['opbeatZoneData'])
  //     return childZone
  //   }
  // }
}

ZoneService.prototype.initialize = function (zone) {
  this.outer = zone
  this.zone = zone.fork(this.zoneConfig)
}

ZoneService.prototype.set = function (key, value) {
  window.Zone.current._properties[key] = value
}
ZoneService.prototype.get = function (key) {
  return window.Zone.current.get(key)
}

ZoneService.prototype.getFromOpbeatZone = function (key) {
  return this.zone.get(key)
}
ZoneService.prototype.setOnOpbeatZone = function (key, value) {
  this.zone._properties[key] = value
}

ZoneService.prototype.getCurrentZone = function () {
  return window.Zone.current
}

ZoneService.prototype.isOpbeatZone = function () {
  return this.zone.name === window.Zone.current.name
}

ZoneService.prototype.runOuter = function (fn) {
  return this.outer.run(fn)
}

ZoneService.prototype.runInOpbeatZone = function runInOpbeatZone (fn, applyThis, applyArgs, source) {
  return this.zone.run(fn, applyThis, applyArgs, source || 'runInOpbeatZone:' + fn.name)
}

module.exports = ZoneService
