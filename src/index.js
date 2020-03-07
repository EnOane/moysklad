/*
 * moysklad
 * Клиент для JSON API МойСклад
 *
 * Copyright (c) 2017, Vitaliy V. Makeev
 * Licensed under MIT.
 */

'use strict'

const stampit = require('stampit')

const have = require('./have')
const { MoyskladError } = require('./errors')
const getApiDefaultVersion = require('./getApiDefaultVersion')

// methods
const getTimeString = require('./tools/getTimeString')
const parseTimeString = require('./tools/parseTimeString')
const getAuthHeader = require('./methods/getAuthHeader')
const buildUrl = require('./methods/buildUrl')
const parseUrl = require('./methods/parseUrl')
const fetchUrl = require('./methods/fetchUrl')
const GET = require('./methods/GET')
const POST = require('./methods/POST')
const PUT = require('./methods/PUT')
const DELETE = require('./methods/DELETE')

// TODO Remove old methods
module.exports = stampit({
  methods: {
    getAuthHeader,
    buildUrl,
    buildUri (...args) {
      console.log('Warning: метод buildUri переименован в buildUrl.')
      return this.buildUrl(...args)
    },
    parseUrl,
    parseUri (...args) {
      console.log('Warning: метод parseUri переименован в parseUrl.')
      return this.parseUrl(...args)
    },
    fetchUrl,
    fetchUri (...args) {
      console.log('Warning: метод fetchUri переименован в fetchUrl.')
      return this.fetchUrl(...args)
    },
    GET,
    POST,
    PUT,
    DELETE
  },
  statics: {
    getTimeString,
    parseTimeString
  }
}).init(function (options) {
  have(options, {
    endpoint: 'opt str',
    api: 'opt str',
    apiVersion: 'opt str'

    // TODO fix have object arguments parsing
    // login: 'opt str',
    // password: 'opt str',
    // fetch: 'opt function'
    // queue: 'opt bool',
    // emitter: 'opt obj'
  })

  if (options.fetch) {
    this.fetch = options.fetch
  } else if (typeof window !== 'undefined' && window.fetch) {
    this.fetch = window.fetch.bind(window)
  } else if (typeof fetch !== 'undefined') {
    /* eslint no-undef:0 */
    this.fetch = fetch
  } else {
    this.fetch = function () {
      throw new Error(
        'Нельзя выполнить http запрос, т.к. при инициализации' +
          ' экземпляра библиотеки не указан Fetch API модуль' +
          ' (cм. подробнее https://github.com/wmakeev/moysklad#Установка).'
      )
    }
  }

  if (options.emitter) {
    this.emitter = options.emitter
  }

  const _options = Object.assign(
    {
      endpoint: 'https://online.moysklad.ru/api',
      api: 'remap'
    },
    options
  )

  if (!_options.apiVersion) {
    const apiVersion = getApiDefaultVersion(_options.api)
    if (apiVersion) {
      _options.apiVersion = apiVersion
    } else {
      throw new MoyskladError(`Не указана версия ${_options.api} API`)
    }
  }

  this.getOptions = function () {
    return _options
  }
})
