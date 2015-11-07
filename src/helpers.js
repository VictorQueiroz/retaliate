var isArray = Array.isArray;

function toArray(target) {
	return Array.prototype.slice.apply(target);
}

function isUndefined(target) {
	return typeof target === 'undefined';
}

function isDefined(target) {
	return isUndefined(target) === false;
}

function clone (object) {
	var keys = Object.keys(object);
	var i, ii = keys.length, key, value;
	var cloned = {};

	for(i = 0; i < ii; i++) {
		key 		= keys[i];
		value 	= object[key];

		if(isObject(value)) {
			value = clone(value);
		}

		cloned[key] = value;
	}

	return cloned;
}

function noop() {
	return;
}

function isObject (value) {
	return typeof value === 'object';
}

function isString (value) {
	return typeof value === 'string';
}

function isFunction (value) {
	return typeof value === 'function';
}

function pick(object, keys) {
	var i,
			ii = keys.length,
			key,
			cloned = {};

	for(i = 0; i < ii; i++) {
		key = keys[i];

		cloned[key] = object[key];
	}

	return cloned;
}

function extend (target) {
	var sources = toArray(arguments).slice(1).filter(isDefined);

	var source,
			value,
			keys,
			key,
			ii = sources.length,
			jj,
			i,
			j;

	for(i = 0; i < ii; i++) {
		source = sources[i];

		keys = Object.keys(source);

		jj = keys.length;

		for(j = 0; j < jj; j++) {
			key 					= keys[j];
			value 				= source[key];

			target[key] 	= value;
		}
	}
}

function defaults (object, source) {
	var keys = Object.keys(source);
	var i, ii = keys.length, key, value;

	for(i = 0; i < ii; i++) {
		key 		= keys[i];
		value		= source[key];

		if(!object.hasOwnProperty(key)) {
			object[key] = value;
		}
	}
}

function forEach (array, iterator, context) {
	var keys = Object.keys(array);
	var ii = keys.length, i, key, value;

	for(i = 0; i < ii; i++) {
		key = keys[i];
		value = array[key];

		iterator.call(context, value, key, array);
	}
}

function camelCase (str) {
  return (str = str.replace(/[^A-z]/g, ' ')) && str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function lowercase(str) {
	return String(str).toLowerCase();
}

function lazy(callback, context) {
	var args = arguments;

	return function() {
		return callback;
	};
}

retaliate.prototype = {
	__elementCache: {},

	__cacheKey: '$$$rt339'
};

var elCache = retaliate.prototype.__elementCache;
var cacheKey = retaliate.prototype.__cacheKey;

function elementData(node, key, value) {
	if(!node.hasOwnProperty(cacheKey)) {
		node[cacheKey] = retaliate.id();

		elCache[node[cacheKey]] = {};
	}

	var cache = elCache[node[cacheKey]];

	if(!key) {
		return cache;
	}

	if(!value && cache.hasOwnProperty(key)) {
		return cache[key];
	} else if(value) {
		cache[key] = value;
	}

	return null;
}

function elementInheritedData(element, name, value) {
  // if element is the document object work with the html element instead
  // this makes $(document).scope() possible
  if (element.nodeType == Node.DOCUMENT_NODE) {
    element = element.documentElement;
  }
  var names = isArray(name) ? name : [name];

  while (element) {
    for (var i = 0, ii = names.length; i < ii; i++) {
      if (value = elementData(element, names[i])) return value;
    }

    // If dealing with a document fragment node with a host element, and no parent, use the host
    // element as the parent. This enables directives within a Shadow DOM or polyfilled Shadow DOM
    // to lookup parent controllers.
    element = element.parentNode || (element.nodeType === Node.DOCUMENT_FRAGMENT_NODE && element.host);
  }
}