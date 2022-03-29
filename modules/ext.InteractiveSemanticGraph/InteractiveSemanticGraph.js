$(document).ready(function() {

    $.getScript('https://unpkg.com/vis-network/standalone/umd/vis-network.min.js').done(function() {
    	var pathId = 0;
    	var newNodes = {};
    	var editNodes = {};
    	var editDeletedEdges = {};
    	var editDeletedNodes = {};
    	
    	$(".visNetworkGraph").each(function(index) {
        if ($('.visNetworkGraph').length) { //check if div element(s) exist
            var input = JSON.parse(this.innerHTML);
			
            // create an array with nodes
            var nodes = new vis.DataSet([]);
            // create an array with edges
            var edges = new vis.DataSet([]);
            //colors for the graph
            var colors = [];
            var oldGroups = {};
			var givenDiv = this;
			givenDiv.style.position = "relative";
			givenDiv.style.display = "inline-block";
			

			
            function getColor() {
                return "hsl(" + 360 * Math.random() + ',' +
                    (25 + 70 * Math.random()) + '%,' +
                    (85 + 10 * Math.random()) + '%)';
            }

            var h = Math.random();
            var golden = 0.618033988749895;
            function randomHSL() {
            	h += golden;
            	h %= 1;
            	//~~(360 * Math.random())
                return "hsla(" + (360 * h) + "," +
                    "70%," +
                    "80%,1)";
            }

            for (var i = 0; i < input.properties.length; i++) {
                colors.push(randomHSL());
            }

            function isLabelSet(id) {
                node = nodes.get(id);
                if (node === null) return false;
                else return id;
            }

            //var colors = ['#ff7878', '#73ff77', '#e878ff', '#ffae57', '#80f8ff', '#ffff75', '#adadad', '#b482ff'];

            nodes.add({
                id: input.root,
                label: input.root, //todo: query display title
                color: '#6dbfa9'
            });

            //Creates API query Url with the given root and properties
            function createUrl(root, properties) {
                var url = `/w/api.php?action=ask&query=[[${encodeURIComponent(root)}]]`;
                var propertiesVar = '';
                for (var i = 0; i < properties.length; i++) {
                    propertiesVar += '|?' + encodeURIComponent(properties[i]);

                }

                url = url + propertiesVar + '&format=json';
                return url;
            }

            //Makes an API call with the given parameters and adds the results to the nodes and edges datasets.
            //With a given nodeID the edges are set to the nodeID, else they are set to the root node.
            function fetchData(root, properties, nodeID, setGroup, setColor) {
                fetch(createUrl(root, properties))
                    .then(response => response.json())
                    .then(data => {
                    	if (!nodeID && root){ //first query on root node
                    		var rootNode = nodes.get(root);
                    		rootNode.url = data.query.results[root].fullurl;
                    		if (data.query.results[root].displaytitle) rootNode.label = data.query.results[root].displaytitle;
                    	}
                        for (var i = 0; i < properties.length; i++) {
                            for (var j = 0; j < data.query.results[root].printouts[properties[i]].length; j++) {
                            
                            	
                            	//define colors
                                if(!(properties[i] in legendColors) && setColor) {legendColors[properties[i]] = colors[i]; }
                                else {setColor = legendColors[properties[i]]; colors[i] = legendColors[properties[i]]; colors[i] = legendColors[properties[i]];}
                                //define id and label. use displaytitle if available. Use string representation of non-page properties
                                var id = "";
                                var label = "";
                                if (data.query.results[root].printouts[properties[i]][j].fulltext) id = data.query.results[root].printouts[properties[i]][j].fulltext;
                                else if(data.query.results[root].printouts[properties[i]][j].value) id = '' + data.query.results[root].printouts[properties[i]][j].value + ' ' + data.query.results[root].printouts[properties[i]][j].unit;  
                                else id = data.query.results[root].printouts[properties[i]][j].toString();
                                if (data.query.results[root].printouts[properties[i]][j].displaytitle) label = data.query.results[root].printouts[properties[i]][j].displaytitle;
                                if (label === "") label = id;
								
                                if (isLabelSet(id) === false) {

                                    if (setGroup && setColor) {
                                        nodes.add({
                                            id: id,
                                            label: label,
                                            color: setColor,
                                            group: setGroup[0],
                                            hidden: false,
                                            url: data.query.results[root].printouts[properties[i]][j].fullurl,
                                            oncontext: true,
                                        });
                                        oldGroups["" + id] = setGroup[0];
                                    } else {
                                        nodes.add({
                                            id: id,
                                            label: label,
                                            color: colors[i],
                                            group: properties[i],
                                            hidden: false,
                                            url: data.query.results[root].printouts[properties[i]][j].fullurl
                                        });
                                        oldGroups["" + id] = properties[i];
                                    }
                                    if (nodeID) {
                                        edges.add({
                                            from: nodeID,
                                            to: id,
                                            label: properties[i],
                                            color: colors[i],
                                            group: properties[i]
                                        });
                                    } else {
                                        edges.add({
                                            from: input.root,
                                            to: id,
                                            label: properties[i],
                                            color: colors[i],
                                            group: properties[i]
                                        });
                                    }
                                    
                                } else {
                                    edges.add({
                                        from: nodeID,
                                        to: isLabelSet(id),
                                        label: properties[i],
                                        color: setColor,
                                        group: properties[i]
                                    });
                                }
                            }
                        }
                        network.setOptions(options);
                        network.body.emitter.emit('_dataChanged');
                        network.redraw();
                        
                    });
            }
            fetchData(input.root, input.properties);
            // create a network
            var container = this; //document.getElementById("visNetworkGraph");
            var data = {
                nodes: nodes,
                edges: edges,
            };
            var options = {
                width: "100%",
                height: "100%",
                interaction: {
                    hover: true
                },
                manipulation: {
                    enabled: true,
                    editEdge: false,
                    deleteNode: function (data, callback) {deleteSelectedNode(data, callback)}.bind(this),
                    deleteEdge: function (data, callback) {deleteSelectedEdge(data, callback)}.bind(this),
                    addNode: function (data, callback) {
                    	
        // filling in the popup DOM elements
        document.getElementById("node-operation").innerText = "Add Node";
        dragElement(document.getElementById("node-popUp"));
        editNode(data, clearNodePopUp, callback);
      },
      addEdge: function (data, callback) {
        if (data.from == data.to) {
          var r = confirm("Do you want to connect the node to itself?");
          if (r != true) {
            callback(null);
            return;
          }
        }
        document.getElementById("edge-operation").innerText = "Add Edge";
        dragElement(document.getElementById("edge-popUp"));
        editEdgeWithoutDrag(data, callback);
      },
          },
                edges: {
                    arrows: {
                        to: {
                            enabled: true
                        },
                        //from:{enabled: true}
                    }
                },
                groups: {
                    useDefaultGroups: false
                },
                physics: {
                    stabilization: {
                        enabled: true,
                    },
                    barnesHut: {
                        gravitationalConstant: -40000,
                        centralGravity: 0,
                        springLength: 0,
                        springConstant: 0.5,
                        damping: 1,
                        avoidOverlap: 0
                    },
                    maxVelocity: 5
                },

            };
            //Creates groups in the options and sets them all to hidden:false.
            for (var i = 0; i < input.properties.length; i++) {
                options.groups[input.properties[i]] = {
                    hidden: false
                };
            }
            var network = new vis.Network(container, data, options);
            



function getAllEdgesBetween(node1,node2) {
    return edges.get().filter(function (edge) {
        return (edge.from === node1 && edge.to === node2 )|| (edge.from === node2 && edge.to === node1);
    });
}

function getAllCombs(arrays){
    var numberOfCombs = 1;
    for(var i=0; i<arrays.length; i++){
        numberOfCombs = numberOfCombs * arrays[i].length;
    }
    var allCombs = new Array(numberOfCombs);
    for(var i=0; i<allCombs.length; i++){
        allCombs[i] = new Array(arrays.length);
    }
    
    for(var i=0; i<arrays.length; i++){
        var current = arrays[i];
        for(var c=0; c<numberOfCombs; c++){
 
            for(var j=0; j<current.length; j++){
                allCombs[c][i] = current[c%current.length];
                
            }
        }
    }
	
    return allCombs;
}
 
function getEdgePathsForPath(path){
  var arraysOfEdgesForNodeInPath = [];
  for(var i=1; i<path.length; i++){
    var edgesBetween = getAllEdgesBetween(path[i-1], path[i]);
    var localedgesBetween = edgesBetween.slice();
    arraysOfEdgesForNodeInPath.push(localedgesBetween);
  }
  var allEdgePaths = getAllCombs(arraysOfEdgesForNodeInPath);
return allEdgePaths;
}

function reverseLabel(label){
  if(label[0] == "-"){
    return label.substring(1);
  }
  else{
    return "-" + label;
  }
}

function getEdgeLabelStringsForPath(path){
  var allEdgePaths = getEdgePathsForPath(path);
  var allStrings = new Array(allEdgePaths.length);
  for(var i=0; i<allEdgePaths.length; i++){
    var s = "";
    for(var j=0; j<allEdgePaths[i].length;j++){
      
      var edge = allEdgePaths[i][j];
      var label = edge.label;
      var nodeId1 = path[j];
      var nodeId2 = path[j+1];
      if(edge.to == nodeId1 && edge.from == nodeId2){
        label = reverseLabel(label);
      }
      if(j == (allEdgePaths[i].length - 1)){
         s = s + label;
      }
      else{
         s = s + label + ".";
      }
     
      
    }
    allStrings[i] = s;
  }
  return allStrings;
}

function getAllStringsForAllPaths(paths){
  var arrayOfAllStrings = [];
  for(var i=0; i<paths.length;i++){
    var path = paths[i];
    var allStrings = getEdgeLabelStringsForPath(path);
    arrayOfAllStrings.push(allStrings);
  }
return arrayOfAllStrings;
}



function removeItem(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}




function findAllPaths(startNode, endNode){
    var visitedNodes = [];
    var currentPath = [];
    var allPaths =  [];
    dfs(startNode, endNode, currentPath, allPaths, visitedNodes);
    return allPaths;
}

function dfs(start, end, currentPath, allPaths, visitedNodes){
    if(visitedNodes.includes(start)) return;
    visitedNodes.push(start);
    currentPath.push(start);
    if(start == end){
    	var localCurrentPath = currentPath.slice();
        allPaths.push(localCurrentPath);
        removeItem(visitedNodes, start);
        currentPath.pop();
        return;
    }
    
    var neighbours = network.getConnectedNodes(start);
    for(var i = 0; i < neighbours.length; i++){    
        var current = neighbours[i];
        dfs(current, end, currentPath, allPaths, visitedNodes);
    }

    currentPath.pop();
    removeItem(visitedNodes, start);

}





            
            

            //This function deletes all children of a given node.
            function getAllReachableNodesTo(nodeId, excludeIds, reachableNodes) {

                if (reachableNodes.includes(nodeId) || excludeIds.includes(nodeId)) { return;}
                var children = network.getConnectedNodes(nodeId);
                reachableNodes.push(nodeId);
                for (var i = 0; i < children.length; i++) {
                    getAllReachableNodesTo(children[i], excludeIds, reachableNodes);
                    //if(excludeIds.includes(children[i]))continue;
                    //reachableNodes.push(children[i]);
                }
            }
            
            function deleteNodesChildren(nodeId, deleteEdge) {
                var excludedIds = [];
                if(deleteEdge === true){
                	console.log("deleteEdge true")
                }else{
                	excludedIds.push(nodeId);
                }
                var reachableNodesTo = [];
                getAllReachableNodesTo(input.root, excludedIds, reachableNodesTo);
                var nodesToDelete = [];
                var allIds = nodes.getIds();

                for (var i = 0; i < allIds.length; i++) {
                    if (reachableNodesTo.includes(allIds[i])) continue;
                    if (allIds[i] == nodeId) {
                    	deleteEdges(nodeId);
                    	continue;
                    }
                    nodesToDelete.push(allIds[i]);
                    deleteEdges(allIds[i]);
                    nodes.remove(allIds[i]);
                    delete oldGroups["" + allIds[i]];
                    delete objClickedProps["" + allIds[i]];
                }

                return nodesToDelete;
            }
            
			function deleteEdges(nodeID){
				var fromEdges = edges.get({
                    filter: function (item) {
                        return item.from == nodeID;
                    }
                });
                
        		for(var j = 0; j < fromEdges.length; j++){
        			edges.remove(fromEdges[j]);
        		}
			}
			var nodesClicked = [];
			var tip = '<p><strong>Hinweis:</strong> Um sich einen Pfad zwischen zwei Knoten ausgeben zu lassen, <em>Strg</em> gedrückt halten und die gewünschten zwei Knoten mit der <em>linken Maustaste</em> anklicken. </p>'
			this.insertAdjacentHTML('afterbegin', tip);
			
			network.on("click", function(params) {
				
                if (params.nodes[0] && params.event.srcEvent.ctrlKey) {
                	
                	if(nodesClicked.length < 2){
                		nodesClicked.push(params.nodes[0]);
                	}
                	if(nodesClicked.length == 2 && nodesClicked[0] != nodesClicked[1]){
                		var foundPaths = findAllPaths(nodesClicked[0],nodesClicked[1]);
                		//.querySelector('[id^="poll-"]').id;
                		if(document.querySelectorAll('[id^="fullPath"]')){
                			for(var i=0; i < document.querySelectorAll('[id^="fullPath"]').length; i++){
                				document.querySelectorAll('[id^="fullPath"]')[i].remove();
                			}
                		}
                		var element = '<div id="fullPath'+ pathId +'"></div>'
						givenDiv.children[0].insertAdjacentHTML('afterend', element);

                		var allStringsArray = getAllStringsForAllPaths(foundPaths);
                		
                		var stringDiv = givenDiv.querySelector('#fullPath' + pathId);
                		
                		if(foundPaths.length == 1){stringDiv.innerHTML = "<strong>Gefundener Pfad:</strong><br>"}else{stringDiv.innerHTML = "<strong>Gefundene Pfade:</strong><br>"}
                		
                		for(var s=0; s<foundPaths.length; s++){
                			if(foundPaths.length == 1){var pathNumb = ""}else{var pathNumb = "<strong>" + (s+1) + ". Pfad:</strong> <br>"}
                			
                			stringDiv.innerHTML += pathNumb + "<strong>Knoten: </strong>";
						  for(var t=0; t<foundPaths[s].length; t++){
						    var currentFoundPath = foundPaths[s][t];
						    
						    if(t == (foundPaths[s].length - 1)){
						         stringDiv.innerHTML = stringDiv.innerHTML + currentFoundPath + " ";
						    }
						    else{
						         stringDiv.innerHTML = stringDiv.innerHTML + currentFoundPath + " - ";
						    }
						  }
						  stringDiv.innerHTML += "<br>"
						  stringDiv.innerHTML += "<strong>Kanten:</strong> "
						  for(var t=0; t<allStringsArray[s].length; t++){
						    var currentString = allStringsArray[s][t];
						    var currentFoundPath = foundPaths[s][t];
						    var stringDiv = givenDiv.querySelector('#fullPath' + pathId);
						    stringDiv.innerHTML = stringDiv.innerHTML + currentString;
						  }
						  stringDiv.innerHTML += "<br>"
						}

                		nodesClicked = [];
						
                	}
                	if(nodesClicked[0] === nodesClicked[1] || nodesClicked.length > 2){
                	nodesClicked = [];
                	}
                	
                	
                }
				pathId++;
			});

			$(document).keyup(function(event) {
			   if(!event.ctrlKey){
			   	nodesClicked = [];
			   }
			});
			
			
			
			
			

            var contextCreatedProps = [];

            network.on("doubleClick", function(params) {
				
                if (params.nodes[0]) {
                	
                	var conManNodes = network.getConnectedNodes(params.nodes[0], 'to');
                	
	                var onlyConManNodes = true;
	                for(var i = 0; i < conManNodes.length;i++){
	                
	                
	                if(!(nodes.get(conManNodes[i]).oncontext || nodes.get(conManNodes[i]).manually)){
	                	onlyConManNodes = false;
	                }
	                }
                	
                	//Node is expanded -> delete it and all nodes related to its expansion
                    if (network.getConnectedNodes(params.nodes[0]).length > 1 && onlyConManNodes == false) {
                        deleteNodesChildren(params.nodes[0]);
                        for (var i = 0; i < contextCreatedProps.length; i++) {
                            var noNodesInNetwork = true;
                            for (var j = 0; j < nodes.getIds().length; j++) {
                                if (contextCreatedProps[i] == nodes.get(nodes.getIds()[j]).group) {
                                    noNodesInNetwork = false;
                                }
                            }
                            if (noNodesInNetwork === true) {
                                givenDiv.querySelector('#' + contextCreatedProps[i]).remove();
                                contextCreatedProps.splice(contextCreatedProps.indexOf(contextCreatedProps[i]), 1);
                                i--;
                            }
                        }
                        delete objClickedProps["" + params.nodes[0]];
                        
                        //nodesArray.splice(nodesArray.indexOf(params.nodes[0]), 1);
                    } else {
                    	//Node is unexpanded -> expand it
                        var nodeById = nodes.get(params.nodes[0]);
                        fetchData(nodeById.id, input.properties, params.nodes[0]);
                        //nodesArray.push(params.nodes[0]);
                    }

                }
            });
            
            function newGroup(node, legendGroup) {
                
                nodes.update({
                    id: node,
                    group: legendGroup
                });


                var connectedNodes = network.getConnectedNodes(node, 'to');

                for (var i = 0; i < connectedNodes.length; i++) {
                    newGroup(connectedNodes[i], legendGroup);
                }
            }

			//Checks, if a node has a path over visible edges to the root node.
			//If not, the nodes gets hidden
			function setNodeVisibilityByVisiblePath(nodeId, rootNodeId){
				if (nodeId == rootNodeId) return true; //root is always visible
				var node = nodes.get(nodeId);
				if (node.visited) return !node.hidden //prevent circles. ToDo: Reuse results between runs
				node.visited = true;
				node.hidden = true;
				var connectedEdgesIds = network.getConnectedEdges(nodeId);
				var connectedEdges = edges.get(connectedEdgesIds);
				connectedEdges.forEach(function(edge) {
					if (edge.hidden) return; //don't follow hidden edges
                    var connectedNodesIds = network.getConnectedNodes(edge.id);
                    var connectedNodes = nodes.get(connectedNodesIds);
                    connectedNodes.forEach(function(connectedNode) {
                    	if (connectedNode.id == nodeId) return; //prevent self evaluation
                    	if (setNodeVisibilityByVisiblePath(connectedNode.id, rootNodeId)) {
                    		node.hidden = false; //set node visible, if at least one connected node is visible
                    	}
                    });
                });
                node.physics = !node.hidden;//disable physics for hidden nodes
                return !node.hidden;
			}

            function legendFunctionality() {

                var legendGroup;
                var group;
                var nodeChildren;
                legendGroup = this.parentNode.childNodes[1].innerHTML;
                
                
                var strategy = "strategy2"
                
                if (strategy == "strategy2"){
                	//A node is visible if at least one path over visible edges to the root node exists.
                	options.groups[legendGroup].hidden = !options.groups[legendGroup].hidden; //toggle state
                	if(options.groups[legendGroup].hidden) this.parentNode.childNodes[1].style.background = '#FFFFFF';
                	else this.parentNode.childNodes[1].style.background = '#DEF';
                	//update all edges
                	edges.forEach(function(edge) {
                    	edge.hidden = options.groups[edge.label].hidden;
                    	edge.physics = !edge.hidden;
                	});
                	//reset nodes
                    nodes.forEach(function(node) {
                    	node.hidden = false;
                    	node.physics = !node.hidden;
                    	node.visited = false;
                    });
                    //check each node
                    nodes.forEach(function(node) {
                    	setNodeVisibilityByVisiblePath(node.id, input.root)
                    	//reset visited state. Todo: Reuse visited nodes between runs
                    	nodes.forEach(function(node) {
                    		node.visited = false;
                    	});
                    });
                }
                
                network.setOptions(options);
                network.body.emitter.emit('_dataChanged');
                network.redraw();

                var allFalse = Object.keys(options.groups).every(function(k) {
                    if (k === 'useDefaultGroups') {
                        return true
                    }
                    return options.groups[k].hidden === false
                });
                if (allFalse === true) {
                    /*oldGroups = {};*/
                }
            };

            var legendDiv = document.createElement("div");
            this.append(legendDiv);
            legendDiv.style.width = '100%';
            legendDiv.style.position = 'relative';
            legendDiv.style.display = 'inline-block';
            
            legendDiv.id = "legendContainer";
            var legendColors = {};
            for (var i = 0; i < input.properties.length; i++) {
                legendColors[input.properties[i]] = colors[i];
                var propertyContainer = document.createElement("div");
                var propertyColor = document.createElement("div");
                var propertyName = document.createElement("div");

                propertyContainer.className = "legend-element-container";
                propertyContainer.id = input.properties[i];

                propertyColor.className = "color-container";

                propertyName.className = "name-container";

                propertyColor.style.float = "left";
                propertyName.style.float = "left";
                propertyColor.style.border = "1px solid black";
                propertyName.style.border = "1px solid black";

                propertyColor.style.background = colors[i];
                propertyColor.innerHTML = "";
                propertyName.innerHTML = input.properties[i];

                propertyColor.style.width = "30px";
                propertyColor.style.height = "30px";
                propertyName.style.height = "30px";
                propertyName.style.background = '#DEF';

                //propertyName.text-align = 'center';
                propertyContainer.paddinng = '5px 5px 5px 5px';

                propertyName.addEventListener("click", legendFunctionality);
                propertyColor.addEventListener("click", legendFunctionality);

                legendDiv.append(propertyContainer);
                propertyContainer.append(propertyColor);
                propertyContainer.append(propertyName);

            }

            var ul = document.createElement("ul");
            ul.className = 'custom-menu';
            document.body.append(ul);
            objClickedProps = {};
            objColors = {};
            var start = 0;
            

            network.on("oncontext", function(params) {
            	params.event.preventDefault();
            	var timeNow = Date.now();
            	var timeDiff = timeNow - start
            	if(timeDiff > 300){
            		start = Date.now();
                //console.log(nodes.get(network.getNodeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })));
                
				//console.log(edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })));
                
                $('.custom-menu').each( function(index) {
                while (this.lastElementChild) {
                    this.removeChild(this.lastElementChild);
                }});
                if(!(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y }) && network.getNodeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y }))){
                if(edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })).from){
                	params.event.preventDefault();
      
                	if(edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })).label == 'Category'){
                			
                				var li = document.createElement("li");
                        		li.innerHTML = '' + '\uD83D\uDD17' + ' ' + edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })).to;

                                li.addEventListener("click", function NewTab() {
                                 window.open('/wiki/' + edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })).to);
                                });
                                ul.prepend(li);}else{
                                var li = document.createElement("li");
                        		li.innerHTML = '' + '\uD83D\uDD17' + ' ' + edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })).label;

                                li.addEventListener("click", function NewTab() {
                                 window.open('/wiki/' + 'Property:' + edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })).label);
                                });
                                ul.prepend(li);
                                }
                        $(".custom-menu").finish().toggle(100).css({
                        top: params.event.pageY + "px",
                        left: params.event.pageX + "px",
                        display: "block"
                    }); 
                }
                }
                if (network.getNodeAt({
                        x: params.pointer.DOM.x,
                        y: params.pointer.DOM.y
                    })) {
                    params.event.preventDefault();
					
					const nodeID = nodes.get(network.getNodeAt({x: params.pointer.DOM.x,y: params.pointer.DOM.y})).id;
					const subject = nodeID.split("#")[0];
					var subObject = "";
					if (nodeID.split("#")[1]) {
						subObject = nodeID.split("#")[1].replace(" ", "_");
					}
					//inverse properties are only available in html format
					const query = `/w/api.php?action=smwbrowse&browse=subject&params={"subject":"${encodeURIComponent(subject)}","subobject":"${subObject}","options":{"showAll":"true"}, "ns":0, "type":"html"}&format=json`;

                    fetch(query) 
                        .then(response => response.json())
                        .then(data => {
                        	var selected_node =  nodes.get(network.getNodeAt({
                            	x: params.pointer.DOM.x,
                            	y: params.pointer.DOM.y
                        	}));
                        	if (selected_node.url){
                        		
                        		var li = document.createElement("li");
                        		li.innerHTML = '' + '\uD83D\uDD17' + ' ' + selected_node.label;

                                li.addEventListener("click", function NewTab() {
                                 window.open(selected_node.url);
                                });
                                
                                ul.prepend(li);
                        		
                        	}
                        	var page_properties = [];
                        	$html = $(data.query);
							$html.find("div.smwb-propvalue").each(function(){
								$prop = $(this).find("div.smwb-prophead a");
								//var propName = $prop.text();
								//var propName = $prop.attr('title').replace("Property:", "");
								var propName = "";
								if ($prop.attr('title') === "Special:Categories") propName += "Category";
								else propName += $prop.attr('href').split("Property:")[1].split("&")[0];
								page_properties.push(propName);
								//console.log(propName);
								$(this).find("div.smwb-propval span.smwb-value").each(function(){
									var value = $(this).find("a").attr("title");
									//console.log("-> " + value);
								});
							})
							$html.find("div.smwb-ipropvalue").each(function(){
								$prop = $(this).find("div.smwb-prophead a");
								//var propName = $prop.text();
								//var propName = $prop.attr('title').replace("Property:", "");
								var propName = "-";
								if ($prop.attr('title') === "Special:Categories") propName += "Category";
								else propName += $prop.attr('href').split("Property:")[1].split("&")[0];
								page_properties.push(propName);
								//console.log(propName);
								$(this).find("div.smwb-propval span.smwb-ivalue").each(function(){
									var value = $(this).find("a").attr("title");
									//console.log("-> " + value);
								});
							})
							for (var i = 0; i < page_properties.length; i++) {
	                            if (!page_properties[i].startsWith("_")) {
	                                 var li = document.createElement("li");
	                                 li.dataset.action = page_properties[i].replaceAll('_',' ');
	                                 li.innerHTML = page_properties[i].replaceAll('_',' ');
	                                 ul.append(li);
	                            }
	                        }
	                        
                        	/* old: use json result */
                        	/*
                        	var page_properties = data.query.data; //normal page
                        	if (selected_node.id.includes('#')) { //subobject
                        		for (var i = 0; i < data.query.sobj.length; i++) { 
                        			if (data.query.sobj[i].subject.endsWith(selected_node.id.split('#').pop().replace(' ',''))){
                        				page_properties = data.query.sobj[i].data
                        				break;
                        			}
                        		}
                        	}
	                        for (var i = 0; i < page_properties.length; i++) {
	                            if (!page_properties[i].property.startsWith("_")) {
	                                 var li = document.createElement("li");
	                                 li.dataset.action = page_properties[i].property.replaceAll('_',' ');
	                                 li.innerHTML = page_properties[i].property.replaceAll('_',' ');
	                                 ul.append(li);
	                            }
	                        }*/

                            $(".custom-menu li").click(function() {

                                var clickedProperty = [$(this).attr("data-action")]
                                
                                var clickedPropertyColor = randomHSL();
                                
                                if(!(clickedProperty in legendColors)){legendColors[clickedProperty] = clickedPropertyColor; }else{clickedPropertyColor = legendColors[clickedProperty]; }

                                

                                if (objColors[clickedProperty]) {
                                    clickedPropertyColor = objColors[clickedProperty]
                                } else {
                                    objColors[clickedProperty] = clickedPropertyColor;
                                }


                                if (!objClickedProps[nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).id]) {
                                    objClickedProps[nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).id] = new Array();
                                }



                                if (!objClickedProps["" + nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).id].includes(clickedProperty[0])) {
                                    fetchData(nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).id, clickedProperty, nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).id, clickedProperty, clickedPropertyColor)
                                    objClickedProps["" + nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).id].push(clickedProperty[0]);
                                }

                                if (!(contextCreatedProps.includes(clickedProperty[0]) || input.properties.includes(clickedProperty[0]) /*|| legendColors[clickedProperty[0]]*/ )) {

                                    contextCreatedProps.push(clickedProperty[0]);

                                    options.groups[clickedProperty] = {
                                        hidden: false
                                    };

                                    var propertyContainer = document.createElement("div");
                                    var propertyColor = document.createElement("div");
                                    var propertyName = document.createElement("div");
                                    

                                    propertyContainer.className = "legend-element-container";
                                    propertyContainer.id = clickedProperty;

                                    propertyColor.className = "color-container";

                                    propertyName.className = "name-container";

                                    propertyColor.style.float = "left";
                                    propertyName.style.float = "left";
                                    propertyColor.style.border = "1px solid black";
                                    propertyName.style.border = "1px solid black";
                                    propertyContainer.style = "margin-right: 5px";


                                    propertyColor.style.background = clickedPropertyColor;
                                    propertyColor.innerHTML = "";
                                    propertyName.innerHTML = clickedProperty;

                                    propertyColor.style.width = "30px";
                                    propertyColor.style.height = "30px";
                                    propertyName.style.height = "30px";
                                    propertyName.style.background = '#DEF';

                                    //propertyName.text-align = 'center';
                                    propertyName.margin = 'auto 5px auto 5px';

                                    propertyName.addEventListener("click", legendFunctionality);
                                    propertyColor.addEventListener("click", legendFunctionality);


                                    legendDiv.append(propertyContainer);
                                    propertyContainer.append(propertyColor);
                                    propertyContainer.append(propertyName);

                                }

                                $(".custom-menu").hide(100);
                            });
                        });

                    $(".custom-menu").finish().toggle(100).css({
                        top: params.event.pageY + "px",
                        left: params.event.pageX + "px",
                        display: "block"
                    });
                }
            }
            });
            // If the document is clicked somewhere
            $(document).bind("mousedown", function(e) {

                // If the clicked element is not the menu
                if (!$(e.target).parents(".custom-menu").length > 0) {

                    // Hide it
                    $(".custom-menu").hide(100);
                }
            });
           
