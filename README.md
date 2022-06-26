# mediawiki-extensions-InteractiveSemanticGraph

Visualizes SemanticMediawiki data with VisNetwork.js

## Usage

Insert a div with class 'InteractiveSemanticGraph' into any page
```
<div style="width: 100%;" class="InteractiveSemanticGraph">{ "root":"TestPage", "properties":["HasProperty1", "HasProperty2"], "permalink": false, "autoexpand": false, "depth": 3 }</div>
```
The text inside the div contains a json config. 'root' is the page to start with. 'properties' are the properties that a queried with a double-click on any node by default. 'permalink = true' will create a permalink every time you modify the graph restore it. 'autoexpand' will auto-query the given properties upon the given 'depth'.
