'use strict';

var test = require('tape');
var events = require('events');

var wp = require('../');

test('events', function( t ){
	t.plan(6);

	function View( config ){
		wp.init.call(this, config);
	}

	wp.decorate(View);

	var view = new View();

	t.equal(typeof view.addListener, 'function', 'a view supports listeners with the addListener method');
	t.equal(typeof view.on, 'function', 'a view supports listeners with the on method');
	t.equal(typeof view.once, 'function', 'a view supports listeners with the once method');
	t.equal(typeof view.removeListener, 'function', 'a view supports removing listeners');
	t.equal(typeof view.emit, 'function', 'a view supports emitting events');

	view
		.on('test', function( r ){
			t.equal(r, 'message', 'a view supports emitting events');
		})
		.emit('test', 'message');
});
