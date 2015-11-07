var compile = function(nodeList, context) {
	return retaliate.compile(nodeList).call(context);
};

var createDirective = function (name, factory) {
	return retaliate.registerDirective(name, factory);
};

var clearRegistry = function() {
	return retaliate.clearRegistry();
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

		node = createNode(
			'<div multi-directive-start></div>' + 
			'<span></span>' +
			'<div multi-directive-end></div>' +
			'<div></div>'
		);

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

	it('should compile templated directive', function() {
		node = createNode(
			'<div directive-start></div>' +
			'<div some-directive-here></div>' +
			'<div directive-end></div>'
		);

		var directiveLink = jasmine.createSpy();

		createDirective('directive', function() {
			return {
				multiElement: true,
				link: function(nodes, attrs, ctrls, transclude) {
					if(!isArray(nodes)) {
						nodes = [nodes];
					}

					forEach(nodes, function(node, i) {
						node.setAttribute('node-index', i);
					});
				}
			};
		});

		createDirective('someDirectiveHere', function() {
			return {
				template: '<div directive></div>'
			};
		});

		compile(node);

		expect(node.outerHTML).toEqual(
			'<div>' +
				'<div directive-start="" node-index="0"></div>' +
				'<div some-directive-here="" node-index="1">' +
					'<div directive="" node-index="0"></div>' +
				'</div>' +
				'<div directive-end="" node-index="2"></div>' +
			'</div>'
		);

		clearRegistry();
	});

	describe('Controller', function() {
		var NavbarController;

		beforeEach(function() {
			NavbarController = function() {
				this.status = false;
			};
			NavbarController.prototype = {
				constructor: NavbarController,

				setStatus: function(status) {
					this.status = status;

					return this;
				},

				toggleStatus: function() {
					this.setStatus(!this.status);

					return this;
				}
			};

			createDirective('navbar', function() {
				return {
					controller: NavbarController
				};
			});
		});

		it('should append a controller to a directive', function() {
			node = createNode(
				'<div>' +
					'<navbar>' +
						'<controls></controls>' +
					'</navbar>' +
				'</div>'
			);

			var controllerSpy = jasmine.createSpy();
			createDirective('navbar', function() {
				return {
					require: 'navbar',
					link: function(el, attrs, ctrl) {
						expect(ctrl.status).toBeFalsy();
						ctrl.toggleStatus();
						expect(ctrl.status).toBeTruthy();

						controllerSpy(ctrl);
					}
				};
			});

			compile(node);

			expect(controllerSpy).toHaveBeenCalled();
		});

		it('should inherit parent directive controllers', function() {
			node = createNode(
				'<div>' +
					'<navbar>' +
						'<controls></controls>' +
					'</navbar>' +
				'</div>'
			);

			var controllerSpy = jasmine.createSpy();
			createDirective('controls', function() {
				return {
					require: '?^navbar',
					link: function(el, attrs, navbar) {
						navbar.setStatus(true);
						expect(navbar.status).toBeTruthy();

						navbar.toggleStatus();
						expect(navbar.status).toBeFalsy();

						controllerSpy(navbar);
					}
				};
			});

			compile(node);

			expect(controllerSpy).toHaveBeenCalled();
		});
	});

	describe('Transclusion', function() {
		it('should remove all contents on normal transcluded directives', function() {
			node = createNode(
				'<div>' +
					'<deep-directive>' +
						'<p>mother</p>' +
						'<p>father</p>' +
						'<p>son</p>' +
						'<p>wife</p>' +
					'</deep-directive>' +
				'</div>'
			);

			var transclusionSpy = jasmine.createSpy();
			createDirective('deepDirective', function() {
				return {
					transclude: true
				};
			});

			compile(node);

			expect(node.querySelector('deep-directive').innerHTML).toEqual('');

			clearRegistry();
		});

		it('should compile the removed content when the transclusion function gets executed', function() {
			node = createNode(
				'<deep-directive>' +
					'<p>mother</p>' +
					'<p>father</p>' +
					'<p>son</p>' +
					'<p>wife</p>' +
				'</deep-directive>'
			);

			var transcludeDirectiveSpy = jasmine.createSpy();
			createDirective('deepDirective', function() {
				return {
					restrict: 'E',
					transclude: true,
					link: function(el, attrs, ctrls, transcludeFn) {
						transcludeFn(transcludeDirectiveSpy);
					}
				};
			});

			var pSpy = jasmine.createSpy();
			createDirective('p', function(){
				return pSpy;
			});

			compile(node);

			expect(pSpy).toHaveBeenCalled();
			expect(transcludeDirectiveSpy).toHaveBeenCalled();

			clearRegistry();
		});

		it('should give the transcludeFn to child directives that has some parent directive with a transclude function', function() {
			node = createNode(
				'<transclude-directive>' +
					'<div>' +
						'This is the past of this ' +
						'transcluded directive content' +
					'</div>' +
				'</transclude-directive>'
			);

			createDirective('transcludeDirective', function() {
				return {
					transclude: true,
					template: '<div transclude-me></div>'
				};
			});

			var transcludeSpy = jasmine.createSpy();
			createDirective('transcludeMe', function() {
				return {
					link: function(element, attrs, ctrls, transcludeFn) {
						if(transcludeFn) {
							transcludeFn(function(node) {
								transcludeSpy(node.childNodes.item().innerHTML);
							});
						}
					}
				};
			});

			compile(node);

			expect(transcludeSpy).toHaveBeenCalledWith(
				'This is the past of this ' +
				'transcluded directive content'
			);

			clearRegistry();
		});

		it('should compile complex transcluded directives', function() {
			node = createNode(
				'<div>' +
					'<some-directive>' +
						'<span>' +
							'Why not transclude my content too?' +
						'</span>' +
					'</some-directive>' +
				'</div>' +
				'<div>' +
					'Right here is my content, ' +
					'which will be wrapped somewhere!' +
				'</div>'
			);

			createDirective('div', function() {
				return {
					transclude: true,
					template: '<span wrapped transclude-it-here></span>'
				};
			});
			createDirective('transcludeItHere', function() {
				return function(el, attrs, ctrls, transclude) {
					transclude(function(fragment) {
						el.appendChild(fragment);
					});
				};
			});
			createDirective('someDirective', function() {
				return {
					transclude: true,
					template: '<span more-wrapped transclude-it-here></span>'
				};
			});

			compile(node);

			expect(node.innerHTML).toEqual(
				'<div><span wrapped="" transclude-it-here="">' +
				'<some-directive><span more-wrapped="" transclude-it-here="">' +
				'<span>Why not transclude my content too?</span></span>' +
				'</some-directive></span></div><div>' +
				'<span wrapped="" transclude-it-here="">Right here is my content, ' +
				'which will be wrapped somewhere!</span></div>'
			);

			clearRegistry();
		});
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