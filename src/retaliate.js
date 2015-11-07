var directivesRegistry = {};

var retaliate = {
	CompositeLink: CompositeLink,
	NodeLink: NodeLink,
	next_id: 0
};

retaliate.id = function() {
	return ++retaliate.next_id;
};

retaliate.hasDirective = function(name) {
	return directivesRegistry.hasOwnProperty(name);
};

retaliate.executeFactory = function(factory) {
	var args = toArray(arguments).slice(1);

	return factory.call(this, args);
};

/**
 * looks up the directive and returns true if it is a multi-element directive,
 * and therefore requires DOM nodes between -start and -end markers to be grouped
 * together.
 *
 * @param {string} name name of the directive to look up.
 * @returns true if directive was registered as multi-element.
 */
retaliate.directiveIsMultiElement = function(name) {
	if(this.hasDirective(name)) {
		var directives = retaliate.getDirective(name);
		var i, ii = directives.length, directive;

		for(i = 0; i < ii; i++) {
			directive = directives[i];

			if(directive.multiElement) {
				return true;
			}
		}
	}
	return false;
};

retaliate.getDirective = function(name) {
	if(!directivesRegistry.hasOwnProperty(name)) {
		return null;
	}

	var directive = directivesRegistry[name];

	if(!directive.executed) {
		directive.instances = directive.factory = retaliate.executeFactory(directive.factory);
		directive.executed = true;
	}

	return directive.instances;
};

retaliate.compile = function(nodeList) {
	var compile = new Compile(nodeList);

	return compile;
};

retaliate.clearRegistry = function() {
	forEach(directivesRegistry, function(directive, key) {
		delete directivesRegistry[key];
	});

	return this;
};

retaliate.registerDirective = function(name, factory) {
	if(!directivesRegistry.hasOwnProperty(name)) {
		var _directives = [];

		directivesRegistry[name] = {
			directives: _directives,

			executed: false,

			factory: function() {
				var directives = [];

				forEach(_directives, function(factory, index) {
					var directive = retaliate.executeFactory(factory) || noop;

					if(isFunction(directive)) {
						directive = { compile: lazy(directive) };
					} else if (!directive.compile && directive.link) {
						directive.compile = lazy(directive.link);
					}

					defaults(directive, {
						priority: 0,
						index: index,
						name: name,
						restrict: 'EA'
					});

					defaults(directive, {
						require: (directive.controller && directive.name)
					});

					directives.push(directive);
				});

				return directives;
			}
		};
	}

	directivesRegistry[name].directives.push(factory);

	return this;
};

window.retaliate = retaliate;