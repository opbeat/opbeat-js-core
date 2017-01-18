var ServiceFactory = require('../../src/common/serviceFactory')
var Config = require('../../src/lib/config')
var TransportMock = require('../utils/transportMock')

describe('ExceptionHandler', function () {
  var exceptionHandler
  var config
  var opbeatBackend
  var logger
  var transport
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    transport = serviceFactory.services['Transport'] = new TransportMock()

    exceptionHandler = serviceFactory.getExceptionHandler()
    logger = serviceFactory.getLogger()
  })
  it('should process errors', function (done) {
    // in IE 10, Errors are given a stack once they're thrown.
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    expect(config.isValid()).toBe(true)
    spyOn(logger, 'warn').and.callThrough()
    try {
      throw new Error('unittest error')
    } catch (error) {
      // error['_opbeat_extra_context'] = {test: 'hamid'}
      error.test = 'hamid'
      error.aDate = new Date('2017-01-12T00:00:00.000Z')
      var obj = {test: 'test'}
      obj.obj = obj
      error.anObject = obj
      error.aFunction = function noop () {}
      error.null = null
      exceptionHandler.processError(error)
        .then(function () {
          expect(logger.warn).not.toHaveBeenCalled()
          expect(transport.errors.length).toBe(1)
          var errorData = transport.errors[0]
          expect(errorData.data.extra.test).toBe('hamid')
          expect(errorData.data.extra.aDate).toBe('2017-01-12T00:00:00.000Z') // toISOString()
          expect(errorData.data.extra.anObject).toBeUndefined()
          expect(errorData.data.extra.aFunction).toBeUndefined()
          expect(errorData.data.extra.null).toBeUndefined()
          done()
        }, function (reason) {
          fail(reason)
        })
    }
  })

  it('should capture extra data', function (done) {
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    expect(config.isValid()).toBe(true)
    try {
      throw new Error('unittest error')
    } catch (error) {
      // error['_opbeat_extra_context'] = {test: 'hamid'}
      error.test = 'hamid'
      error.aDate = new Date('2017-01-12T00:00:00.000Z')
      var obj = {test: 'test'}
      obj.obj = obj
      error.anObject = obj
      error.aFunction = function noop () {}
      error.null = null
      exceptionHandler.processError(error, {extra: {extraObject: {test: 'test'}}})
        .then(function () {
          expect(transport.errors.length).toBe(1)
          var errorData = transport.errors[0]
          expect(errorData.data.extra.test).toBe('hamid')
          expect(errorData.data.extra.aDate).toBe('2017-01-12T00:00:00.000Z') // toISOString()
          expect(errorData.data.extra.anObject).toBeUndefined()
          expect(errorData.data.extra.aFunction).toBeUndefined()
          expect(errorData.data.extra.null).toBeUndefined()
          expect(errorData.data.extra.extraObject).toEqual({test: 'test'})
          done()
        }, function (reason) {
          fail(reason)
        })
    }
  })
})