function editNode(data, cancelAction, callback) {
	var newNodeActive = true;
  document.getElementById("node-label").value = data.label;
  document.getElementById("node-saveButton").onclick = saveNodeData.bind(
    this,
    data,
    callback
  );
  document.getElementById("node-cancelButton").onclick = cancelAction.bind(
    this,
    callback
  );
  //document.getElementById("node-popUp")

  	
  	$('canvas').on('click', function(e) {
  		if(newNodeActive === true){
    $("#node-popUp").css({
                        top: e.pageY + "px",
                        left: e.pageX + "px",
                        display: "block"
                        });}
                        newNodeActive = false;
                        
});

}

// Callback passed as parameter is ignored
function clearNodePopUp() {
  document.getElementById("node-saveButton").onclick = null;
  document.getElementById("node-cancelButton").onclick = null;
  document.getElementById("node-popUp").style.display = "none";
}

function cancelNodeEdit(callback) {
  clearNodePopUp();
  callback(null);
}

function saveNodeData(data, callback) {
  data.label = document.getElementById("node-label").value;
  data.id = document.getElementById("node-label").value;
  data.hidden = false;
  data.physics = false;
  document.getElementById("node-label").value = "";
  clearNodePopUp();
  callback(data);
}

function editEdgeWithoutDrag(data, callback) {
	var newEdgeActive = true;
  // filling in the popup DOM elements
  document.getElementById("edge-label").value = data.label;
    /*if(data.from === "H.1"){
  	console.log("here");
  	return;}*/
  document.getElementById("edge-saveButton").onclick = saveEdgeData.bind(
    this,
    data,
    callback
  );
  document.getElementById("edge-cancelButton").onclick = cancelEdgeEdit.bind(
    this,
    callback
  );
  
  $('canvas').on('click', function(e) {
  		if(newEdgeActive === true){
    $("#edge-popUp").css({
                        top: e.pageY + "px",
                        left: e.pageX + "px",
                        display: "block"
                        });}
                        newEdgeActive = false;
});
  //document.getElementById("edge-popUp").style.display = "block";
}

