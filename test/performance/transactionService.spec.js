var TransactionService = require('../../src/performance/transactionService')
var Transaction = require('../../src/performance/transaction')
var Trace = require('../../src/performance/trace')

var ZoneServiceMock = require('./zoneServiceMock.js')
var logger = Object.create(require('loglevel'))

var Config = require('../../src/lib/config')

describe('TransactionService', function () {
  var transactionService
  var zoneServiceMock
  var config
  beforeEach(function () {
    zoneServiceMock = new ZoneServiceMock()

    spyOn(zoneServiceMock, 'get').and.callThrough()
    spyOn(logger, 'debug')

    config = Object.create(Config)
    config.init()
    transactionService = new TransactionService(zoneServiceMock, logger, config)
  })

  it('should not start trace when there is no current transaction', function () {
    transactionService.startTrace('test-trace', 'test-trace')
    expect(logger.debug).toHaveBeenCalled()
  })

  it('should call startTrace on current Transaction', function () {
    var tr = new Transaction('transaction', 'transaction')
    spyOn(tr, 'startTrace').and.callThrough()
    zoneServiceMock.zone.transaction = tr
    transactionService.startTrace('test-trace', 'test-trace')
    expect(zoneServiceMock.zone.transaction.startTrace).toHaveBeenCalledWith('test-trace', 'test-trace', undefined)
  })

  it('should not start trace when performance monitoring is disabled', function () {
    config.set('performance.enable', false)
    transactionService = new TransactionService(zoneServiceMock, logger, config)
    var tr = new Transaction('transaction', 'transaction')
    spyOn(tr, 'startTrace').and.callThrough()
    zoneServiceMock.zone.transaction = tr
    transactionService.startTrace('test-trace', 'test-trace')
    expect(zoneServiceMock.zone.transaction.startTrace).not.toHaveBeenCalled()
  })

  it('should not start transaction when performance monitoring is disabled', function () {
    config.set('performance.enable', false)
    transactionService = new TransactionService(zoneServiceMock, logger, config)

    var result = transactionService.startTransaction('transaction', 'transaction')

    expect(result).toBeUndefined()
  })

  it('should not start transaction when not in opbeat zone', function () {
    zoneServiceMock.isOpbeatZone = function () {
      return false
    }
    transactionService = new TransactionService(zoneServiceMock, logger, config)

    var result = transactionService.startTransaction('transaction', 'transaction')

    expect(result).toBeUndefined()
  })

  it('should start transaction', function () {
    config.set('performance.enable', true)
    config.set('performance.browserResponsivenessInterval', true)
    transactionService = new TransactionService(zoneServiceMock, logger, config)

    var result = transactionService.startTransaction('transaction1', 'transaction')
    expect(result).toBeDefined()
    result = transactionService.startTransaction('transaction2', 'transaction')
    expect(result.name).toBe('transaction2')
  })

  it('should create a zone transaction on the first trace', function () {
    config.set('performance.enable', true)
    transactionService = new TransactionService(zoneServiceMock, logger, config)

    var trace = transactionService.startTrace('testTrace', 'testtype')
    var trans = zoneServiceMock.get('transaction')
    expect(trans.name).toBe('ZoneTransaction')
    transactionService.startTransaction('transaction', 'transaction')
    expect(trans.name).toBe('transaction')
  })

  it('should not create transaction if performance is not enabled', function () {
    config.set('performance.enable', false)
    transactionService = new TransactionService(zoneServiceMock, logger, config)
    var result = transactionService.createTransaction('test', 'test', config.get('performance'))
    expect(result).toBeUndefined()
  })

  it('should not start interactions by default', function () {
    config.set('performance.enable', true)
    transactionService = new TransactionService(zoneServiceMock, logger, config)

    var trans = transactionService.startTransaction('interaction', 'interaction')
    expect(trans).toBeUndefined()
  })

  it('should call startTrace on current Transaction', function () {
    var tr = new Transaction('transaction', 'transaction')
    zoneServiceMock.zone.transaction = tr
    expect(tr._scheduledTasks).toEqual({})
    zoneServiceMock.spec.onScheduleTask({source: 'setTimeout',taskId: 'setTimeout1'})
    zoneServiceMock.spec.onScheduleTask({source: 'XMLHttpRequest.send',taskId: 'XMLHttpRequest.send1',XHR: {method: 'GET',url: 'url'}})
    expect(tr._scheduledTasks).toEqual({setTimeout1: 'setTimeout1','XMLHttpRequest.send1': 'XMLHttpRequest.send1'})
    zoneServiceMock.spec.onBeforeInvokeTask({source: 'XMLHttpRequest.send',taskId: 'XMLHttpRequest.send1',trace: new Trace(tr, 'trace', 'trace')})
    expect(tr._scheduledTasks).toEqual({setTimeout1: 'setTimeout1','XMLHttpRequest.send1': 'XMLHttpRequest.send1'})
    zoneServiceMock.spec.onInvokeTask({source: 'setTimeout',taskId: 'setTimeout1'})
    expect(tr._scheduledTasks).toEqual({'XMLHttpRequest.send1': 'XMLHttpRequest.send1'})
    zoneServiceMock.spec.onCancelTask({source: 'XMLHttpRequest.send',taskId: 'XMLHttpRequest.send1'})
    expect(tr._scheduledTasks).toEqual({})
  })

  it('should remove XHR query string by default', function () {
    expect(config.get('performance.includeXHRQueryString')).toBe(false)
    var tr = new Transaction('transaction', 'transaction')
    zoneServiceMock.zone.transaction = tr
    spyOn(transactionService, 'startTrace').and.callThrough()

    zoneServiceMock.spec.onScheduleTask({source: 'XMLHttpRequest.send',taskId: 'XMLHttpRequest.send1',XHR: {method: 'GET',url: 'http://test.com/path?key=value'}})
    expect(transactionService.startTrace).toHaveBeenCalledWith('GET http://test.com/path', 'ext.HttpRequest', { enableStackFrames: false })
  })

  it('should check performance.includeXHRQueryString config', function () {
    config.set('performance.includeXHRQueryString', true)
    expect(config.get('performance.includeXHRQueryString')).toBe(true)
    var tr = new Transaction('transaction', 'transaction')
    zoneServiceMock.zone.transaction = tr
    spyOn(transactionService, 'startTrace').and.callThrough()

    zoneServiceMock.spec.onScheduleTask({source: 'XMLHttpRequest.send',taskId: 'XMLHttpRequest.send1',XHR: {method: 'GET',url: 'http://test.com/path?key=value'}})
    expect(transactionService.startTrace).toHaveBeenCalledWith('GET http://test.com/path?key=value', 'ext.HttpRequest', { enableStackFrames: false })
  })
})
