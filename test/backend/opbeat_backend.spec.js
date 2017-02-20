var Config = require('../../src/lib/config')
var OpbeatBackend = require('../../src/backend/opbeat_backend')

var Transaction = require('../../src/performance/transaction')
var ServiceFactory = require('../../src/common/serviceFactory')

var TransportMock = require('../utils/transportMock')

describe('OpbeatBackend', function () {
  var config
  var transportMock
  var opbeatBackend
  var serviceFactory
  var logger
  beforeEach(function () {
    serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config

    logger = serviceFactory.getLogger()

    transportMock = new TransportMock()
    serviceFactory.services['Transport'] = transportMock

    spyOn(transportMock, 'sendTransaction').and.callThrough()
    spyOn(transportMock, 'sendError').and.callThrough()
    spyOn(logger, 'warn')
    spyOn(logger, 'debug')
    opbeatBackend = serviceFactory.getOpbeatBackend()
  })

  it('should not send transctions when the list is empty', function () {
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    spyOn(logger, 'warn')
    expect(config.isValid()).toBe(true)
    opbeatBackend.sendTransactions([])
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('should not send any transactions if the config is not valid', function () {
    expect(config.isValid()).toBe(false)
    opbeatBackend.sendTransactions([])
    expect(logger.debug).toHaveBeenCalledWith('Config is not valid')
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
  })

  it('should not send frames with length === 0', function (done) {
    config.setConfig({
      appId: 'test', orgId: 'test', isInstalled: true,
      performance: {
        checkBrowserResponsiveness: false,
        groupSimilarTraces: false
      }
    })
    expect(config.isValid()).toBe(true)

    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.startTrace().end()
    tr.end()

    tr.donePromise.then(function () {
      opbeatBackend.sendTransactions([tr])
      var groups = transportMock.transactions[0].data.traces.groups
      groups.forEach(function (g) {
        var frame = g.extra._frames
        if (typeof frame !== 'undefined') {
          expect(frame.length).toBeGreaterThan(0)
        }
      })
      done()
    }).catch(function (reason) {
      fail(reason)
    })
  })

  it('should group small continuously similar traces up until the last one', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    var trace1 = tr.startTrace('signature', 'type')
    trace1.end()
    var trace2 = tr.startTrace('signature', 'type')
    trace2.end()
    var trace3 = tr.startTrace('another-signature', 'type')
    trace3.end()
    var trace4 = tr.startTrace('signature', 'type')
    trace4.end()
    var trace5 = tr.startTrace('signature', 'type')
    trace5.end()

    tr.end()

    tr._rootTrace._start = 10
    tr._rootTrace._end = 1000

    trace1._start = 20
    trace1._end = 30

    trace2._start = 31
    trace2._end = 35

    trace3._start = 35
    trace3._end = 45

    trace4._start = 50
    trace4._end = 60

    trace5._start = 61
    trace5._end = 70

    tr.traces.sort(function (traceA, traceB) {
      return traceA._start - traceB._start
    })
    var grouped = opbeatBackend.groupSmallContinuouslySimilarTraces(tr, 0.05)

    expect(grouped.length).toBe(4)
    expect(grouped[0].signature).toBe('transaction')
    expect(grouped[1].signature).toBe('2x signature')
    expect(grouped[2].signature).toBe('another-signature')
    expect(grouped[3].signature).toBe('2x signature')
  })

  it('should group small continuously similar traces', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    var trace1 = tr.startTrace('signature', 'type')
    trace1.end()
    var trace2 = tr.startTrace('signature', 'type')
    trace2.end()
    var trace3 = tr.startTrace('signature', 'type')
    trace3.end()
    var trace4 = tr.startTrace('signature', 'type')
    trace4.end()
    var trace5 = tr.startTrace('another-signature', 'type')
    trace5.end()

    tr.end()

    tr._rootTrace._start = 10
    tr._rootTrace._end = 1000

    trace1._start = 20
    trace1._end = 30

    trace2._start = 31
    trace2._end = 35

    trace3._start = 35
    trace3._end = 45

    trace4._start = 50
    trace4._end = 60

    trace5._start = 60
    trace5._end = 70

    tr.traces.sort(function (traceA, traceB) {
      return traceA._start - traceB._start
    })

    var grouped = opbeatBackend.groupSmallContinuouslySimilarTraces(tr, 0.05)

    expect(grouped.length).toBe(3)
    expect(grouped[0].signature).toBe('transaction')
    expect(grouped[1].signature).toBe('4x signature')
    expect(grouped[2].signature).toBe('another-signature')
  })

  it('should group small similar traces by default', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)
    expect(config.get('performance.groupSimilarTraces')).toBe(true)

    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.startTrace('signature', 'type').end()
    tr.end()

    spyOn(opbeatBackend, 'groupSmallContinuouslySimilarTraces').and.callThrough()
    opbeatBackend.sendTransactions([tr])
    expect(opbeatBackend.groupSmallContinuouslySimilarTraces).toHaveBeenCalled()
  })

  it('should not send errors if the config is not valid', function () {
    expect(config.isValid()).toBe(false)
    opbeatBackend.sendError(new Error())
    expect(logger.debug).toHaveBeenCalledWith('Config is not valid')
    expect(transportMock.sendError).not.toHaveBeenCalled()
  })

  it('should calculate browser responsiveness', function () {
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.end()

    tr._rootTrace._start = 1

    tr._rootTrace._end = 400
    tr.browserResponsivenessCounter = 0
    var resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 1001
    tr.browserResponsivenessCounter = 2
    resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 1601
    tr.browserResponsivenessCounter = 2
    resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(true)

    tr._rootTrace._end = 3001
    tr.browserResponsivenessCounter = 3
    resp = opbeatBackend.checkBrowserResponsiveness(tr, 500, 2)
    expect(resp).toBe(false)
  })

  it('should check browser responsiveness based on config', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)

    config.setConfig({
      performance: {
        checkBrowserResponsiveness: false
      }
    })

    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.end()

    tr._rootTrace._start = 1
    tr._rootTrace._end = 1001
    tr.browserResponsivenessCounter = 0

    spyOn(opbeatBackend, 'checkBrowserResponsiveness').and.callThrough()

    opbeatBackend.sendTransactions([tr])

    expect(opbeatBackend.checkBrowserResponsiveness).not.toHaveBeenCalled()
    expect(transportMock.sendTransaction).toHaveBeenCalled()

    config.setConfig({
      performance: {
        checkBrowserResponsiveness: true
      }
    })

    transportMock.sendTransaction.calls.reset()
    opbeatBackend.sendTransactions([tr])
    expect(opbeatBackend.checkBrowserResponsiveness).toHaveBeenCalled()
    expect(transportMock.sendTransaction).toHaveBeenCalled()

    tr._rootTrace._start = 1
    tr._rootTrace._end = 3001
    tr.browserResponsivenessCounter = 1

    transportMock.sendTransaction.calls.reset()
    opbeatBackend.sendTransactions([tr])
    expect(opbeatBackend.checkBrowserResponsiveness).toHaveBeenCalled()
    expect(transportMock.sendTransaction).not.toHaveBeenCalled()
  })

  it('should truncate the trace signature at 512', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)
    var longSignature = 'GET http://test.com?data=hiyjietyudpmenkjnnlrvjgzqpzaaijgujvedixcgybhrqnbwbqrycsxyckmcjyqkiuwnppyfqgirckivfcledrzrxoowqjqfjptoywtfuuwpvovhrbytrqciymufopnyawkbiaddpnvaxbxvnyfjmumjrvtwitwiuicpyebzqzqtqxtggtkkjpndpwthssufrftwxdohmyegdutqajlgrqzsemfoyuhvngnhkcbexccebbazlpyjmwdyhfdfuxbmbpycuuwbtnngsjlijsfpemotctdiumwopdmtsxzaohvttrooabidjmqdxxjuwmhkvmzsxxnchpnnewzvvlifeprdpwnsvojhptizdndjfrnlfxyganzgstgpsqhbyrrkftnkmvkrpnaickpxasxwahgdknywbixyvzapppmsmmjupwfllsmndmnhqzuknswdgitdanvxvjgjspszmkavqsedujaxuvopyfubyjsldjqsxzhtaodcigzbqxfodwukpboehcgnokznywzgx'
    expect(longSignature.length).toBeGreaterThan(512)
    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.startTrace(longSignature, 'type').end()
    tr.end()
    opbeatBackend.sendTransactions([tr])
    expect(transportMock.sendTransaction).toHaveBeenCalled()
    expect(transportMock.transactions.length).toBe(1)
    var groups = transportMock.transactions[0].data.traces.groups
    groups.forEach(function (g) {
      expect(g.signature.length).toBeLessThan(512)
    })
  })

  it('should add correct headers', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    config.setConfig({platform: {platform: 'cordova', framework: 'angular/version'}})

    var tr = new Transaction('transaction', 'transaction', { 'performance.enableStackFrames': true })
    tr.end()
    opbeatBackend.sendTransactions([tr])
    expect(transportMock.transactions.length).toBe(1)
    var headers = transportMock.transactions[0].headers
    expect(headers['X-Opbeat-Platform']).toBe('platform=cordova framework=angular/version')
  })

  it('should add contextInfo if it exists', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    var tr = new Transaction('transaction', 'transaction')
    tr.end()
    tr.addContextInfo({test: 'test'})
    opbeatBackend.sendTransactions([tr])
    expect(transportMock.transactions.length).toBe(1)
    var data = transportMock.transactions[0].data
    var raw = data.traces.raw[0]
    var contextInfo = raw[raw.length - 1]
    expect(contextInfo.test).toEqual('test')
  })

  it('should parse contextInfo.url.location', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    var tr = new Transaction('transaction', 'transaction')
    tr.end()
    tr.addContextInfo({url: {location: 'http://test.com/pathname?key=value#hash'}})
    opbeatBackend.sendTransactions([tr])
    expect(transportMock.transactions.length).toBe(1)
    var data = transportMock.transactions[0].data
    var raw = data.traces.raw[0]
    var contextInfo = raw[raw.length - 1]
    expect(contextInfo.url).toEqual(jasmine.objectContaining({
      location: 'http://test.com/pathname?key=value#hash',
      base: 'http://test.com/pathname',
      query: {key: 'value'},
      hash: '#hash'
    }))
  })

  it('should check for accepted protocols in contextInfo.url.location', function () {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    var tr = new Transaction('transaction', 'transaction')
    tr.end()
    tr.addContextInfo({url: {location: 'test://test.com'}})
    opbeatBackend.sendTransactions([tr])
    expect(transportMock.transactions.length).toBe(1)
    var data = transportMock.transactions[0].data
    var raw = data.traces.raw[0]
    var contextInfo = raw[raw.length - 1]
    expect(contextInfo.url.location).toBeUndefined()
  })

  it('should send file_errors', function (done) {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    expect(config.isValid()).toBe(true)
    var exceptionHandler = serviceFactory.getExceptionHandler()
    // in IE 10, Errors are given a stack once they're thrown.
    try {
      throw new Error('unittest error')
    } catch (error) {
      var promise = exceptionHandler.processError(error)
    }
    promise.then(function () {
      expect(transportMock.errors.length).toBe(1)
      var errorData = transportMock.errors[0]
      expect(errorData.data.extra.debug).toBeUndefined()
      done()
    }, function () {
      fail()
    })
  })

  it('should warn if sendTransaction fails', function (done) {
    config.setConfig({appId: 'test', orgId: 'test', isInstalled: true})
    spyOn(logger, 'warn')
    transportMock.transactionInterceptor = function (data, headers) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          reject('No reason!')
        }, 0)
      })
    }
    var tr = new Transaction('transaction', 'transaction')
    tr.end()
    opbeatBackend.sendTransactions([tr])
      .then(function () {
        console.log('success', arguments)
      }, function () {
        expect(logger.warn).toHaveBeenCalledWith('Failed sending transactions!', 'No reason!')
        done()
      })
  })
})