function clearEdgePopUp() {
  document.getElementById("edge-saveButton").onclick = null;
  document.getElementById("edge-cancelButton").onclick = null;
  document.getElementById("edge-popUp").style.display = "none";
}

function cancelEdgeEdit(callback) {
  clearEdgePopUp();
  callback(null);
}

function isLabelReversed(label){
  if(label[0] == "-"){
    return true;
  }
  else{
    return false;
  }
}






var pageBool;
async function pageExists(id){
	
	await fetch('/w/api.php?action=parse&page='+ id +'&prop=wikitext&format=json')
                        .then(response => response.json())
                        .then(data => {
                        	
                        	if(data.error){
                        		pageBool = false;
                        	}else{
                        		pageBool = true;
                        	}
                        	
                        })
	return pageBool;
}

var wikiText = "";
var semantic = "";
async function editWikiText(node){
		await fetch('/w/api.php?action=parse&page='+ node +'&prop=wikitext&format=json')
                        .then(response => response.json())
                        .then(data => {
                        wikiText = data.parse.wikitext['*'];
                        semantic = "";
						if(wikiText.search(/(\{\{Semantic\/[^}]*[\r\n]*\}[\r\n]*\})/g) >= 0){
						//var edgeStringFound = wikiText.search(re) >= 0;
						const found = wikiText.match(/(\{\{Semantic\/[^}]*[\r\n]*\}[\r\n]*\})/g);
						
						var newWikiText = wikiText;
						for(var i=0; i<found.length;i++){
							if(i == found.length-1){
								semantic += found[i];
								newWikiText = newWikiText.replace(/(\{\{Semantic\/[^}]*[\r\n]*\}[\r\n]*\}[\r\n]*\}[\r\n]*\})/g, "");
							}else{
								semantic += found[i];
								newWikiText = newWikiText.replace(found[i], "");
							}
						}
						wikiText = newWikiText;
						
						


						}
});
return [semantic, wikiText];
}



