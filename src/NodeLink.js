function Transclude(node, directive, attrs, previousContext) {
	this.node = node;
	this.directive = directive;
	this.childNodes = node.childNodes;
	this.previousContext = previousContext;

	var type = directive.transclude;
	type = this.type = (isString(type) && type) || 'content';

	if(type == 'content') {
		var clone = document.createDocumentFragment();
		this.clone = clone;

		var childNode;
		while((this.childNodes && this.childNodes.length)) {
			childNode = this.node.removeChild(this.childNodes.item(0));
			clone.appendChild(childNode);
		}
	} else if (type == 'element') {
		this.comment = document.createComment(' ' + directive.name + ': ' + attrs[directive.name] + ' ');

		if(isArray(this.node)) {
			this.transcludeGroup();
		} else {
			this.transcludeElement();
		}

		this.node = node = this.comment;
	}
}

Transclude.prototype = {
	transcludeGroup: function() {
		var fragment = document.createDocumentFragment();
		var nodes = this.node = this.nodes = this.node;
		var i, ii = nodes.length;

		for(i = 0; i < ii; i++) {
			if(i == 0) {
				nodes[i].parentNode.replaceChild(this.comment, nodes[i]);
			} else {
				nodes[i].parentNode.removeChild(nodes[i]);
			}

			fragment.appendChild(nodes[i]);
		}

		this.clone = fragment;
	},

	transcludeElement: function(node) {
		node = node || this.node;

		this.node.parentNode.replaceChild(this.comment, this.node);
		this.clone = this.node.cloneNode(1);
	},

	execute: function(callback) {
		var clone = this.clone.cloneNode(1);

		this.link = new Compile(clone, this.previousContext);

		callback(clone);

		this.link.execute();
	}
};

/**
 * Sorting function for bound directives.
 */
function byPriority(a, b) {
  var diff = b.priority - a.priority;
  if (diff !== 0) return diff;
  if (a.name !== b.name) return (a.name < b.name) ? -1 : 1;
  return a.index - b.index;
}

function NodeLink (node, parentNodeLinkContext) {
	this.node = node;

	this.attributes = new Attributes(node);
	this.directives = [];

	this.context = {};
	this.parentNodeLinkContext = parentNodeLinkContext;
	this.elementControllers = {};
	this.controllerDirectives = {};

	this.postLinks = [];
	this.preLinks = [];

	this.collect();
	this._apply();

	this.eventEmitter = new EventEmitter();
	
	if(!this.templateUrl && !this.terminal) {
		this.childCompile = new Compile(node);	
	}
}

