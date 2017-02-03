var patchFetch = require('../../src/common/patches/fetchPatch').patchFetch
var ServiceFactory = require('../../src/common/serviceFactory')

describe('fetchPatch', function () {
  var serviceFactory = new ServiceFactory()
  var performance = serviceFactory.getPerformanceServiceContainer()
  performance.initialize()

  var originalFetch = window.fetch
  patchFetch(performance)

  function isPlatformSupported () {
    return !!originalFetch
  }

  it('should check if fetch is supported before patching', function () {
    if (isPlatformSupported()) {
      expect(typeof window.fetch).toBe('function')
    } else {
      expect(window.fetch).toBe(originalFetch)
    }
  })

  it('should fetch out of opbeat zone', function (done) {
    if (!isPlatformSupported()) {
      done()
      return
    }
    window.fetch(window.location.href).then(function (response) {
      expect(response.status).toBe(200)
      done()
    }, function (reason) {
      console.log('failed', reason)
    })
  })

  it('should fetch within the opbeat zone', function (done) {
    if (!isPlatformSupported()) {
      done()
      return
    }
    performance.services.zoneService.runInOpbeatZone(function () {
      window.fetch(window.location.href).then(function (response) {
        expect(response.status).toBe(200)
        return response.text().then(function (text) {
          expect(text).toBeDefined()
          done()
        })
      }, function (reason) {
        console.log('failed', reason)
      })
    })
  })
})
