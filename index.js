'use strict';

var util = require('util');
var events = require('events');
var extend = require('extend');
var Promise = require('bluebird');
var html = require('html-me');
var debug = require('debug')('web-piece');

module.exports = {

	decorate: function ( ctor, config ) {
		debug('%s.decorate', ctor.name);

		util.inherits(ctor, events.EventEmitter);

		ctor.config = config = config || {};

		ctor.template = config.template;
		ctor.nodes = config.nodes;
		ctor.hooks = config.hooks;

		extend(ctor.prototype, protos);

		return ctor;
	},

	init: function ( config ) {
		var ctor = this.constructor;

		debug('%s.init with config %o', this.constructor.name, config);

		this.config = config || {};

		this.model = this.model || config.model || {};
		this.live = this.live === undefined ? !!config.live : this.live;

		this.$ = config.$ || ctor.template && html.parseString(ctor.template, { single: true }) || html.create('div');

		var nodes = ctor.nodes;

		if (nodes) {
			nodes = Object.keys(ctor.nodes);

			for (var node, i = 0;node = nodes[i++];)
				this['$' + node] = html.findOne(ctor.nodes[node], this.$);
		}

		if (this.live) {
			var hooks = ctor.hooks;

			if (hooks)
				for (var hook, u = 0;hook = hooks[u++];)
					html.addEventListener(
						hook[2] ? this['$' + hook[2]] : this.$,
						hook[0],
						(typeof hook[1] === 'function' ? hook[1] : this[hook[1]]).bind(this)
					);

		}
	}

};

var protos = {

	render: function () {
		debug('%s.render (live: %s)', this.constructor.name, this.live);

		var data = this.model;
		var beforeRender = this.beforeRender && this.beforeRender();

		if (!this.live)
			return Promise.props(data)
				.bind(this)
				.tap(beforeRender)
				.then(this.renderSync);

		var keys = Object.keys(data);
		var resolved = {};
		var pending = {
			keys: [],
			values: [],
		};
		this.rendering = {
			original: data,
			resolved: resolved,
			pending: pending,
		};

		for (var key, value, i = 0;key = keys[i++];) {
			value = data[key];

			if (Promise.is(value)) {
				if (value.isFulfilled()) {
					resolved[key] = value.value();
				} else {
					pending.keys.push(key);
					pending.values.push(value);
				}
			} else {
				resolved[key] = value;
			}
		}

		debug('%s.render pending keys: %o', this.constructor.name, this.rendering.pending.keys);

		this.renderSync(this.rendering.resolved, this.rendering);

		return Promise
			.resolve(pending.values)
			.bind(this)
			.map(this.renderProgress)
			.tap(beforeRender);
	},

	renderProgress: function ( resolvedValue, idx ) {
		var rendering = this.rendering;
		var key = rendering.pending.keys[idx];

		debug('%s.renderProgress resolved key: %s', this.constructor.name, key);

		rendering.resolved[key] = resolvedValue;
		this.renderSync(rendering.resolved, rendering);
	},

	renderSync: function ( resolved, rendering ) {
		// no-op, do overwrite
	},

	addClass: function ( className ) {
		html.addClass(this.$, className);
	},

	removeClass: function ( className ) {
		html.removeClass(this.$, className);
	},

};