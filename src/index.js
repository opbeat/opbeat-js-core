// export public core APIs.

module.exports['ServiceFactory'] = require('./common/serviceFactory')
module.exports['ServiceContainer'] = require('./performance/serviceContainer')
module.exports['ConfigService'] = require('./lib/config')
module.exports['TransactionService'] = require('./performance/transactionService')
module.exports['Subscription'] = require('./common/subscription')

module.exports['patchUtils'] = require('./common/patchUtils')
module.exports['patchCommon'] = require('./common/patchCommon')
module.exports['utils'] = require('./lib/utils')

module.exports['addFilter'] = require('./lib/filtering').addFilter
