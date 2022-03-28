# mediawiki-extensions-InteractiveSemanticGraph

Visualizes SemanticMediawiki data with VisNetwork.js

## Usage

Insert a div with class 'InteractiveSemanticGraph' into any page
```
<div style="width: 100%;" class="InteractiveSemanticGraph">{ "root":"TestPage", "properties":["HasProperty1", "HasProperty2] }</div>
```
The text inside the div contains a json config. 'root' is the page to start with. 'properties' are the properties that a queried with a double-click on any node by default