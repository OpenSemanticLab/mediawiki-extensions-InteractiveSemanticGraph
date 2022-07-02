//InteractiveSemanticBrowser
$(document).ready(function () {

	console.log("InteractiveSemanticBrowser init");
	$(".InteractiveSemanticBrowser").each( function() {
		$element = $(this);
		mw.hook( 'interactivesemanticgraph.node.clicked' ).add( function(title) {
			console.log(`Node ${title} clicked`);	
			$iframe = $element.find("iframe");
			var url = `https://wiki-dev.open-semantic-lab.org/wiki/${title}`;
			$iframe.attr('src', url).attr('data-src', url); //navigate iframe to target
		});
	});
});
