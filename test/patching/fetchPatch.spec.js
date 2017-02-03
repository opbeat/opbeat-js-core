var patchFetch = require('../../src/common/patches/fetchPatch').patchFetch
var ServiceFactory = require('../../src/common/serviceFactory')

describe('fetchPatch', function () {
  var serviceFactory = new ServiceFactory()
  var performance = serviceFactory.getPerformanceServiceContainer()
  performance.initialize()
  patchFetch(performance)

  it('should fetch out of opbeat zone', function (done) {
    window.fetch(window.location.href).then(function (response) {
      expect(response.status).toBe(200)
      done()
    }, function (reason) {
      console.log('failed', reason)
    })
  })

  it('should fetch within the opbeat zone', function (done) {
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
