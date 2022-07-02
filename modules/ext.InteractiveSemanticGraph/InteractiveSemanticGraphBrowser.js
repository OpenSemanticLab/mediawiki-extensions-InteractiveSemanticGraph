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
		this.$element.attr('style', 'display: flex;');
		
		this.$element.append(`<div id="isgb-${this.uid}-container-left" style="flex: 1.0;">`);
		this.$element.append(`<div id="isgb-${this.uid}-container-right" style="flex: 1.0;">`);
		this.$element.find('.InteractiveSemanticGraph').detach().appendTo(`#isgb-${this.uid}-container-left`); //graph div has to be created in advance for now, move to left side
		
		$(`#isgb-${this.uid}-container-right`).append(`<iframe id="isgb-${this.uid}-iframe" src="/wiki/Main_page" frameborder="0" scrolling="yes" style="width: 100%; height: 100%;"></iframe>'`);
		
		mw.hook( 'interactivesemanticgraph.node.clicked' ).add( this.navigate.bind(this) );
	}	
	
	navigate(title) {
		if (this.debug) console.log(`Navigate to ${title}`);
		$(`#isgb-${this.uid}-iframe`).attr('src', `/wiki/${title}`);
	}
	
};

$(document).ready(function () {

	console.log("InteractiveSemanticGraphBrowser init");
	$(".InteractiveSemanticGraphBrowser").each( function() {
		var browser = new isg.browser(this);
	});
});
