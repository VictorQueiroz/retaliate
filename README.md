# retaliate

## Install
```
bower install --save retaliate
```

## Usage
```js
retaliate.registerDirective('input', function() {
	return {
		controller: function InputController () {
			this.clickedTimes = 0;
		},
		link: function(node, attrs, inputCtrl) {
			node.addEventListener('click', function () {
				inputCtrl.clickedTimes++;
			});
		}
	};
});

retaliate.compile(document.body).execute();
```
