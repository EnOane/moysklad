'use strict'

const getTimeString = require('./getTimeString')
const isObject = require('./isObject')
const isSimpleValue = require('./isSimpleValue')

let createValueSelector = selector => (path, value) => {
  if (!isSimpleValue(value)) {
    throw new Error(`value must to be string, number, date or null`)
  }
  return [[path, selector, value]]
}

let createCollectionSelector = selector => {
  const sel = createValueSelector(selector)
  return (path, value) => {
    if (!(value instanceof Array)) {
      throw new Error(`selector value must to be an array`)
    }
    return value.reduce((res, v) => res.concat(sel(path, v)), [])
  }
}

// Comparison selectors
const selectors = {
  eq: { operator: '=' },
  gt: { operator: '>' },
  gte: { operator: '>=' },
  lt: { operator: '<' },
  lte: { operator: '>=' },
  ne: { operator: '!=' },
  in: { operator: '=', collection: true },
  nin: { operator: '!=', collection: true }
}

selectors.eq.not = selectors.ne
selectors.gt.not = selectors.lte
selectors.gte.not = selectors.lt
selectors.lt.not = selectors.gte
selectors.lte.not = selectors.gt
selectors.ne.not = selectors.eq
selectors.in.not = selectors.nin
selectors.nin.not = selectors.in

const comparisonSelectors = Object.keys(selectors).reduce((res, key) => {
  let op = selectors[key]
  res['$' + key] = (op.collection ? createCollectionSelector : createValueSelector)(op)
  return res
}, {})

// Logical selectors
const invertFilterPart = fp => [fp[0], fp[1].not, fp[2]]

function getFilterParts (path, value) {
  const pathLen = path.length
  const curKey = pathLen ? path[pathLen - 1] : null

  switch (true) {
    // Mongo logical selectors
    case curKey === '$and':
      if (!(value instanceof Array)) {
        throw new Error(`$and: selector value must to be an array`)
      }
      return value.reduce((res, val) => res
        .concat(getFilterParts(path.slice(0, -1), val)), [])

    case curKey === '$not':
      if (!isObject(value)) {
        throw new Error(`$not: selector value must to be an object`)
      }
      let headPath = path.slice(0, -1)
      return getFilterParts(headPath, value)
        .map(invertFilterPart)
        .concat([[headPath, selectors.eq, null]])

    case curKey === '$exists':
      if (typeof value !== 'boolean') {
        throw new Error(`$exists: elector value must to be boolean`)
      }
      return [[path.slice(0, -1), selectors.ne, null]]

    // Mongo comparison selectors
    case !!comparisonSelectors[curKey]:
      let parts
      try {
        parts = comparisonSelectors[curKey](path.slice(0, -1), value)
      } catch (error) {
        throw new Error(`${curKey}: ${error.message}`)
      }
      return parts

    // Array
    case value instanceof Array:
      return value.reduce((res, val) => res
        .concat(getFilterParts(path, val)), [])

    // Object
    case !isSimpleValue(value):
      return Object.keys(value).reduce((res, key) => res
        .concat(getFilterParts(path.concat(key), value[key])), [])

    // some other value
    default:
      return [[path, selectors.eq, value]]
  }
}

module.exports = function buildFilter (filter) {
  if (!isObject(filter)) {
    throw new Error('filter must to be an object')
  }

  let filterParts = getFilterParts([], filter)

  // преобразование ключа в строку
  filterParts = filterParts.map(part => [part[0].join('.'), part[1], part[2]])

  return filterParts
    // конвертация операторов и значений в строку
    .map(part => {
      let key = part[0]
      let operator = part[1].operator
      let value = part[2]
      switch (true) {
        case value === undefined:
          throw new Error(`filter "${key}" key value is undefined`)

        case value === null:
          return [key, operator, '']

        case value instanceof Date:
          return [key, operator, getTimeString(value)]

        case typeof value === 'string':
        case typeof value === 'number':
          return [key, operator, value]

        default:
          throw new Error(`filter "${key}" key value is incorrect`)
      }
    })
    .map(part => `${part[0]}${part[1]}${part[2]}`)
    .sort((p1, p2) => {
      if (p1 > p2) { return 1 }
      if (p1 < p2) { return -1 }
      return 0
    })
    .join(';')
}
