'use strict';

var util = require('util');
var events = require('events');
var extend = require('extend');
var Promise = require('bluebird');
var html = require('html-me');
var debug = require('debug')('web-piece');
var pluckKeyValues = require('pluck-key-values');

module.exports = {

	decorate: function ( ctor, config ) {
		debug('%s.decorate', ctor.name);

		util.inherits(ctor, events.EventEmitter);

		ctor.config = config = config || {};

		ctor.template = config.template;
		ctor.nodes = config.nodes;
		ctor.hooks = config.hooks;
		ctor.binds = config.binds || [];
		ctor.bindFns = Object.keys(ctor.binds);

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

			for (var node, i = 0;node = nodes[i++];) {
				this['$' + node] = html.findOne(ctor.nodes[node], this.$);

				if (!this['$' + node])
					throw new Error(this.constructor.name + '.$' + node + ': unmatched selector "' + ctor.nodes[node] + '"');
			}
		}

		if (this.live && ctor.hooks)
			for (var hook, u = 0;hook = ctor.hooks[u++];)
				attach.apply(this, hook);
	},

	pluckNode: function( v ){ return v.$; },
	invokeRender: function( v ){ return v.render(); },

};

var protos = {

	render: function () {
		debug('%s.render (live: %s)', this.constructor.name, this.live);

		var rendering = Promise.bind(this);
		var beforeRender = this.beforeRender && this.beforeRender();

		var binds = this.constructor.binds;
		var bindFns = this.constructor.bindFns;

		for (var i = bindFns.length - 1;i >= 0;i--)
			rendering = rendering
				.return(pluckKeyValues(this.model, binds[bindFns[i]]))
				.spread(this[bindFns[i]]);

		if (this.renderSync)
			rendering = rendering.tap(Promise.props(this.model).bind(this).tap(this.renderSync));

		return rendering.tap(beforeRender).tap(this.afterRender);
	},

	addClass: function ( className ) {
		html.addClass(this.$, className);
	},

	removeClass: function ( className ) {
		html.removeClass(this.$, className);
	},

};

function attach( event, fn, nodeName, selector ){
	var node = this['$' + (nodeName || '')];
	var receiver = (typeof fn === 'function' ? fn : this[fn]);

	if (selector)
		var listener = function( e ){
			var closest = html.closest(e.target, selector, node);

			if (closest)
				receiver.call(this, e, closest);
		};
	else
		var listener = receiver;

	html.addEventListener(node, event, listener.bind(this));
}
