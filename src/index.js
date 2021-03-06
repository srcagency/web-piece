'use strict';

var inherits = require('inherits');
var events = require('events');
var assign = require('object-assign');
var Promise = require('bluebird');
var html = require('html-me');
var debug = require('debug')('web-piece');
var pluckKeyValues = require('pluck-key-values');

module.exports = {

	decorate: function ( ctor, config ) {
		debug('%s.decorate', ctor.name);

		inherits(ctor, events.EventEmitter);

		ctor.config = config = config || {};

		ctor.template = config.template;
		ctor.nodes = config.nodes;
		ctor.hooks = config.hooks;
		ctor.binds = config.binds || {};
		ctor.bindFns = Object.keys(ctor.binds);

		assign(ctor.prototype, protos);

		return ctor;
	},

	init: function ( config ) {
		var ctor = this.constructor;

		this.config = config = config || {};
		debug('%s.init with config %o', this.constructor.name, config);

		this.model = this.model || config.model || {};
		this.$ =
			this.$
			|| config.$
			|| (ctor.template && html.parseString(ctor.template, { single: true }))
			|| html.create('div');

		var nodes = ctor.nodes;

		if (nodes) {
			nodes = Object.keys(ctor.nodes);

			for (var node, i = 0;node = nodes[i++];)
				saveNode.call(this, '$' + node, ctor.nodes[node]);
		}

		if (ctor.hooks)
			for (var hook, u = 0;hook = ctor.hooks[u++];)
				attach.apply(this, hook);
	},

	pluckNode: function( v ){ return v.$; },
	invokeRender: function( v ){ return v.render(); },

};

var protos = {

	render: function () {
		debug('%s.render', this.constructor.name);

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

};

require('./inherited')
	.forEach(function( fn ){
		protos[fn] = function( a, b ){
			return html[fn](this.$, a, b);
		};
	});

function attach( event, fn, nodeNameOrSelector, selector ){
	var node = this['$' + (nodeNameOrSelector || '')] || html.findOne(nodeNameOrSelector, this.$);
	var receiver = (typeof fn === 'function' ? fn : this[fn]);

	if (!node)
		throw new Error(this.constructor.name + '.' + name + ': unable to bind event "' + event + '" to missing node "' + nodeNameOrSelector + '"');

	if (!receiver)
		throw new Error(this.constructor.name + '.' + name + ': no receiver "' + receiver + '" for event "' + event + '"');

	html.addEventListener(node, event, receiver.bind(this), selector);
}

function saveNode( name, selector ){
	this[name] = html.findOne(selector, this.$);

	if (!this[name])
		throw new Error(this.constructor.name + '.' + name + ': unmatched selector "' + selector + '"');
}
