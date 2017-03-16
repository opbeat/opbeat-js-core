var filters = []

module.exports = {
  addFilter: function addFilter (cb) {
    if (typeof cb != 'function') {
      throw new Error("Argument to 'addFilter' must be function")
    }
    filters.push(cb)
  },
  applyFilters: function (data) { 
    for(var i = 0; i < filters.length; i++) {
      data = filters[i](data)
      if (!data) {
        return
      }
    }
    return data
  }
}