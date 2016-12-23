var ServiceFactory = require('../../src/common/serviceFactory')
var Config = require('../../src/lib/config')

function OpbeatBackendMock () {
  this.sendError = function () {}
}
describe('ExceptionHandler', function () {
  var exceptionHandler
  var config
  var opbeatBackend
  var logger
  beforeEach(function () {
    var serviceFactory = new ServiceFactory()
    config = Object.create(Config)
    config.init()
    serviceFactory.services['ConfigService'] = config
    opbeatBackend = new OpbeatBackendMock()
    serviceFactory.services['OpbeatBackend'] = opbeatBackend

    exceptionHandler = serviceFactory.getExceptionHandler()
    logger = serviceFactory.getLogger()
    // logger.setLevel('debug', false)
    spyOn(logger, 'warn').and.callThrough()
  })
  it('should process errors', function (done) {
    // in IE 10, Errors are given a stack once they're thrown.
    try {
      throw new Error('unittest error')
    } catch (error) {
      exceptionHandler.processError(error)
        .then(function () {
          expect(logger.warn).not.toHaveBeenCalled()
          done()
        }, function (reason) {
          fail(reason)
        })
    }
  })
})
