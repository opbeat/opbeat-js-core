var StackFrameService = require('../../src/exceptions/stackFrameService')
var ServiceFactory = require('../../src/common/serviceFactory')

describe('StackFrameService', function () {
  var originalTimeout
  var serviceFactory
  var stackFrameService
  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000

    serviceFactory = new ServiceFactory()
    stackFrameService = serviceFactory.getStackFrameService()
  })

  it('should produce correct number of frames', function (done) {
    setTimeout(function () {
      stackFrameService.getFramesForCurrent().then(function (framesData) {
        expect(framesData.length).toBe(5)
        done()
      })
    }, 1)
  })

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })
})