NodeLink.prototype = {
	/**
   * Given a node with an directive-start it collects all of the siblings until it finds
   * directive-end.
   * @param node
   * @param attrStart
   * @param attrEnd
   * @returns {*}
   */
	groupScan: function(attrStart, attrEnd, node) {
		node = (node || this.node);

		var nodes = [],
				depth = 0;

		if(attrStart && node.hasAttribute && node.hasAttribute(attrStart)) {
			do {
				if(!node) {
					throw new Error('Unterminated attribute, found \'' + attrStart +
													'\' but no matching \'' + attrEnd + '\' found.');
				}

				if(node.nodeType == Node.ELEMENT_NODE) {
					if(node.hasAttribute(attrStart)) depth++;
					if(node.hasAttribute(attrEnd)) depth--;
				}

				nodes.push(node);
				node = node.nextSibling;
			} while(depth > 0);
		} else {
			nodes.push(node);
		}

		return nodes;
	},

	destroy: function() {
		this.eventEmitter.emit('destroy');
		this.childCompile.destroy();

		return this;
	},

	_apply: function() {
		var i, directive;
		var ii = this.directives.length;

		var node = this.node;
		var attrs = this.attributes;

		var attrStart, attrEnd;

		var directiveValue, transclude;
		var terminalPriority = -Number.MAX_VALUE;

		// executes all directives on the current element
		for(i = 0; i < this.directives.length; i++) {
			directive = this.directives[i];

			attrStart = directive.$$start;
			attrEnd = directive.$$end;

			// collect multiblock sections
			if(attrStart) {
				node = this.node = this.groupScan(attrStart, attrEnd);
			}

			// the directives that has been skipped will
			// be loaded by a transclude function
			if (terminalPriority > directive.priority) {
        break; // prevent further processing of directives
      }

			if(directiveValue = directive.transclude) {
				var context = {};

				// Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
        // This option should only be used by directives that know how to safely handle element transclusion,
        // where the transcluded nodes are added or replaced after linking.
        if(!directive.$$tlb) {
        	var previousDirective = this.parentNodeLinkContext.nonTlbTranscludeDirective;

        	if(this.parentNodeLinkContext.nonTlbTranscludeDirective) {
        		throw new Error('Multiple directives, previous transclude: [' + previousDirective.name + ']');
        	}

        	this.context.nonTlbTranscludeDirective = directive;
        }

        if(directiveValue == 'element') {
					terminalPriority = directive.priority;

        	context.maxPriority = terminalPriority;
        }

				transclude = this.transclude = new Transclude(node, directive, attrs, context);

				if(directiveValue == 'element') {
					this.node = node = this.transclude.comment;
				}

				this.transcludeFn = function() {
					return transclude.execute.apply(transclude, arguments);
				};
			}

			if(directive.templateUrl) {
				this.templateUrl = directive.templateUrl;
			}

			if(directive.template) {
				if(isFunction(directive.template)) {
					directive.template = directive.template(node);
				}

				node.innerHTML = directive.template;
			}

			if(directive.controller) {
				this.controllerDirectives[directive.name] = directive;
			}

			if(directive.compile) {
				this.addLink(directive, directive.compile(node, attrs), directive.terminal);
			}

			if(directive.terminal) {
				terminalPriority = Math.max(terminalPriority, directive.priority);
				this.terminal = true;
			}

			this.terminalPriority = terminalPriority;
		}
	},

	addTextInterpolateDirective: function(text) {
	},

	collect: function() {
		var node 				= this.node;
		var nodeType 		= node.nodeType;
		var attributes	= node.attributes;

		var ii,
				i,
				attr,
				directiveName,
				directiveAttrName,
				name;

		var attrStartName = false;
		var attrEndName = false;

		switch(nodeType) {
		case Node.TEXT_NODE:
			this.addTextInterpolateDirective(node.nodeValue);
			break;
		case Node.ELEMENT_NODE:
			directiveName = this.normalize(lowercase(node.nodeName));
			this.addDirective(directiveName, 'E', null, null, this.parentNodeLinkContext);

			for(i = 0; i < attributes.length; i++) {
				attr = attributes[i];
				name = attr.name;

				// the raw normalize attr name
				directiveAttrName = directiveName = this.normalize(name);

				var _directiveName = directiveAttrName.replace(/(Start|End)$/, '');
				if(retaliate.directiveIsMultiElement(_directiveName)) {
					if(directiveAttrName === _directiveName + 'Start') {
						attrStartName = name;
						attrEndName = name.substr(0, name.length - 5) + 'end';
						name = name.substr(0, name.length - 6);
						directiveName = _directiveName;
					}
				}

				this.attributes[directiveName] = attr.value;

				this.addDirective(directiveName, 'A', attrStartName, attrEndName, this.parentNodeLinkContext);
			}
			break;
		}

		this.directives.sort(byPriority);
	},

	normalize: function(name) {
		return camelCase(name);
	},

	getDirectiveInstances: function(name) {
		return retaliate.getDirective(name);
	},

	hasDirective: function(name) {
		return retaliate.hasDirective(name);
	},

	addDirective: function(name, restrict, startAttrName, endAttrName, parentNodeLinkContext) {
		var match = null;

		if(!this.hasDirective(name)) {
			return match;
		}

		var maxPriority = parentNodeLinkContext.maxPriority;

		var directive;
		var directives = this.getDirectiveInstances(name);
		var ii = directives.length;

		for(i = 0; i < ii; i++) {
			directive = directives[i];

			if(directive.restrict.indexOf(restrict) === -1 ||
				(!isUndefined(maxPriority) &&	!(maxPriority > directive.priority))) {
				console.log('Skipping', directive.name, directive.priority, maxPriority);
				continue;
			}

			if(startAttrName) {
				extend(directive, { $$start: startAttrName, $$end: endAttrName });
			}

			this.directives.push(directive);

			match = directive;
		}

		return match;
	},

	/**
   * Wrapper for linking function which converts normal linking function into a grouped
   * linking function.
   * @param linkFn
   * @param attrStart
   * @param attrEnd
   * @returns {Function}
   */
	groupElementsLinkFnWrapper: function(linkFn, attrStart, attrEnd) {
		var self = this;

		return function(node, attrs, controllers, transcludeFn) {
			node = self.groupScan(attrStart, attrEnd, node[0]);

			return linkFn(node, attrs, controllers, transcludeFn);
		};
	},

	addLink: function(directive, link, terminal) {
		var postLinks = [];
		var preLinks = [];

		if(isFunction(link)) {
			postLinks.push(link);
		} else if (isObject(link)) {
			if(link.hasOwnProperty('pre')) {
				preLinks.push(link.pre);
			}
			if(link.hasOwnProperty('post')) {
				postLinks.push(link.post);
			}
		}

		var linkData = {};

		extend(linkData, pick(directive, [
			'require',

			'$$start',
			'$$end'
		]), {
			directiveName: directive.name,
			terminal: terminal
		});

		var i, ii = preLinks.length, linkFn;

		for(i = 0; i < ii; i++) {
			linkFn = preLinks[i];

			if(link.$$start) {
				linkFn = this.groupElementsLinkFnWrapper(linkFn, linkData.$$start, linkData.$$end);
			}

			extend(linkFn, linkData);

			this.preLinks.push(linkFn);
		}

		ii = postLinks.length;
		for(i = 0; i < ii; i++) {
			linkFn = postLinks[i];

			if(link.$$start) {
				linkFn = this.groupElementsLinkFnWrapper(linkFn, linkData.$$start, linkData.$$end);
			}

			extend(linkFn, linkData);

			this.postLinks.push(linkFn);
		}
	},

	REQUIRE_PREFIX_REGEXP: /^(?:(\^\^?)?(\?)?(\^\^?)?)?/,

	getControllers: function(directiveName, require, node, ctrls) {
    var value;

    var $element = node || this.node;
    var elementControllers = ctrls || this.elementControllers;

    if (isString(require)) {
      var match = require.match(this.REQUIRE_PREFIX_REGEXP);
      var name = require.substring(match[0].length);
      var inheritType = match[1] || match[3];
      var optional = match[2] === '?';

      //If only parents then start at the parent element
      if (inheritType === '^^') {
        $element = $element.parentNode;
      //Otherwise attempt getting the controller from elementControllers in case
      //the element is transcluded (and has no data) and to avoid .data if possible
      } else {
        value = elementControllers && elementControllers[name];
        value = value && value.instance;
      }

      if (!value) {
        var dataName = '$' + name + 'Controller';
        value = inheritType ? elementInheritedData($element, dataName) : elementData($element, dataName);
      }

      if (!value && !optional) {
        throw new Error('ctreq ' +
            "Controller '" + directiveName + "', required by directive '" + name + "', can't be found!");
      }
    } else if (isArray(require)) {
      value = [];
      for (var i = 0, ii = require.length; i < ii; i++) {
        value[i] = this.getControllers(directiveName, require[i], $element, elementControllers);
      }
    }

    return value || null;
	},

	elementInheritedData: function(key, value) {
		return elementInheritedData(this.node, key, value);
	},

	elementData: function(key, value) {
		return elementData(this.node, key, value);
	},

	controllers: function(attrs) {
		var elementControllers = this.elementControllers;
		var controllerDirectives = this.controllerDirectives;
		var hasElementTranscludeDirective = false;

    for (var controllerKey in controllerDirectives) {
      var directive = controllerDirectives[controllerKey];

      var controller = directive.controller;
      if (controller == '@') {
        controller = attrs[directive.name];
      }

      var controllerInstance = this.instantiateController(directive.controller);

      // For directives with element transclusion the element is a comment,
      // but jQuery .data doesn't support attaching data to comment nodes as it's hard to
      // clean up (http://bugs.jquery.com/ticket/8335).
      // Instead, we save the controllers for the element in a local hash and attach to .data
      // later, once we have the actual element.
      elementControllers[directive.name] = controllerInstance;

      if (!hasElementTranscludeDirective) {
        this.elementData('$' + directive.name + 'Controller', controllerInstance);
      }
    }
	},

	instantiateController: function(controller) {
		return new controller();
	},

	execute: function (transcludeFn) {
		if(this.templateUrl) {
			var self = this;
			var node = this.node;

			return request(this.templateUrl, function(template) {
				node.innerHTML = template;

				self.templateUrl = null;

				return self.execute(transcludeFn);
			});
		}

		var node 	= this.node;
		var attrs = this.attributes;

		this.controllers(attrs);

		if(!this.hasOwnProperty('transcludeFn') && transcludeFn) {
			this.transcludeFn = transcludeFn;
		}

		var i, ii, link, ctrls;

		for(i = 0, ii = this.preLinks.length; i < ii; i++) {
			link = this.preLinks[i];
			ctrls = link.require && this.getControllers(link.directiveName, link.require);

			this.invokeLink(link, ctrls);
		}
		
		if(!this.childCompile) {
			this.childCompile = new Compile(this.node.childNodes);
		}

		this.childNodes = this.childCompile.execute(this.transcludeFn);

		for(i = this.postLinks.length - 1; i >= 0; i--) {
			link = this.postLinks[i];
			ctrls = link.require && this.getControllers(link.directiveName, link.require);

			this.invokeLink(link, ctrls);
		}

   	delete this.parentNodeLinkContext.maxPriority;
	},

	invokeLink: function(link, ctrls) {
		return link.call(this.eventEmitter, this.node, this.attributes, ctrls, this.transcludeFn);
	}
};