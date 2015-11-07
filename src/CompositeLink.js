function CompositeLink (nodeList) {
	this.nodeList = nodeList;
	this.nodeLinks = [];

	var ii = this.nodeList.length, i, node, nodeLink;

	for(i = 0; i < ii; i++) {
		nodeLink = new NodeLink(node = this.nodeList[i]);

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
	}
};