async function saveEdgeData(data, callback) {
  if (typeof data.to === "object") data.to = data.to.id;
  if (typeof data.from === "object") data.from = data.from.id;
  
  data.label = document.getElementById("edge-label").value;
  options.groups[data.label] = {hidden: false};
  var toNode = nodes.get(data.to);
  var fromNode = nodes.get(data.from);
  fromNode.physics = true;
  toNode.physics = true;
  delete fromNode.x;
  delete fromNode.y;
  delete toNode.x;
  delete toNode.y;
  if(!toNode.group){toNode.group = data.label}
  if(!fromNode.group){fromNode.group = data.label}
  if(legendColors[data.label]){data.color = legendColors[data.label];}else{data.color = randomHSL(); }
  if(!toNode.color){toNode.color = data.color; toNode.manually = true;}
  if(!fromNode.color){fromNode.color = data.color; fromNode.manually = true;}
  
  if(!(contextCreatedProps.includes(data.label) || input.properties.includes(data.label))){
  	contextCreatedProps.push(data.label);
	var propertyContainer = document.createElement("div");
    var propertyColor = document.createElement("div");
    var propertyName = document.createElement("div");
    

    propertyContainer.className = "legend-element-container";
    propertyContainer.id = data.label;

    propertyColor.className = "color-container";

    propertyName.className = "name-container";

    propertyColor.style.float = "left";
    propertyName.style.float = "left";
    propertyColor.style.border = "1px solid black";
    propertyName.style.border = "1px solid black";
    propertyContainer.style = "margin-right: 5px";


    propertyColor.style.background = data.color;
    propertyColor.innerHTML = "";
    propertyName.innerHTML = data.label;

    propertyColor.style.width = "30px";
    propertyColor.style.height = "30px";
    propertyName.style.height = "30px";
    propertyName.style.background = '#DEF';

    //propertyName.text-align = 'center';
    propertyName.margin = 'auto 5px auto 5px';

    propertyName.addEventListener("click", legendFunctionality);
    propertyColor.addEventListener("click", legendFunctionality);


    legendDiv.append(propertyContainer);
    propertyContainer.append(propertyColor);
    propertyContainer.append(propertyName);
  	legendColors[data.label] = data.color;
  }
  if(isLabelReversed(data.label)){
  	if(await pageExists(fromNode.id) === false){
  		if(!(newNodes[fromNode.id])){
  			newNodes[fromNode.id] = '' + '{{Semantic/Element' + 
									'|label=' + fromNode.label +
									'|description=test' + 
									'|relations=';
  		}
  
  	}

  	if(await pageExists(toNode.id) === true){
  	var splitWikiText = await editWikiText(toNode.id);
  		if(editNodes[toNode.id]){
  			editNodes[toNode.id] += '' + '{{Semantic/Link'+
								'|property=' + reverseLabel(data.label) +
								'|value=' + fromNode.id +
								'}}' + '';
  			
  		}else{
  			if(splitWikiText[0]){
  				editNodes[toNode.id] = splitWikiText[1] + splitWikiText[0] + '{{Semantic/Link'+
								'|property=' + reverseLabel(data.label) +
								'|value=' + fromNode.id +
								'}}' + '';
  			}else{
	  		editNodes[toNode.id] = splitWikiText[1] + '{{Semantic/Element' + 
									'|label=' + toNode.label +
									'|description=test' + 
									'|relations='+ 
	  								'{{Semantic/Link'+
									'|property=' + reverseLabel(data.label) +
									'|value=' + fromNode.id +
									'}}' + '';
  			}
  		}
  	}else{
  		if(newNodes[toNode.id]){
  			newNodes[toNode.id] += '' + '{{Semantic/Link'+
								'|property=' + reverseLabel(data.label) +
								'|value=' + fromNode.id +
								'}}' + '';
  		}else{
	  		newNodes[toNode.id] = '' + '{{Semantic/Element' + 
									'|label=' + toNode.label +
									'|description=test' + 
									'|relations={{Semantic/Link'+
									'|property=' + reverseLabel(data.label) +
									'|value=' + fromNode.id +
									'}}'+
									'';
  		}
  	}

  }else{
  	
  	if(await pageExists(toNode.id) === false){
  		if(!(newNodes[toNode.id])){
  		newNodes[toNode.id] = '' + '{{Semantic/Element' + 
									'|label=' + toNode.label +
									'|description=test' + 
									'|relations=';
  		}
  	}
  	if(await pageExists(fromNode.id) === true){
  		var splitWikiText = await editWikiText(fromNode.id);
  		if(editNodes[fromNode.id]){
  			editNodes[fromNode.id] += '' + '{{Semantic/Link'+
									'|property=' + data.label +
									'|value=' + toNode.id +
									'}}' + '';
  		}else{
  			if(splitWikiText[0]){
  				editNodes[fromNode.id] = splitWikiText[1] +  splitWikiText[0] + '{{Semantic/Link'+
									'|property=' + data.label +
									'|value=' + toNode.id +
									'}}' + '';
  			}else{
	  		editNodes[fromNode.id] = splitWikiText[1] + '{{Semantic/Element' + 
									'|label=' + fromNode.label +
									'|description=test' + 
									'|relations='+
	  								'{{Semantic/Link'+
									'|property=' + data.label +
									'|value=' + toNode.id +
									'}}' + '';
  			}
  		}
  	}else{
  		if(newNodes[fromNode.id]){
  			newNodes[fromNode.id] += '' + '{{Semantic/Link'+
									'|property=' + data.label +
									'|value=' + toNode.id +
									'}}' + '';
  			
  		}else{
	  		newNodes[fromNode.id] = '' + '{{Semantic/Element' + 
									'|label=' + fromNode.label +
									'|description=test' + 
									'|relations={{Semantic/Link'+
									'|property=' + data.label +
									'|value=' + toNode.id +
									'}}'+
									'';
									
  		}
  	}

  }

  //console.log(toNode);
  //console.log(fromNode);
  
	console.log(editNodes);
	console.log(newNodes);
  
  clearEdgePopUp();
  callback(data);
  network.setOptions(options);
  network.body.emitter.emit('_dataChanged');
  network.redraw();
}
    		var saveBtn= document.createElement("button");
            saveBtn.addEventListener("click", saveGraphChanges);
            saveBtn.innerHTML = "Speichern";
            saveBtn.style.width = "auto";
            saveBtn.style.height = "auto";

			givenDiv.appendChild(saveBtn);
			 function saveGraphChanges() {
				var alertString = "";
				OO.ui.confirm( 'Änderungen übernehmen?' ).done( async function ( confirmed ) {
				    if ( confirmed ) {
				for (const [key, value] of Object.entries(newNodes)) {
				  var params = {
							action: 'edit',
							title: '' + key,
							appendtext: '' + value + '}}',
							format: 'json'
						},
						api = new mw.Api();
					
					await api.postWithToken( 'csrf', params ).done( function ( data ) {
						console.log( data );
						alertString += "Seite " + key + " erstellt!\r\n"
					} );
				}
				
				for (const [key, value] of Object.entries(editNodes)) {
				  var params = {
							action: 'edit',
							title: '' + key,
							text: '' + value + '}}',
							format: 'json'
						},
						api = new mw.Api();
					
					await api.postWithToken( 'csrf', params ).done( function ( data ) {
						console.log( data );
						alertString += "Seite " + key + " bearbeitet!\r\n"
					} );
				}
				
				for (const [key, value] of Object.entries(editDeletedEdges)) {
				  var params = {
							action: 'edit',
							title: '' + key,
							text: '' + value,
							format: 'json'
						},
						api = new mw.Api();
					
					await api.postWithToken( 'csrf', params ).done( function ( data ) {
						console.log( data );
						alertString += "Auf der Seite " + key + " wurde ein Attribut gelöscht!\r\n"
					} );
				}
				
				for (const [key, value] of Object.entries(editDeletedNodes)) {
				  var params = {
									action: 'delete',
									title: '' + key,
									format: 'json'
								},
								api = new mw.Api();
							await api.postWithToken( 'csrf', params ).done( function ( data ) {
								console.log( data );
								alertString += "Seite " + key + " wurde gelöscht!\r\n"
							} );
				}
				console.log( alertString );
				// Example: Customize the displayed actions at the time the window is opened.
				var messageDialog = new OO.ui.MessageDialog();
				
				// Create and append a window manager.
				var windowManager = new OO.ui.WindowManager();
				$( 'body' ).append( windowManager.$element );
				
				// Add the dialog to the window manager.
				windowManager.addWindows( [ messageDialog ] );
				
				// Configure the message dialog when it is opened with the window manager's openWindow() method.
				
				windowManager.openWindow( messageDialog, {
				  title: 'Folgende Änderugnen wurden übernommen:',
				  message: '' + alertString,
				  verbose: true,
				  actions: [
				    {
				      action: 'accept',
				      label: 'Okay',
				      flags: 'primary'
				    }
				  ]
				});
				/*OO.ui.alert( "" + alertString ).done( function () {
				    console.log( alertString );
				} );*/
				
				    } else {
				        
				    }
				    
				} );
				

			}
			



