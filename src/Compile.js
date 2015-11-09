var Attributes = function(node){
	this.$$element = node;
};

Attributes.prototype = {
	$set: function() {
	}
};

function Compile(nodeList, parentNodeLinkContext) {
	if(nodeList instanceof Node === true) {
    this.node = nodeList;

    nodeList = this.node.childNodes;
	}

	if(nodeList instanceof NodeList === false) {
		throw new Error('invalid node');
	}

	this.nodeList = nodeList;
  this.parentNodeLinkContext = parentNodeLinkContext || {};

	this.compositeLink = new CompositeLink(this.nodeList, this.parentNodeLinkContext);
}
Compile.prototype = {
  execute: function(transcludeFn) {
    return this.compositeLink.execute(transcludeFn);
  },
  destroy: function() {
    return this.compositeLink.destroy();
  }
}

// Helper function to correctly set up the prototype chain for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
Compile.extend = NodeLink.extend = CompositeLink.extend = function(protoProps, staticProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Add static properties to the constructor function, if supplied.
  extend(child, parent, staticProps);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent` constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate;

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) extend(child.prototype, protoProps);

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = parent.prototype;

  return child;
};