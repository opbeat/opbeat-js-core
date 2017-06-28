var ServiceFactory = require('../../src/common/serviceFactory')
var Config = require('../../src/lib/config')
var TransportMock = require('../utils/transportMock')

describe('ExceptionHandler', function () {
  var testErrorMessage = 'errorevent_test_error_message'
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

  it('should handle edge cases', function (done) {
    // todo: make this test more specific
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    spyOn(logger, 'warn')
    var resultPromises = []
    resultPromises.push(exceptionHandler.processError())
    resultPromises.push(exceptionHandler.processError({}, {}))
    resultPromises.push(exceptionHandler.processError(undefined, {eventObject: {}}))

    Promise.all(resultPromises).then(function (result) {
      // console.log(result)
      expect(logger.warn).toHaveBeenCalled()
      done()
    })
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

  it('should support ErrorEvent', function (done) {
    var _onError = window.onerror

    var testEventListener = function (errorEvent) {
      expect(typeof errorEvent).toBe('object')
      exceptionHandler.getExceptionData(undefined, {
        eventObject: {
          msg: errorEvent
        }
      }).then(function (data) {
        // the message is different in IE 10 since error type is not available
        expect(data.message).toContain(testErrorMessage)
        // the number of frames is different in different platforms
        expect(data.stacktrace.frames.length).toBeGreaterThan(0)
        done()
      })
      window.removeEventListener('error', testEventListener)
      window.onerror = _onError
    }
    window.addEventListener('error', testEventListener)

    // can't use ErrorEvent constructor so need to throw an actual error
    setTimeout(function () {
      // need this to prevent karma from failing the test
      window.onerror = null
      throw new Error(testErrorMessage)
    })
  })

  it('should install onerror and accept ErrorEvents', function (done) {
    config.setConfig({ appId: 'test', orgId: 'test', isInstalled: true })
    var _onError = window.onerror
    window.onerror = null
    exceptionHandler.install()

    expect(typeof window.onerror).toBe('function')
    var apmOnError = window.onerror
    window.onerror = _onError
    var count = 0
    transport.subscribe(function (name, obj) {
      expect(name).toBe('sendError')
      expect(obj.data.message).toContain(testErrorMessage)

      count++
      if (count === 4) {
        done()
      }
    })

    var testEventListener = function (errorEvent) {
      apmOnError(errorEvent)
      window.removeEventListener('error', testEventListener)
      window.onerror = _onError
      return true
    }
    window.addEventListener('error', testEventListener)

    try {
      throw new Error(testErrorMessage)
    } catch(error) {
      apmOnError(testErrorMessage, 'filename', 1, 2, error)
    }

    apmOnError(testErrorMessage, 'filename', 1, 2, undefined)
    apmOnError(testErrorMessage, undefined, undefined, undefined, undefined)
    apmOnError('Test:' + testErrorMessage, 'filename', 1, 2, undefined)
    apmOnError('Script error.', undefined, undefined, undefined, undefined)

    setTimeout(function () {
      window.onerror = null
      throw new Error(testErrorMessage)
    })
    window.onerror = _onError
  })
})
