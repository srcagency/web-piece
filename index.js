'use strict';

var extend = require('extend');
var Promise = require('bluebird');
var html = require('html-me');
var debug = require('debug')('web-piece');

module.exports = {

	decorate: function ( ctor, config ) {
		debug('%s.decorate', ctor.name);

		ctor.config = config || {};

		ctor.template = config.template;
		ctor.nodes = config.nodes;
		ctor.hooks = config.hooks;

		extend(ctor.prototype, protos);
	},

	init: function ( config ) {
		debug('%s.init with config %j', this.constructor.name, config);

		this.config = config || {};

		this.model = this.model || config.model || {};
		this.live = this.live === undefined ? !!config.live : this.live;

		if (config.$) {
			this.$ = config.$;
		} else if (this.constructor.template) {
			var parsed = html.parseString(this.constructor.template, { multiple: true });

			if (parsed.length > 1)
				this.$ = html.appendChildren(html.create('fragment'), parsed);
			else
				this.$ = parsed[0];
		} else {
			this.$ = html.create('fragment');
		}

		var nodes = this.constructor.nodes;

		if (nodes) {
			nodes = Object.keys(this.constructor.nodes);

			for (var node, i = 0;node = nodes[i++];)
				this['$' + node] = html.findOne(this.constructor.nodes[node], this.$);
		}

		if (this.live) {
			var hooks = this.constructor.hooks;

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

	addClass: function ( className ) {
		html.addClass(this.$, className);
	},

	removeClass: function ( className ) {
		html.addClass(this.$, className);
	},

	render: function () {
		debug('%s.render (live: %s)', this.constructor.name, this.live);

		var data = this.beforeRender && this.beforeRender() || this.model;

		if (!this.live)
			return Promise.props(data)
				.bind(this)
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

		debug('%s.render pending keys: %j', this.constructor.name, rendering.pending.keys);

		this.renderSync(rendering.resolved, rendering.original);

		return Promise.map(pending.values, this.renderProgress);
	},

	renderProgress: function ( resolvedValue, idx ) {
		debug('%s.renderProgress resolved idx: %d', this.constructor.name, idx);
		var rendering = this.rendering;
		rendering.resolved[rendering.pending.keys[idx]] = resolvedValue;
		this.renderSync(rendering.resolved, rendering.original);
	},

	renderSync: function ( resolved, original ) {
		// no-op, do overwrite
	},

};