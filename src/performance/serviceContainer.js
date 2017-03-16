var TransactionService = require('./transactionService')
var ZoneService = require('./zoneService')
var utils = require('../lib/utils')

function ServiceContainer (serviceFactory) {
  this.serviceFactory = serviceFactory
  this.services = {}
  this.services.configService = this.serviceFactory.getConfigService()
  this.services.logger = this.serviceFactory.getLogger()
  this.services.zoneService = this.createZoneService()
}

ServiceContainer.prototype.initialize = function () {
  var configService = this.services.configService
  var logger = this.services.logger
  this.services.zoneService.initialize(window.Zone.current)

  var opbeatBackend = this.services.opbeatBackend = this.serviceFactory.getOpbeatBackend()
  var transactionService = this.services.transactionService = new TransactionService(this.services.zoneService, this.services.logger, configService, opbeatBackend)
  transactionService.scheduleTransactionSend()

  if (utils.isUndefined(window.opbeatApi)) {
    window.opbeatApi = {}
  }
  window.opbeatApi.subscribeToTransactions = transactionService.subscribe.bind(transactionService)

  if (!utils.isUndefined(window.opbeatApi.onload)) {
    var onOpbeatLoaded = window.opbeatApi.onload
    onOpbeatLoaded.forEach(function (fn) {
      try {
        fn()
      } catch (error) {
        logger.error(error)
      }
    })
  }
}

ServiceContainer.prototype.createZoneService = function () {
  var logger = this.services.logger

  return new ZoneService(logger, this.services.configService)
}

module.exports = ServiceContainer
