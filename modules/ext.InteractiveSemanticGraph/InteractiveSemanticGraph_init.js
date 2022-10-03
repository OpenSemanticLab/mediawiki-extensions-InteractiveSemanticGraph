/*@nomin*/
/* 
DEV: MediaWiki:InteractiveSemanticGraph.js
REL: modules/ext.InteractiveSemanticGraph/InteractiveSemanticGraph.js
hint: ResourceLoader minifier does not support ES6 yet, therefore skip minification  with "nomin" (see https://phabricator.wikimedia.org/T255556)
*/

$(document).ready(function () {

    $.when(
        mw.loader.using('ext.mwjson.util'),
        mw.loader.using('ext.mwjson.api'),
        mw.loader.using('ext.mwjson.parser'),
        mw.loader.using('ext.mwjson.editor'),
        $.Deferred(function (deferred) {
            $(deferred.resolve);
        })
    ).done(function () {

        $(".InteractiveSemanticGraph").each(function (index) {
            if ($('.InteractiveSemanticGraph').length) { //check if div element(s) exist

                var defaultOptions = { "root": "", "properties": [], "ignore_properties": [], "permalink": false, "sync_permalink": false, "edit": false, "hint": false, "treat_non_existing_pages_as_literals": false, "edge_labels": true };
                var userOptions = {};

                if (this.dataset.config) userOptions = JSON.parse(this.dataset.config);
                else if (this.innerText !== "") userOptions = JSON.parse(this.innerText); //Legacy support
                var config = { ...defaultOptions, ...userOptions };
                config.depth = parseInt(config.depth);
                var graph = new isg.Graph(this, config);
            }
        });
    });
});
