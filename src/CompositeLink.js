function CompositeLink (nodeList, parentNodeLinkContext) {
	this.nodeList = nodeList;
	this.nodeLinks = [];
	this.parentNodeLinkContext = parentNodeLinkContext;

	var i, node, nodeLink;
	var context = this.parentNodeLinkContext;

	for(i = 0; i < this.nodeList.length; i++) {
		nodeLink 	= new NodeLink(this.nodeList[i], i === 0 ? context : omit(context, ['maxPriority']));

		this.nodeLinks.push(nodeLink);
	}
}

CompositeLink.prototype = {
	execute: function(transcludeFn) {
		var i, nodeLink;
		var ii = this.nodeLinks.length;

		for(i = 0; i < ii; i++) {
			nodeLink = this.nodeLinks[i];
			nodeLink.execute(transcludeFn);
		}

		return this.nodeList;
	},

	destroy: function() {
		var i;
		var ii = this.nodeLinks.length;

		for(i = 0; i < ii; i++) {
			this.nodeLinks[i].destroy();
		}

		return this;
	}
};