function deleteSelectedNode(data, callback){
	console.log(contextCreatedProps);
	deleteNodesChildren(data.nodes[0]);
	nodes.remove(data.nodes[0]);
                        for (var i = 0; i < contextCreatedProps.length; i++) {
                            var noNodesInNetwork = true;
                            for (var j = 0; j < nodes.getIds().length; j++) {
                                if (contextCreatedProps[i] == nodes.get(nodes.getIds()[j]).group) {
                                	
                                    noNodesInNetwork = false;
                                }
                            }
                            if (noNodesInNetwork === true) {
                            	
                                givenDiv.querySelector('#' + contextCreatedProps[i]).remove();
                                contextCreatedProps.splice(contextCreatedProps.indexOf(contextCreatedProps[i]), 1);
                                i--;
                            }
                        }

                        
    					delete oldGroups["" + data.nodes[0]];
                        
                        delete objClickedProps["" + data.nodes[0]];
                        callback();
                        document.querySelector('.vis-delete').remove();
						editDeletedNodes[""+data.nodes[0]] = "";
						delete newNodes[""+data.nodes[0]];
						delete editNodes[""+data.nodes[0]];
						console.log(editDeletedNodes);

}

async function deleteSelectedEdge(data, callback){
	var edgeToNode = edges.get(data.edges[0]).to;
	var edgeFromNode = edges.get(data.edges[0]).from;
	var edgeLabel = edges.get(data.edges[0]).label;
	console.log(edgeLabel);
	edges.remove(data.edges[0]);
	deleteNodesChildren(edgeToNode, true);
	deleteNodesChildren(edgeFromNode, true);
	
	for (var i = 0; i < contextCreatedProps.length; i++) {
                            var noNodesInNetwork = true;
                            for (var j = 0; j < nodes.getIds().length; j++) {
                                if (contextCreatedProps[i] == nodes.get(nodes.getIds()[j]).group) {
                                	
                                    noNodesInNetwork = false;
                                }
                            }
                            if (noNodesInNetwork === true) {
                            	
                                givenDiv.querySelector('#' + contextCreatedProps[i]).remove();
                                contextCreatedProps.splice(contextCreatedProps.indexOf(contextCreatedProps[i]), 1);
                                i--;
                            }
                        }
	
	if(edgeLabel[0] == "-"){
	if(await pageExists(edgeToNode) === true){
		await fetch('/w/api.php?action=parse&page='+ edgeToNode +'&prop=wikitext&format=json')
                        .then(response => response.json())
                        .then(data => {
                        var wikiText = data.parse.wikitext['*'];
						console.log(wikiText);
						
                        var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=`+reverseLabel(edgeLabel)+`[\\r\\n]*\\|[\\r\\n]*value=`+edgeFromNode+`[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`
						//var edgeString = '(\\{\\{Semantic\/Element[^}]*[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*[\\r\\n]*\\}[\\r\\n]*\\})'
						var re = new RegExp(edgeString,"g");
                        
                        var edgeStringFound = wikiText.search(re) >= 0;
                        
                        if(edgeStringFound){
                        	if(editDeletedEdges[""+ edgeToNode]){
                        	var newWikiText = editDeletedEdges[""+ edgeToNode].replace(re, "");	
                        	editDeletedEdges[""+ edgeToNode] = newWikiText;
                        	}else{
                        	var newWikiText = wikiText.replace(re, "");
                        	console.log(newWikiText)
                        	editDeletedEdges[""+ edgeToNode] = newWikiText;
                        	}
    						
                        }
                        
                        if(newNodes[""+edgeToNode]){
                        	
                        	var newWikiText = newNodes[""+edgeToNode].replace(re, "");
                        	newNodes[""+edgeToNode] = newWikiText;

                        }
                        
                        if(editNodes[""+edgeToNode]){
                        	
                        	var newWikiText = editNodes[""+edgeToNode].replace(re, "");
                        	editNodes[""+edgeToNode] = newWikiText;
                        	
                        }

                        });}else{
                        	if(network.getConnectedNodes(edgeToNode).length == 0){
                        	delete newNodes[""+edgeToNode];
                        	}else{
                        		var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=`+reverseLabel(edgeLabel)+`[\\r\\n]*\\|[\\r\\n]*value=`+edgeFromNode+`[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`;

                        		var re = new RegExp(edgeString,"g");
                        		var wikiText = newNodes[""+edgeToNode];
                        		var newWikiText = wikiText.replace(re,"");
                        		newNodes[""+edgeToNode] = newWikiText;
                        	}
                        }
	}else{
		if(await pageExists(edgeFromNode) === true){
	await fetch('/w/api.php?action=parse&page='+ edgeFromNode +'&prop=wikitext&format=json')
                        .then(response => response.json())
                        .then(data => {
                        	var wikiText = data.parse.wikitext['*'];
						console.log(wikiText);
						
                        var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=`+edgeLabel+`[\\r\\n]*\\|[\\r\\n]*value=`+edgeToNode+`[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`;
						//var edgeString = '(\\{\\{Semantic\/Element[^}]*[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*[\\r\\n]*\\}[\\r\\n]*\\})'
						var re = new RegExp(edgeString,"g");
                        
                        var edgeStringFound = wikiText.search(re) >= 0;
                        
                        if(edgeStringFound){
                        	if(editDeletedEdges[""+ edgeFromNode]){
                        	var newWikiText = editDeletedEdges[""+ edgeFromNode].replace(re, "");	
                        	editDeletedEdges[""+ edgeFromNode] = newWikiText;
                        	}else{
                        	var newWikiText = wikiText.replace(re, "");
                        	console.log(newWikiText)
                        	editDeletedEdges[""+ edgeFromNode] = newWikiText;
                        	}
    						
                        }
                        
                        if(newNodes[""+edgeFromNode]){
                        	
                        	var newWikiText = newNodes[""+edgeFromNode].replace(re, "");
                        	newNodes[""+edgeFromNode] = newWikiText;

                        }
                        
                        if(editNodes[""+edgeFromNode]){
                        	
                        	var newWikiText = editNodes[""+edgeFromNode].replace(re, "");
                        	editNodes[""+edgeFromNode] = newWikiText;
                        	
                        }

                        	
                        });}else{
                        	if(network.getConnectedNodes(edgeFromNode).length == 0){
                        	delete newNodes[""+edgeFromNode];
                        	}else{
                        		var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=`+edgeLabel+`[\\r\\n]*\\|[\\r\\n]*value=`+edgeToNode+`[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`;

                        		var re = new RegExp(edgeString,"g");
                        		var wikiText = newNodes[""+edgeFromNode];
                        		var newWikiText = wikiText.replace(re,"");
                        		newNodes[""+edgeFromNode] = newWikiText;
                        	}
                        	console.log(newNodes);
                        }
                        
	}
		
	
	
	
	console.log(editDeletedEdges);
	//nodes.remove(edges.get(data.edges[0]).to);
	
	callback(data);
	document.querySelector('.vis-delete').remove();
	console.log(objClickedProps);
    console.log(oldGroups);
}

var editHtml = '' + 

'<div id="node-popUp">' + 
'  <span id="node-operation" style="cursor: move;">node</span> <br />' + 
'  <table style="margin: auto">' + 
'    <tbody>' + 
'      <tr>' + 
'        <td>label</td>' + 
'        <td><input id="node-label" value="" /></td>' + 
'      </tr>' + 
'    </tbody>' + 
'  </table>' + 
'  <input type="button" value="save" id="node-saveButton" />' + 
'  <input type="button" value="cancel" id="node-cancelButton" />' + 
'</div>' +
'' + 
'<div id="edge-popUp">' + 
'  <span id="edge-operation" style="cursor: move;">edge</span> <br />' + 
'  <table style="margin: auto">' + 
'    <tbody>' + 
'      <tr>' + 
'        <td>label</td>' + 
'        <td><input id="edge-label" value="" /></td>' + 
'      </tr>' + 
'    </tbody>' + 
'  </table>' + 
'  <input type="button" value="save" id="edge-saveButton" />' + 
'  <input type="button" value="cancel" id="edge-cancelButton" />' + 
'</div>' +
'';




var editHtmlDiv = document.createElement("div");
editHtmlDiv.innerHTML = editHtml;
document.body.appendChild(editHtmlDiv);







//dragElement(document.getElementById("node-popUp"));
//dragElement(document.getElementById("edge-popUp"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id)) {
  	
    // if present, the header is where you move the DIV from:
    document.getElementById("node-operation").onmousedown = dragMouseDown;
    document.getElementById("edge-operation").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}


        }
    	});
    });

});
