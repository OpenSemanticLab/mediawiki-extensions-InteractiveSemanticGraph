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
		
		this.$containerLeft = $(`<div id="isgb-${this.uid}-container-left"></div>`);
    	this.$containerGutter = $(`
    		<div class="isgb-resizer" id="isgb-${this.uid}-resizer" 
    			style="grid-row: 1/-1; cursor: col-resize; grid-column: 2; 
    			background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');">
    		</div>`);
		this.$containerRight = $(`<div id="isgb-${this.uid}-container-right"></div>`);
		this.$element.append(this.$containerLeft, this.$containerGutter, this.$containerRight);
		window.Split({
		  columnGutters: [{
		    track: 1,
		    element: this.$containerGutter[0],
		  }]
		});
		
		this.$element.find('.InteractiveSemanticGraph').detach().appendTo(`#isgb-${this.uid}-container-left`); //graph div has to be created in advance for now, move to left side
		
		this.$buttonAddTab = $(`<button id="${this.uid}-add-tab" style="width: 40px;height: 40px;">+</button>`);
		this.$buttonAddTab.button().on( "click", (e) => this.addTab());
		
		this.$tabsContainer = $(`<div id="isgb-${this.uid}-tabs" style="width: 100%;height: 100%;"></div>`);
		this.$tabHeaders = $(`<ul id="isgb-${this.uid}-tab-headers"></ul>`);
		this.$tabHeaders.append(this.$buttonAddTab);
		this.$tabsContainer.append(this.$tabHeaders);
		this.$containerRight.append(this.$tabsContainer);
		this.tabs = this.$tabsContainer.tabs();
		this.index = 0;
		
		this.tabs.on( "click", "span.ui-icon-close", (e) => {
			var id = $(e.target).closest( "li" ).remove().attr( "aria-controls" );
			this.removeTab(id);
		});
		
		this.previouslyFocused = false;
		this.tabs.find( ".ui-tabs-nav" ).sortable({
			axis: "x",
			// Sortable removes focus, so we need to restore it if the tab was focused prior to sorting
			start: (event, ui) => {
				this.previouslyFocused = document.activeElement === ui.item[ 0 ];
			},
			stop: (event, ui) => {
				this.tabs.tabs( "refresh" );
				if (this.previouslyFocused) {
					ui.item.trigger( "focus" );
				}
			}
		});
		
		this.addTab("Main_page");
		
		mw.hook( 'interactivesemanticgraph.node.clicked' ).add( this.navigate.bind(this) );
	}	
	
	navigate(title) {
		if (this.debug) console.log(`Navigate to ${title}`);
		this.tabs.find( ".ui-tabs-active" ).find('a').text(title);
		var id = this.tabs.find( ".ui-tabs-active" ).attr( "aria-controls" );
		$(`#${id}`).find('iframe').attr('src', `/wiki/${title}`);
	}
	
	addTab(title) {
		if (!title) title = "Main_page";
		var index = this.index;
		this.index += 1;
		var $header = `<li><a href="#isgb-${this.uid}-tab-${index}">${title}</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>`;
		this.tabs.find( ".ui-tabs-nav" ).append( $header );
		var $tab = $(
			`<div id="isgb-${this.uid}-tab-${index}" style="width: 100%;height: 95%;">
				<iframe id="isgb-${this.uid}-iframe-${index}" src="/wiki/${title}" frameborder="0" scrolling="yes" style="width: 100%; height: 100%;"></iframe>
			</div>`);
		this.tabs.append($tab);
		this.tabs.tabs( "refresh" );
		this.tabs.find(`[href="#isgb-${this.uid}-tab-${index}"]`).click(); //activate tab
		
	}
	
	removeTab(id) {
    	$( "#" + id ).remove();
    	this.tabs.tabs( "refresh" );
	}
	
};

$(document).ready(function () {

	if (!$(".InteractiveSemanticGraphBrowser")) return;
	//mw.loader.load("//some-server/some.css", "text/css");
	$.when(
		$.getScript("https://unpkg.com/split-grid/dist/split-grid.js"),
		$.getScript("https://code.jquery.com/ui/1.13.1/jquery-ui.js"),
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
