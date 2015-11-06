var compile = function(nodeList, context) {
	return retaliate.compile(nodeList).call(context);
};

var createDirective = function (name, factory) {
	return retaliate.registerDirective(name, factory);
};

var clearRegistry = function() {
	return retaliate.clearRegistry;
};

var createNode = function(html) {
	if(!html) html = '';

	var div = document.createElement('div');
	div.innerHTML = html;

	return div;
};

describe('retaliate.compile()', function() {
	var node;

	it('should compile a node list', function() {
		var spy = jasmine.createSpy();

		node = createNode('<div></div>');

		createDirective('div', function() {
			return spy;
		});

		compile(node);

		expect(spy).toHaveBeenCalled();

		clearRegistry();
	});

	it('should compile a multi element directive', function() {
		var link = jasmine.createSpy();

		node = createNode('<div multi-directive-start></div>' + 
											'<span></span>' +
											'<div multi-directive-end></div>' +
											'<div></div>');

		createDirective('multiDirective', function() {
			return {
				link: function(node) {
					link(node);
				},
				multiElement: true
			};
		});

		compile(node);

		var childNodes = toArray(node.childNodes).slice(0, 3);
		expect(link).toHaveBeenCalledWith(childNodes);

		clearRegistry();
	});
});

describe('retaliate.clearRegistry()', function() {
	it('should clear directive registry', function() {
		createDirective('registerDirective', noop);
		createDirective('registerDirective', noop);
		createDirective('registerDirective', noop);
		createDirective('registerDirective', noop);
		createDirective('registerDirective', noop);

		expect(retaliate.getDirective('registerDirective').length).toEqual(5);
		expect(retaliate.getDirective('registerDirective').length).toEqual(5);

		retaliate.clearRegistry();

		expect(retaliate.getDirective('registerDirective')).toBeNull();
	});
});

describe('retalite.registerDirective()', function() {
	it('should register a directive', function() {
		expect(retaliate.getDirective('rtFirstDirective')).toBeNull();

		var spy = jasmine.createSpy();
		createDirective('rtFirstDirective', spy);

		var instances = retaliate.getDirective('rtFirstDirective');
		expect(instances.length).toEqual(1);

		expect(spy).toHaveBeenCalled();

		retaliate.clearRegistry();
	});
});

describe('extend()', function() {
	var target, source1, source2;

	it('should extend Compile class', function() {
		var specialFunction = function () {
			return 1;
		};

		var SpecialCompile = Compile.extend({
			specialFunction: specialFunction
		});

		expect(Compile.prototype.specialFunction).toBeUndefined();
		expect(SpecialCompile.prototype.specialFunction).toBe(specialFunction);
	});

	it('should extend an object from another', function() {
		target 			= { someKey1: 0 };
		source1			= { someKey1: 1 };
		source2			= { someKey2: 1 };

		extend(target, source1, source2);

		expect(target).toEqual({
			someKey1: 1,
			someKey2: 1
		});
	});
});

describe('clone()', function() {
	it('should clone objects', function() {
		var obj = {
			anotherObj: {
				andMore: {
					andMoreDeep: 1
				}
			}
		};

		expect(clone(obj)).not.toBe(obj);
	});
});

describe('defaults()', function() {
	it('should extend the object with properties that it does not have', function() {
		target			= { iHaveThisOne: 1 };

		defaults(target, {
			iHaveThisOne: 'someValueHere',
			property2: 1,
			property3: 2
		});

		expect(target).toEqual({
			iHaveThisOne: 1,
			property2: 1,
			property3: 2
		});
	});
});