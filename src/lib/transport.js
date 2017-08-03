function Transport (configService, logger) {
  this.configService = configService
  this.logger = logger
}

Transport.prototype.sendError = function sendError (data, headers) {
  return this._sendToOpbeat('errors', data, headers)
}

Transport.prototype.sendTransaction = function sendTransaction (data, headers) {
  return this._sendToOpbeat('transactions', data, headers)
}

Transport.prototype._sendToOpbeat = function _sendToOpbeat (endpoint, data, headers) {
  var self = this
  this.logger.debug('opbeat.transport.sendToOpbeat', data)

  var url = this.configService.getEndpointUrl(endpoint)

  return _makeRequest(url, 'POST', 'JSON', data, headers)
    .then(function (response) {
      self.logger.debug('opbeat.transport.makeRequest.success')
      return response
    }, function (reason) {
      self.logger.debug('opbeat.transport.makeRequest.error', reason)
      return Promise.reject(reason)
    })
}

function _makeRequest (url, method, type, data, headers) {
  return new Promise(function (resolve, reject) {
    var xhr = new window.XMLHttpRequest()

    xhr.open(method, url, true)
    xhr.timeout = 10000

    if (type === 'JSON') {
      xhr.setRequestHeader('Content-Type', 'application/json')
    }

    if (headers) {
      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header.toLowerCase(), headers[header])
        }
      }
    }

    xhr.onreadystatechange = function (evt) {
      if (xhr.readyState === 4) {
        var status = xhr.status
        if (status === 0 || status > 399 && status < 600) {
          // An http 4xx or 5xx error. Signal an error.
          var err = new Error(url + ' HTTP status: ' + status)
          err.xhr = xhr
          reject(err)
        } else {
          resolve(xhr.responseText)
        }
      }
    }

    xhr.onerror = function (err) {
      reject(err)
    }

    if (type === 'JSON') {
      data = JSON.stringify(data)
    }

    xhr.send(data)
  })
}

module.exports = Transport
