//InteractiveSemanticGraphBrowser
/*@nomin*/
/* 
DEV: MediaWiki:InteractiveSemanticGraphBrowser.js
REL: modules/ext.InteractiveSemanticGraph/InteractiveSemanticGraphBrowser.js
hint: ResourceLoader minifier does not support ES6 yet, therefore skip minification  with "nomin" (see https://phabricator.wikimedia.org/T255556)
*/

class isg {
	constructor() {
	}
}

isg.browser = class {
	constructor(element) {
		this.debug = true;
		this.uid = (performance.now().toString(36) + Math.random().toString(36)).replace(/\./g, "");
		
		this.$element = $(element);
		this.$element.attr('id', `isgb-${this.uid}-container`);
		this.$element.attr('style', 'display:grid; grid-template-columns: 1fr 10px 1fr');
		
		this.containerLeft = $(`<div id="isgb-${this.uid}-container-left">`);
    	this.containerGutter = $(`
    		<div class="isgb-resizer" id="isgb-${this.uid}-resizer" 
    			style="grid-row: 1/-1; cursor: col-resize; grid-column: 2; 
    			background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');">
    		</div>`);
		this.containerRight = $(`<div id="isgb-${this.uid}-container-right">`);
		this.$element.append(this.containerLeft, this.containerGutter, this.containerRight);
		window.Split({
		  columnGutters: [{
		    track: 1,
		    element: this.containerGutter[0],
		  }]
		});
		
		this.$element.find('.InteractiveSemanticGraph').detach().appendTo(`#isgb-${this.uid}-container-left`); //graph div has to be created in advance for now, move to left side
		this.containerRight.append(`<iframe id="isgb-${this.uid}-iframe" src="/wiki/Main_page" frameborder="0" scrolling="yes" style="width: 100%; height: 100%;"></iframe>'`);
		
		mw.hook( 'interactivesemanticgraph.node.clicked' ).add( this.navigate.bind(this) );
	}	
	
	navigate(title) {
		if (this.debug) console.log(`Navigate to ${title}`);
		$(`#isgb-${this.uid}-iframe`).attr('src', `/wiki/${title}`);
	}
	
};

$(document).ready(function () {

	if (!$(".InteractiveSemanticGraphBrowser")) return;
	//mw.loader.load("//some-server/some.css", "text/css");
	$.when(
		$.getScript("https://unpkg.com/split-grid/dist/split-grid.js"),
		$.Deferred(function (deferred) {
			$(deferred.resolve);
		})
	).done( function () {
		console.log("InteractiveSemanticGraphBrowser init");
		$(".InteractiveSemanticGraphBrowser").each( function() {
			var browser = new isg.browser(this);
		});
	});

});
