'use strict';

var html = require('html-me');
var test = require('tape');

var wp = require('../');

test('hooks', function( t ){
	t.test('on host node', function( t ){
		t.plan(5);

		function View( config ){
			wp.init.call(this, config);
		}

		wp.decorate(View, {
			hooks: [
				[ 'click', onClick ]
			],
		});

		function onClick( e ){
			t.ok(this instanceof View, 'the context is a view instance');
			t.equal(this, view, 'the context is the correct view instance');
			t.ok(e, 'an event object is parsed');
			t.equal(typeof e.preventDefault, 'function', 'the event object has a preventDefault method');
			t.equal(e.target, view.$, 'the event target matches the view\'s node');
		}

		var view = new View();

		click(view.$);
	});

	t.test('on a child node by name', function( t ){
		t.plan(2);

		function View( config ){
			wp.init.call(this, config);
		}

		wp.decorate(View, {
			template: '<div><p>.</p><p>..</p></div>',
			nodes: {
				secondi: 'p:last-child',
			},
			hooks: [
				[ 'click', onClick, 'secondi' ],
			],
		});

		function onClick( e ){
			t.equal(this, view, 'the context is the correct view instance');
			t.equal(e.target, this.$secondi, 'the event target matches the correct child node');
		}

		var view = new View();
		var viewB = new View();

		// should not trigger anything
		click(view.$);

		click(view.$secondi);
	});

	t.test('on a child node by selector', function( t ){
		t.plan(2);

		function View( config ){
			wp.init.call(this, config);
		}

		wp.decorate(View, {
			template: '<div><p>.</p><ul><li>...</li></ul><p>..</p></div>',
			hooks: [
				[ 'click', onClick, 'li' ],
			],
		});

		function onClick( e ){
			t.equal(this, view, 'the context is the correct view instance');
			t.equal(e.target, html.findOne('li', this.$), 'the event target matches the correct child node');
		}

		var view = new View();
		var viewB = new View();

		// should not trigger anything
		click(view.$);

		click(html.findOne('li', view.$));
	});

	t.test('on a child node by selector', function( t ){
		t.plan(2);

		function View( config ){
			wp.init.call(this, config);
		}

		wp.decorate(View, {
			template: '<div><p>.</p><ul><li>...</li></ul><p>..</p></div>',
			hooks: [
				[ 'click', onClick, 'li' ],
			],
		});

		function onClick( e ){
			t.equal(this, view, 'the context is the correct view instance');
			t.equal(e.target, html.findOne('li', this.$), 'the event target matches the correct child node');
		}

		var view = new View();
		var viewB = new View();

		// should not trigger anything
		click(view.$);

		click(html.findOne('li', view.$));
	});

	t.test('with listener as a method', function( t ){
		t.plan(2);

		function View( config ){
			wp.init.call(this, config);
		}

		wp.decorate(View, {
			hooks: [
				[ 'click', 'onClick' ],
			],
		});

		View.prototype.onClick = function( e ){
			t.equal(this, view, 'the context is the correct view instance');
			t.equal(e.target, this.$, 'the event target matches the correct child node');
		};

		var view = new View();
		var viewB = new View();

		click(view.$);
	});

	t.test('using delegation', function( t ){
		t.plan(2);

		function View( config ){
			wp.init.call(this, config);
		}

		wp.decorate(View, {
			template: '<div><ul><li>a</li><li>b</li></ul></div>',
			nodes: {
				list: 'ul',
			},
			hooks: [
				[ 'click', onClick, null, 'ul' ],
			],
		});

		function onClick( e, list ){
			t.equal(list, this.$list, 'the closest matches the correct node');
		};

		var view = new View();

		var $lis = html.findAll('li', view.$);

		click($lis[0]);
		click($lis[1]);
	});
});

function click( $node ){
	html.dispatchEvent($node, new MouseEvent('click', {
		view: window,
		bubbles: true,
		cancelable: true,
	}));
}
