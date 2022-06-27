/*@nomin*/
/* 
DEV: MediaWiki:InteractiveSemanticGraph.js
REL: modules/ext.InteractiveSemanticGraph/InteractiveSemanticGraph.js
hint: ResourceLoader minifier does not ES6 yet, therefore skip minification  with "nomin" (see https://phabricator.wikimedia.org/T255556)
*/

$(document).ready(function() {
    $.getScript('https://unpkg.com/vis-network/standalone/umd/vis-network.min.js').done(function() {
        var pathId = 0;
        var newNodes = {};
        var editNodes = {};
        var editDeletedEdges = {};
        var editDeletedNodes = {};
        var param_nodes_set = false;
        //Draws graph from url
        function read_link(input, nodes, edges, colors, element){
        	param_nodes_set = true;
        	
        	var d_nodes = JSON.parse(atob(searchParams.get("nodes")));
        	var d_edges = JSON.parse(atob(searchParams.get("edges")));
        	
        	input.root = d_nodes[0].id;
        	var prop_array = [];
        	for(var i = 0; i < d_nodes.length;i++ ){
        		nodes.add(d_nodes[i]);
        		if(prop_array.includes(d_nodes[i].group) || d_nodes[i].id == input.root){
        			continue;
        			
        		}else{
        			prop_array.push(d_nodes[i].group);
        			colors.push(d_nodes[i].color);
        		}
        	}
        	input.properties = prop_array;
        	for(var i = 0; i < d_edges.length;i++ ){
        		edges.add(d_edges[i]);
        	}
        	
			searchParams = new URLSearchParams(window.location.search);
			//console.log(JSON.parse(atob(searchParams.get("nodes"))));
			//console.log(JSON.parse(atob(searchParams.get("edges"))));
                	
        }
        $(".InteractiveSemanticGraph").each( function(index) {
            if ($('.InteractiveSemanticGraph').length) { //check if div element(s) exist
            	var defaultOptions = { "root":"", "properties":[], "permalink":false, "edit":false, "hint":false };
                var userOptions = {};
            	if(this.innerHTML !== "") {//ToDo: use data attributes
            		var userOptions = JSON.parse(this.innerHTML);	
            	}
                var input = {...defaultOptions, ...userOptions};
            	input.depth = parseInt(input.depth);
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
                var curr_element = this.innerHTML;

		        searchParams = new URLSearchParams(window.location.search);
		        if((searchParams.has('nodes') &&  !(searchParams.get('nodes') === "")) || input.data){
		        	if(input.data){
		        	input.data = input.data.replaceAll("&amp;", "&");
		        	window.history.replaceState(null, document.title, input.data);}
		        	searchParams = new URLSearchParams(window.location.search);
		        	read_link(input, nodes, edges, colors, curr_element);
		        }
				//Function for random colors
                var h = Math.random();
                var golden = 0.618033988749895;

                function randomHSL() {
                    h += golden;
                    h %= 1;
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
				if(param_nodes_set === false){
                	nodes.add({
                    id: input.root,
                    label: input.root, //todo: query display title
                    color: '#6dbfa9'
                	});
				}
                //Creates API query Url with the given root and properties
                function createUrl(root, properties) {
                	if (properties[0] === "-Category") properties[0] = "Category";
                	else if (root.startsWith("Category:")) root = ":" + root; //[[Category:X]] queries pages within this category, [[:Category:X]] the category itself
                    var url = `/w/api.php?action=ask&query=[[${encodeURIComponent(root)}]]`;
                    var propertiesVar = '';
                    for (var i = 0; i < properties.length; i++) {
                        propertiesVar += '|?' + encodeURIComponent(properties[i]) + "=" + encodeURIComponent(properties[i]); //explicit label overwrites property display title. ToDo: extrakt label in result and get corresponding printout
                        propertiesVar += '|?' + encodeURIComponent(properties[i] + ".Display title of") + "=" + encodeURIComponent(properties[i] + ".Display title of"); //explicit query for display title due to slow update of the displaytitle page field 
                    }
                    url = url + propertiesVar + '&format=json';
                    return url;
                }

                function uuidv4() {
                    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    );
                }

                //Makes an API call with the given parameters and adds the results to the nodes and edges datasets.
                //With a given nodeID the edges are set to the nodeID, else they are set to the root node.
                var first_call = true;
                function fetchData(root, properties, nodeID, setGroup, setColor) {
                    if (nodes.get(root).isLiteral) return false; //don't query on literals
                    fetch(createUrl(root, properties))
                        .then(response => response.json())
                        .then(data => {
                            if (!nodeID && root) { //first query on root node
                                var rootNode = nodes.get(root);
                                rootNode.url = data.query.results[root].fullurl;
                                if (data.query.results[root].displaytitle) rootNode.label = data.query.results[root].displaytitle;
                            }

                            for (var i = 0; i < properties.length; i++) {

                                for (var j = 0; j < data.query.results[root].printouts[properties[i]].length; j++) {

                                    //define colors
                                    if (!(properties[i] in legendColors) && setColor) {
                                        legendColors[properties[i]] = colors[i];
                                    } else {
                                        setColor = legendColors[properties[i]];
                                        colors[i] = legendColors[properties[i]];
                                        colors[i] = legendColors[properties[i]];
                                    }
                                    //define id and label. use displaytitle if available. Use string representation of non-page properties
                                    var id = uuidv4(); //default: UUID
                                    var label = "";
                                    var isLiteral = true;
                                    if (data.query.results[root].printouts[properties[i]][j].fulltext) {
                                        if (data.query.results[root].printouts[properties[i]][j].exists === "1") {
                                            id = data.query.results[root].printouts[properties[i]][j].fulltext; //use pagename as id for pages
                                            isLiteral = false;
                                        }
                                        else label = data.query.results[root].printouts[properties[i]][j].fulltext; //treat non existing pages as literals
                                    }
                                    else if (data.query.results[root].printouts[properties[i]][j].value) label = '' + data.query.results[root].printouts[properties[i]][j].value + ' ' + data.query.results[root].printouts[properties[i]][j].unit; //quantity
                                    else if (data.query.results[root].printouts[properties[i]][j].timestamp) label = new Date(data.query.results[root].printouts[properties[i]][j].timestamp*1000).toISOString(); //datetime
                                    else label = data.query.results[root].printouts[properties[i]][j].toString(); //other literals
                                    if (data.query.results[root].printouts[properties[i]][j].displaytitle) label = data.query.results[root].printouts[properties[i]][j].displaytitle; //use display title of pages
                                    if (data.query.results[root].printouts[properties[i] + ".Display title of"][j]) label = data.query.results[root].printouts[properties[i] + ".Display title of"][j]; //explicit use property display title due to slow update of the displaytitle page field
                                    if (label === "") label = id; //default label is id
                                    var color = colors[i];
                                    if (isLiteral) color = setColor = "#FFFFFF";
                                    var shape = image = "undefined";
                                    if (id.includes("File:") && (id.includes(".png") || id.includes(".jpeg") || id.includes(".jpg") || id.includes(".tif") || id.includes(".pdf") || id.includes(".bmp") || id.includes(".svg") || id.includes(".gif")) ) {
                                        image = `/w/index.php?title=Special:Redirect/file/${id.replace("File:","")}&width=200&height=200`;
                                        shape = "image";
                                        label = "";
                                    }
                                    if (isLabelSet(id) === false) { //test if node with id exists
                                        if (setGroup && setColor) {
                                            nodes.add({
                                                id: id,
                                                label: label,
                                                color: setColor,
                                                group: setGroup[0],
                                                hidden: false,
                                                url: data.query.results[root].printouts[properties[i]][j].fullurl,
                                                oncontext: true,
                                                isLiteral: isLiteral,
                                                image: image,
                                                shape: shape,
                                            });
                                            oldGroups["" + id] = setGroup[0];
                                        } else {
                                            nodes.add({
                                                id: id,
                                                label: label,
                                                color: color,
                                                group: properties[i],
                                                hidden: false,
                                                url: data.query.results[root].printouts[properties[i]][j].fullurl,
                                                isLiteral: isLiteral,
                                                image: image,
                                                shape: shape,
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
                            create_link();
                            if(first_call && input.depth){
                            	var first_nodes = nodes.getIds()
                            	first_nodes = first_nodes.slice(1);
                            	getStartIds(first_nodes); 
                            	first_call = false;
                            }
                            return true;
                        });
                }
                if(param_nodes_set === false){
                fetchData(input.root, input.properties);}
                // create a network
                var container = this; //document.getElementById("InteractiveSemanticGraph");
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
                        enabled: input.edit,
                        editEdge: false,
                        deleteNode: function(data, callback) {
                            deleteSelectedNode(data, callback)
                        }.bind(this),
                        deleteEdge: function(data, callback) {
                            deleteSelectedEdge(data, callback)
                        }.bind(this),
                        addNode: function(data, callback) {
                            // filling in the popup DOM elements
                            document.getElementById("node-operation").innerText = "Add Node";
                            dragElement(document.getElementById("node-popUp"));
                            editNode(data, clearNodePopUp, callback);
                        },
                        addEdge: function(data, callback) {
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
                var nodes_opened = [];
                
                /*function isFetched(node){
                	return new Promise( function(resolve){
                					setTimeout(() => {
											          fetchData(node, input.properties, node);console.log(nodes.getIds());
											          }, 2000)
                					//console.log(node);
									resolve(true);
                });}*/
                
                nodes_opened.push(input.root);
                var loop_counter = 0;
                async function getStartIds(node){
                	
                	//console.log(node);
                		var start_nodes = node;//network.getConnectedNodes(node);
                		//console.log(start_nodes)
                	//nodes_opened.push(start_nodes);
                	for(var i = 0; i < start_nodes.length; i++){
                		if(nodes_opened.includes(start_nodes[i])){/*console.log(start_nodes[i]);*/ continue;}
                		nodes_opened.push(start_nodes[i]);
                		/*await isFetched(start_nodes[i]).then(function(response){
                			console.log(response);
                		});*/
                		fetchData(start_nodes[i], input.properties, start_nodes[i]);
                		//console.log(fetched);
                		
                	}
                	//console.log(nodes_opened);
                	setTimeout(() => {
                				if(loop_counter == input.depth-1)return;
                				loop_counter++;
					          var new_nodes_loop = nodes.getIds();
					          //console.log(new_nodes_loop);
					          getStartIds(new_nodes_loop);
					          }, 300)

                	//getStartIds(nodes.getIds());
                	//console.log(nodes.getIds());
                	//getStartIds(start_nodes[1]);
                	
                }
				//The function getAllEdgesBetween() returns all edges between two nodes
                function getAllEdgesBetween(node1, node2) {
                    return edges.get().filter(function(edge) {
                        return (edge.from === node1 && edge.to === node2) || (edge.from === node2 && edge.to === node1);
                    });
                }
                
                //Cartesian Product of arrays
                function cartesianProduct(arr) {
				    return arr.reduce(function(a,b){
				        return a.map(function(x){
				            return b.map(function(y){
				                return x.concat([y]);
				            })
				        }).reduce(function(a,b){ return a.concat(b) },[])
				    }, [[]])
				}
				//Cartesian Product of given arrays
                function getAllCombs(arrays) {
                	var allCombs = cartesianProduct(arrays);
                    return allCombs;
                }
				//Gets Path array with nodes, returns Cartesian Product  of edges
                function getEdgePathsForPath(path) {
                    var arraysOfEdgesForNodeInPath = [];
                    for (var i = 1; i < path.length; i++) {
                        var edgesBetween = getAllEdgesBetween(path[i - 1], path[i]);
                        var localedgesBetween = edgesBetween.slice();
                        
                        arraysOfEdgesForNodeInPath.push(localedgesBetween);
                    }
                    var allEdgePaths = getAllCombs(arraysOfEdgesForNodeInPath);
                    return allEdgePaths;
                }
				//Given Label is reversed with "-" or "-" is removed
                function reverseLabel(label) {
                    if (label[0] == "-") {
                        return label.substring(1);
                    } else {
                        return "-" + label;
                    }
                }
				//Gets Path array with nodes, returns all possible edge paths
                function getEdgeLabelStringsForPath(path) {
                    var allEdgePaths = getEdgePathsForPath(path);
                    var allStrings = new Array(allEdgePaths.length);
                    for (var i = 0; i < allEdgePaths.length; i++) {
                        var s = "";
                        for (var j = 0; j < allEdgePaths[i].length; j++) {
                            var edge = allEdgePaths[i][j];
                            var label = edge.label;
                            var nodeId1 = path[j];
                            var nodeId2 = path[j + 1];
                            if (edge.to == nodeId1 && edge.from == nodeId2) {
                                label = reverseLabel(label);
                            }
                            if (j == (allEdgePaths[i].length - 1)) {
                                s = s + label;
                            } else {
                                s = s + label + ".";
                            }
                        }
                        allStrings[i] = s;
                    }
                    return allStrings;
                }
				//Gets Path arrays with nodes, returns all possible edge paths
                function getAllStringsForAllPaths(paths) {
                    var arrayOfAllStrings = [];
                    for (var i = 0; i < paths.length; i++) {
                        var path = paths[i];
                        var allStrings = getEdgeLabelStringsForPath(path);
                        arrayOfAllStrings.push(allStrings);
                    }
                    return arrayOfAllStrings;
                }
				//Removes the given value from the given array
                function removeItem(arr, value) {
                    var index = arr.indexOf(value);
                    if (index > -1) {
                        arr.splice(index, 1);
                    }
                    return arr;
                }
				//Returns all paths between startNode and endNode
                function findAllPaths(startNode, endNode) {
                    var visitedNodes = [];
                    var currentPath = [];
                    var allPaths = [];
                    dfs(startNode, endNode, currentPath, allPaths, visitedNodes);
                    return allPaths;
                }
				//Algorithm to search for all paths between two nodes
                function dfs(start, end, currentPath, allPaths, visitedNodes) {
                    if (visitedNodes.includes(start)) return;
                    visitedNodes.push(start);
                    currentPath.push(start);
                    if (start == end) {
                        var localCurrentPath = currentPath.slice();
                        allPaths.push(localCurrentPath);
                        removeItem(visitedNodes, start);
                        currentPath.pop();
                        return;
                    }
                    var neighbours = network.getConnectedNodes(start);
                    for (var i = 0; i < neighbours.length; i++) {
                        var current = neighbours[i];
                        dfs(current, end, currentPath, allPaths, visitedNodes);
                    }
                    currentPath.pop();
                    removeItem(visitedNodes, start);
                }
                //Algorithm that gets all nodes that are reachable from the given node in the graph 
                function getAllReachableNodesTo(nodeId, excludeIds, reachableNodes) {
                    if (reachableNodes.includes(nodeId) || excludeIds.includes(nodeId)) {
                        return;
                    }
                    var children = network.getConnectedNodes(nodeId);
                    reachableNodes.push(nodeId);
                    for (var i = 0; i < children.length; i++) {
                        getAllReachableNodesTo(children[i], excludeIds, reachableNodes);
                        //if(excludeIds.includes(children[i]))continue;
                        //reachableNodes.push(children[i]);
                    }
                }
				//This function deletes all children of a given node.
                function deleteNodesChildren(nodeId, deleteEdge) {
                    var excludedIds = [];
                    if (deleteEdge === true) {
                        console.log("deleteEdge true")
                    } else {
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
				//Deletes all edges from given node
                function deleteEdges(nodeID) {
                    var fromEdges = edges.get({
                        filter: function(item) {
                            return item.from == nodeID;
                        }
                    });
                    for (var j = 0; j < fromEdges.length; j++) {
                        edges.remove(fromEdges[j]);
                    }
                }
                var nodesClicked = [];
                var tip = '<p><strong>Hinweis:</strong> Um sich einen Pfad zwischen zwei Knoten ausgeben zu lassen, <em>Strg</em> gedrückt halten und die gewünschten zwei Knoten mit der <em>linken Maustaste</em> anklicken. </p>'
                if (input.hint) this.insertAdjacentHTML('afterbegin', tip);
                //Ctrl and click on two nodes, puts out all possible paths between the two nodes under the tip
                network.on("click", function(params) {
                    if (params.nodes[0] && params.event.srcEvent.ctrlKey) {
                        if (nodesClicked.length < 2) {
                            nodesClicked.push(params.nodes[0]);
                        }
                        if (nodesClicked.length == 2 && nodesClicked[0] != nodesClicked[1]) {
                            var foundPaths = findAllPaths(nodesClicked[0], nodesClicked[1]);
                            //.querySelector('[id^="poll-"]').id;
                            if (document.querySelectorAll('[id^="fullPath"]')) {
                                for (var i = 0; i < document.querySelectorAll('[id^="fullPath"]').length; i++) {
                                    document.querySelectorAll('[id^="fullPath"]')[i].remove();
                                }
                            }
                            var element = '<div id="fullPath' + pathId + '"></div>'
                            givenDiv.children[0].insertAdjacentHTML('afterend', element);
                            var allStringsArray = getAllStringsForAllPaths(foundPaths);
                            var stringDiv = givenDiv.querySelector('#fullPath' + pathId);
                            if (foundPaths.length == 1) {
                                stringDiv.innerHTML = "<strong>Gefundener Pfad:</strong><br>"
                            } else {
                                stringDiv.innerHTML = "<strong>Gefundene Pfade:</strong><br>"
                            }
                            for (var s = 0; s < foundPaths.length; s++) {
                                if (foundPaths.length == 1) {
                                    var pathNumb = ""
                                } else {
                                    var pathNumb = "<strong>" + (s + 1) + ". Pfad:</strong> <br>"
                                }
                                stringDiv.innerHTML += pathNumb + "<strong>Knoten: </strong>";
                                for (var t = 0; t < foundPaths[s].length; t++) {
                                    var currentFoundPath = foundPaths[s][t];
                                    if (t == (foundPaths[s].length - 1)) {
                                        stringDiv.innerHTML = stringDiv.innerHTML + currentFoundPath + " ";
                                    } else {
                                        stringDiv.innerHTML = stringDiv.innerHTML + currentFoundPath + " - ";
                                    }
                                }
                                stringDiv.innerHTML += "<br>"
                                stringDiv.innerHTML += "<strong>Kanten:</strong><br>"
                                for (var t = 0; t < allStringsArray[s].length; t++) {
                                    var currentString = allStringsArray[s][t];
                                    var currentFoundPath = foundPaths[s][t];
                                    var stringDiv = givenDiv.querySelector('#fullPath' + pathId);
                                    stringDiv.innerHTML = stringDiv.innerHTML + '&#9679; ' + currentString + '<br>';
                                }
                                stringDiv.innerHTML += "<br>"
                            }
                            nodesClicked = [];
                        }
                        if (nodesClicked[0] === nodesClicked[1] || nodesClicked.length > 2) {
                            nodesClicked = [];
                        }
                    }
                    pathId++;
                });
                $(document).keyup(function(event) {
                    if (!event.ctrlKey) {
                        nodesClicked = [];
                    }
                });
                var contextCreatedProps = [];
                
                network.on("doubleClick", function(params) {
                    if (params.nodes[0]) {
                    	//Checks if all node children are created from context menu or manually, if so it creates nodes for before defined properties else it deletes all children
                        var conManNodes = network.getConnectedNodes(params.nodes[0], 'to');
                        var onlyConManNodes = true;
                        for (var i = 0; i < conManNodes.length; i++) {
                            if (!(nodes.get(conManNodes[i]).oncontext || nodes.get(conManNodes[i]).manually)) {
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
                            create_link();
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
                function setNodeVisibilityByVisiblePath(nodeId, rootNodeId) {
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
                    node.physics = !node.hidden; //disable physics for hidden nodes
                    return !node.hidden;
                }

                function legendFunctionality() {
                    var legendGroup;
                    var group;
                    var nodeChildren;
                    legendGroup = this.parentNode.childNodes[1].innerHTML;
                    var strategy = "strategy2"
                    if (strategy == "strategy2") {
                        //A node is visible if at least one path over visible edges to the root node exists.
                        options.groups[legendGroup].hidden = !options.groups[legendGroup].hidden; //toggle state
                        if (options.groups[legendGroup].hidden) this.parentNode.childNodes[1].style.background = '#FFFFFF';
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
                //On a node right click it puts out all properties of the clicked node and a link to the node wiki-page
                network.on("oncontext", function(params) {
                    params.event.preventDefault();
                    var timeNow = Date.now();
                    var timeDiff = timeNow - start
                    if (timeDiff > 300) {
                        start = Date.now();
                        console.log(nodes.get(network.getNodeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })));
                        //console.log(edges.get(network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })));
                        $('.custom-menu').each(function(index) {
                            while (this.lastElementChild) {
                                this.removeChild(this.lastElementChild);
                            }
                        });
                        if (!(network.getEdgeAt({
                                x: params.pointer.DOM.x,
                                y: params.pointer.DOM.y
                            }) && network.getNodeAt({
                                x: params.pointer.DOM.x,
                                y: params.pointer.DOM.y
                            }))) {
                            if (edges.get(network.getEdgeAt({
                                    x: params.pointer.DOM.x,
                                    y: params.pointer.DOM.y
                                })).from) {
                                params.event.preventDefault();
                                if (edges.get(network.getEdgeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).label == 'Category') {
                                    var li = document.createElement("li");
                                    li.innerHTML = '' + '\uD83D\uDD17' + ' ' + edges.get(network.getEdgeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).to;
                                    li.addEventListener("click", function NewTab() {
                                        window.open('/wiki/' + edges.get(network.getEdgeAt({
                                            x: params.pointer.DOM.x,
                                            y: params.pointer.DOM.y
                                        })).to);
                                    });
                                    ul.prepend(li);
                                } else {
                                    var li = document.createElement("li");
                                    li.innerHTML = '' + '\uD83D\uDD17' + ' ' + edges.get(network.getEdgeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    })).label;
                                    li.addEventListener("click", function NewTab() {
                                        window.open('/wiki/' + 'Property:' + edges.get(network.getEdgeAt({
                                            x: params.pointer.DOM.x,
                                            y: params.pointer.DOM.y
                                        })).label);
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
                            const nodeID = nodes.get(network.getNodeAt({
                                x: params.pointer.DOM.x,
                                y: params.pointer.DOM.y
                            })).id;
                            var subject = nodeID.split("#")[0];
                            var subObject = "";
                            if (nodeID.split("#")[1]) {
                                subObject = nodeID.split("#")[1].replace(" ", "_");
                            }
                            var namespace_id = 0;
                            if (subject.split(":")[1]) {
                            	const namespace = subject.split(":")[0];
                            	subject = subject.split(":")[1];
                            	namespace_id = mw.config.get('wgNamespaceIds')[namespace.replaceAll(" ","_").toLowerCase()];
                            	//console.log(`Namespace ${namespace}, ID ${namespace_id}`);
                            }
                            
                            //inverse properties are only available in html format
                            const query = `/w/api.php?action=smwbrowse&browse=subject&params={"subject":"${encodeURIComponent(subject)}","subobject":"${subObject}","options":{"showAll":"true"}, "ns":${namespace_id}, "type":"html"}&format=json`;
                            fetch(query)
                                .then(response => response.json())
                                .then(data => {
                                    var selected_node = nodes.get(network.getNodeAt({
                                        x: params.pointer.DOM.x,
                                        y: params.pointer.DOM.y
                                    }));
                                    if (selected_node.url) {
                                        var li = document.createElement("li");
                                        li.innerHTML = '' + '\uD83D\uDD17' + ' ' + selected_node.label;
                                        li.addEventListener("click", function NewTab() {
                                            window.open(selected_node.url);
                                        });
                                        ul.prepend(li);
                                    }
                                    var page_properties = [];
                                    $html = $(data.query);
                                    $html.find("div.smwb-propvalue").each(function() {
                                        $prop = $(this).find("div.smwb-prophead a");
                                        //var propName = $prop.text();
                                        //var propName = $prop.attr('title').replace("Property:", "");
                                        var propName = "";
                                        if ($prop.attr('title') === "Special:Categories") propName += "Category";
                                        else if ($prop.attr('title') === "Special:ListRedirects") return;
                                        else if ($prop.attr('href')) propName += $prop.attr('href').split("Property:")[1].split("&")[0];
                                        else return; //empty property
                                        page_properties.push(propName);
                                        //console.log(propName);
                                        $(this).find("div.smwb-propval span.smwb-value").each(function() {
                                            var value = $(this).find("a").attr("title");
                                            //console.log("-> " + value);
                                        });
                                        create_link();
                                    })
                                    $html.find("div.smwb-ipropvalue").each(function() {
                                        $prop = $(this).find("div.smwb-prophead a");
                                        //var propName = $prop.text();
                                        //var propName = $prop.attr('title').replace("Property:", "");
                                        var propName = "-";
                                        if ($prop.attr('title') === "Special:Categories") propName += "Category";
                                        else if ($prop.attr('title') === "Special:ListRedirects") return;
                                        else if ($prop.attr('href')) propName += $prop.attr('href').split("Property:")[1].split("&")[0];
                                        else return; //empty property
                                        page_properties.push(propName);
                                        //console.log(propName);
                                        $(this).find("div.smwb-propval span.smwb-ivalue").each(function() {
                                            var value = $(this).find("a").attr("title");
                                            //console.log("-> " + value);
                                        });
                                        create_link();
                                    })
                                    for (var i = 0; i < page_properties.length; i++) {
                                        if (!page_properties[i].startsWith("_")) {
                                            var li = document.createElement("li");
                                            li.dataset.action = page_properties[i].replaceAll('_', ' ');
                                            li.innerHTML = page_properties[i].replaceAll('_', ' ');
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
	                        		//On left click on one of the properties it creates nodes for the clicked property and if the legend doesnt have that property as a legend entry it is created
                                    $(".custom-menu li").click(function() {
                                        var clickedProperty = [$(this).attr("data-action")]
                                        var clickedPropertyColor = randomHSL();
                                        if (!(clickedProperty in legendColors)) {
                                            legendColors[clickedProperty] = clickedPropertyColor;
                                        } else {
                                            clickedPropertyColor = legendColors[clickedProperty];
                                        }
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
                // If the document is clicked somewhere it hides the context menu
                $(document).bind("mousedown", function(e) {
                    // If the clicked element is not the menu
                    if (!$(e.target).parents(".custom-menu").length > 0) {
                        // Hide it
                        $(".custom-menu").hide(100);
                    }
                });
				//Add Node popup
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
                        if (newNodeActive === true) {
                            $("#node-popUp").css({
                                top: e.pageY + "px",
                                left: e.pageX + "px",
                                display: "block"
                            });
                        }
                        newNodeActive = false;
                    });
                }
				
                function clearNodePopUp() {
                    document.getElementById("node-saveButton").onclick = null;
                    document.getElementById("node-cancelButton").onclick = null;
                    document.getElementById("node-popUp").style.display = "none";
                }

                function cancelNodeEdit(callback) {
                    clearNodePopUp();
                    callback(null);
                }
				//saveNodeData to the graph
                function saveNodeData(data, callback) {
                    data.label = document.getElementById("node-label").value;
                    data.id = document.getElementById("node-label").value;
                    data.hidden = false;
                    data.physics = false;
                    document.getElementById("node-label").value = "";
                    clearNodePopUp();
                    callback(data);
                    create_link();
                }
				//addEdge popup
                function editEdgeWithoutDrag(data, callback) {
                    var newEdgeActive = true;
                    // filling in the popup DOM elements
                    document.getElementById("edge-label").value = data.label;
                    
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
                        if (newEdgeActive === true) {
                            $("#edge-popUp").css({
                                top: e.pageY + "px",
                                left: e.pageX + "px",
                                display: "block"
                            });
                        }
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

                function isLabelReversed(label) {
                    if (label[0] == "-") {
                        return true;
                    } else {
                        return false;
                    }
                }
                var pageBool;
                //Checks if page exists in the wiki
                async function pageExists(id) {
                    await fetch('/w/api.php?action=parse&page=' + id + '&prop=wikitext&format=json')
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                pageBool = false;
                            } else {
                                pageBool = true;
                            }
                        })
                    return pageBool;
                }
                var wikiText = "";
                var semantic = "";
                //Splits Wikitext and Semantic/Element or Semantic/Link
                async function editWikiText(node) {
                    await fetch('/w/api.php?action=parse&page=' + node + '&prop=wikitext&format=json')
                        .then(response => response.json())
                        .then(data => {
                            wikiText = data.parse.wikitext['*'];
                            semantic = "";
                            if (wikiText.search(/(\{\{Semantic\/[^}]*[\r\n]*\}[\r\n]*\})/g) >= 0) {
                                //var edgeStringFound = wikiText.search(re) >= 0;
                                const found = wikiText.match(/(\{\{Semantic\/[^}]*[\r\n]*\}[\r\n]*\})/g);
                                var newWikiText = wikiText;
                                for (var i = 0; i < found.length; i++) {
                                    if (i == found.length - 1) {
                                        semantic += found[i];
                                        newWikiText = newWikiText.replace(/(\{\{Semantic\/[^}]*[\r\n]*\}[\r\n]*\}[\r\n]*\}[\r\n]*\})/g, "");
                                        newWikiText = newWikiText.replace(/(\{\{Semantic\/Link[^}]*[\r\n]*\}[\r\n]*\})/g, "");
                                    } else {
                                        semantic += found[i];
                                        newWikiText = newWikiText.replace(found[i], "");
                                    }
                                }
                                wikiText = newWikiText;
                            }
                        });
                    return [semantic, wikiText];
                }
                //Save button on create edge popup
                async function saveEdgeData(data, callback) {
                	//Sets various options to the nodes that the edge gets connected
                    if (typeof data.to === "object") data.to = data.to.id;
                    if (typeof data.from === "object") data.from = data.from.id;
                    data.label = document.getElementById("edge-label").value;
                    options.groups[data.label] = {
                        hidden: false
                    };
                    var toNode = nodes.get(data.to);
                    var fromNode = nodes.get(data.from);
                    fromNode.physics = true;
                    toNode.physics = true;
                    delete fromNode.x;
                    delete fromNode.y;
                    delete toNode.x;
                    delete toNode.y;
                    if (!toNode.group) {
                        toNode.group = data.label
                    }
                    if (!fromNode.group) {
                        fromNode.group = data.label
                    }
                    if (legendColors[data.label]) {
                        data.color = legendColors[data.label];
                    } else {
                        data.color = randomHSL();
                    }
                    if (!toNode.color) {
                        toNode.color = data.color;
                        toNode.manually = true;
                    }
                    if (!fromNode.color) {
                        fromNode.color = data.color;
                        fromNode.manually = true;
                    }
                    //If the given property is not set in the legend, a legend entry is created
                    if (!(contextCreatedProps.includes(data.label) || input.properties.includes(data.label))) {
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
                    //Creates new wikitext that will be saved after the save button is clicked
                    if (isLabelReversed(data.label)) {
                        if (await pageExists(fromNode.id) === false) {
                            if (!(newNodes[fromNode.id])) {
                                newNodes[fromNode.id] = '' + '{{Semantic/Element' +
                                    '|label=' + fromNode.label +
                                    '|description=test' +
                                    '|relations=';
                            }
                        }
                        if (await pageExists(toNode.id) === true) {
                            var splitWikiText = await editWikiText(toNode.id);
                            if (editNodes[toNode.id]) {
                                editNodes[toNode.id] += '' + '{{Semantic/Link' +
                                    '|property=' + reverseLabel(data.label) +
                                    '|value=' + fromNode.id +
                                    '}}' + '';
                            } else {
                                if (splitWikiText[0].search(/(\{\{Semantic\/Element[^}]*[\r\n]*\}[\r\n]*\})/g) >= 0) {
                                    editNodes[toNode.id] = splitWikiText[1] + splitWikiText[0] + '{{Semantic/Link' +
                                        '|property=' + reverseLabel(data.label) +
                                        '|value=' + fromNode.id +
                                        '}}' + '';
                                } else {
                                    editNodes[toNode.id] = splitWikiText[1] + '{{Semantic/Element' +
                                        '|label=' + toNode.label +
                                        '|description=test' +
                                        '|relations=' +
                                        '{{Semantic/Link' +
                                        '|property=' + reverseLabel(data.label) +
                                        '|value=' + fromNode.id +
                                        '}}' + '' + splitWikiText[0];
                                }
                            }
                        } else {
                            if (newNodes[toNode.id]) {
                                newNodes[toNode.id] += '' + '{{Semantic/Link' +
                                    '|property=' + reverseLabel(data.label) +
                                    '|value=' + fromNode.id +
                                    '}}' + '';
                            } else {
                                newNodes[toNode.id] = '' + '{{Semantic/Element' +
                                    '|label=' + toNode.label +
                                    '|description=test' +
                                    '|relations={{Semantic/Link' +
                                    '|property=' + reverseLabel(data.label) +
                                    '|value=' + fromNode.id +
                                    '}}' +
                                    '';
                            }
                        }
                    } else {
                        if (await pageExists(toNode.id) === false) {
                            if (!(newNodes[toNode.id])) {
                                newNodes[toNode.id] = '' + '{{Semantic/Element' +
                                    '|label=' + toNode.label +
                                    '|description=test' +
                                    '|relations=';
                            }
                        }
                        if (await pageExists(fromNode.id) === true) {
                            var splitWikiText = await editWikiText(fromNode.id);
                            if (editNodes[fromNode.id]) {
                                editNodes[fromNode.id] += '' + '{{Semantic/Link' +
                                    '|property=' + data.label +
                                    '|value=' + toNode.id +
                                    '}}' + '';
                            } else {
                                if (splitWikiText[0].search(/(\{\{Semantic\/Element[^}]*[\r\n]*\}[\r\n]*\})/g) >= 0) {
                                    editNodes[fromNode.id] = splitWikiText[1] + splitWikiText[0] + '{{Semantic/Link' +
                                        '|property=' + data.label +
                                        '|value=' + toNode.id +
                                        '}}' + '';
                                } else {
                                    editNodes[fromNode.id] = splitWikiText[1] + '{{Semantic/Element' +
                                        '|label=' + fromNode.label +
                                        '|description=test' +
                                        '|relations=' +
                                        '{{Semantic/Link' +
                                        '|property=' + data.label +
                                        '|value=' + toNode.id +
                                        '}}' + '' + splitWikiText[0];
                                }
                            }
                        } else {
                            if (newNodes[fromNode.id]) {
                                newNodes[fromNode.id] += '' + '{{Semantic/Link' +
                                    '|property=' + data.label +
                                    '|value=' + toNode.id +
                                    '}}' + '';
                            } else {
                                newNodes[fromNode.id] = '' + '{{Semantic/Element' +
                                    '|label=' + fromNode.label +
                                    '|description=test' +
                                    '|relations={{Semantic/Link' +
                                    '|property=' + data.label +
                                    '|value=' + toNode.id +
                                    '}}' +
                                    '';
                            }
                        }
                    }
                    //console.log(toNode);
                    //console.log(fromNode);
                    //console.log(editNodes);
                    //console.log(newNodes);
                    clearEdgePopUp();
                    callback(data);
                    network.setOptions(options);
                    network.body.emitter.emit('_dataChanged');
                    network.redraw();
                    create_link();
                }
                //save button
                var saveBtn = document.createElement("button");
                saveBtn.addEventListener("click", saveGraphChanges);
                saveBtn.innerHTML = "Save changes";
                saveBtn.style.width = "auto";
                saveBtn.style.height = "auto";
                if (input.edit) givenDiv.appendChild(saveBtn);
                
                searchParams = new URLSearchParams(window.location.search);
				var requested = searchParams.has('permalink') && searchParams.get('permalink') === 'true';
				

                var copy_button = document.createElement("button");
                copy_button.addEventListener("click", copy_link_data);
                copy_button.innerHTML = "Copy permalink";
                copy_button.style.width = "auto";
                copy_button.style.height = "auto";
                if(requested || input.permalink === "true" || searchParams.has('nodes')){
                givenDiv.appendChild(copy_button);
                }
                
            	function copy_link_data() {
            	  searchParams = new URLSearchParams(window.location.search);
				  // variable content to be copied
				  var copyText = "" + "?&nodes=" + searchParams.get("nodes") + "&edges=" + searchParams.get("edges")
				  // create an input element
				  let input = document.createElement('input');
				  // setting it's type to be text
				  input.setAttribute('type', 'text');
				  // setting the input value to equal to the text we are copying
				  input.value = copyText;
				  // appending it to the document
				  document.body.appendChild(input);
				  // calling the select, to select the text displayed
				  // if it's not in the document we won't be able to
				  input.select();
				  // calling the copy command
				  document.execCommand("copy");
				  // removing the input from the document
				  document.body.removeChild(input)
				}
				

                function create_link(){
                	
                	searchParams = new URLSearchParams(window.location.search);
					var requested = searchParams.has('permalink') && searchParams.get('permalink') === 'true';
                	
            		if(requested || input.permalink === "true" || searchParams.has('nodes')){
            		if(!searchParams.has('nodes')){
            		window.history.replaceState(null, document.title, "?&nodes=&edges");}
            		searchParams = new URLSearchParams(window.location.search);
					var e_nodes = btoa(JSON.stringify(nodes.get()));
					var e_edges = btoa(JSON.stringify(edges.get()));
					
					searchParams.set("nodes", "" + e_nodes);
					searchParams.set("edges", "" + e_edges);
					
					
					window.history.pushState({}, '', "?&" + searchParams);
            		}
					//window.location.search = searchParams.append('#', '42');
                }
                
				
				//Called on save button click. Creates new wiki pages or edits them with the created wiki text.
                function saveGraphChanges() {
                    var alertString = "";
                    OO.ui.confirm('Änderungen übernehmen?').done(async function(confirmed) {
                        if (confirmed) {
                            for (const [key, value] of Object.entries(newNodes)) {
                                var params = {
                                        action: 'edit',
                                        title: '' + key,
                                        appendtext: '' + value + '}}',
                                        format: 'json'
                                    },
                                    api = new mw.Api();
                                await api.postWithToken('csrf', params).done(function(data) {
                                    console.log(data);
                                    alertString += "Seite " + key + " erstellt!\r\n"
                                });
                            }
                            for (const [key, value] of Object.entries(editNodes)) {
                                var params = {
                                        action: 'edit',
                                        title: '' + key,
                                        text: '' + value + '}}',
                                        format: 'json'
                                    },
                                    api = new mw.Api();
                                await api.postWithToken('csrf', params).done(function(data) {
                                    console.log(data);
                                    alertString += "Seite " + key + " bearbeitet!\r\n"
                                });
                            }
                            for (const [key, value] of Object.entries(editDeletedEdges)) {
                                var params = {
                                        action: 'edit',
                                        title: '' + key,
                                        text: '' + value,
                                        format: 'json'
                                    },
                                    api = new mw.Api();
                                await api.postWithToken('csrf', params).done(function(data) {
                                    console.log(data);
                                    alertString += "Auf der Seite " + key + " wurde ein Attribut gelöscht!\r\n"
                                });
                            }
                            for (const [key, value] of Object.entries(editDeletedNodes)) {
                                var params = {
                                        action: 'delete',
                                        title: '' + key,
                                        format: 'json'
                                    },
                                    api = new mw.Api();
                                await api.postWithToken('csrf', params).done(function(data) {
                                    console.log(data);
                                    alertString += "Seite " + key + " wurde gelöscht!\r\n"
                                });
                            }
                            // Example: Customize the displayed actions at the time the window is opened.
                            var messageDialog = new OO.ui.MessageDialog();
                            // Create and append a window manager.
                            var windowManager = new OO.ui.WindowManager();
                            $('body').append(windowManager.$element);
                            // Add the dialog to the window manager.
                            windowManager.addWindows([messageDialog]);
                            // Configure the message dialog when it is opened with the window manager's openWindow() method.
                            windowManager.openWindow(messageDialog, {
                                title: 'Folgende Änderugnen wurden übernommen:',
                                message: '' + alertString,
                                verbose: true,
                                actions: [{
                                    action: 'accept',
                                    label: 'Okay',
                                    flags: 'primary'
                                }]
                            });
                            /*OO.ui.alert( "" + alertString ).done( function () {
                                console.log( alertString );
                            } );*/
                        } else {}
                    });
                    create_link();
                }
				//Deletes node in manipulation mode and the wiki page.
                function deleteSelectedNode(data, callback) {
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
                    editDeletedNodes["" + data.nodes[0]] = "";
                    delete newNodes["" + data.nodes[0]];
                    delete editNodes["" + data.nodes[0]];
                    create_link();
                }
                //Deletes edge in manipulation mode and deletes the property from the node wikipages
                async function deleteSelectedEdge(data, callback) {
                    var edgeToNode = edges.get(data.edges[0]).to;
                    var edgeFromNode = edges.get(data.edges[0]).from;
                    var edgeLabel = edges.get(data.edges[0]).label;
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
                    if (edgeLabel[0] == "-") {
                        if (await pageExists(edgeToNode) === true) {
                            await fetch('/w/api.php?action=parse&page=' + edgeToNode + '&prop=wikitext&format=json')
                                .then(response => response.json())
                                .then(data => {
                                    var wikiText = data.parse.wikitext['*'];
                                    var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=` + reverseLabel(edgeLabel) + `[\\r\\n]*\\|[\\r\\n]*value=` + edgeFromNode + `[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`
                                    //var edgeString = '(\\{\\{Semantic\/Element[^}]*[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*[\\r\\n]*\\}[\\r\\n]*\\})'
                                    var re = new RegExp(edgeString, "g");
                                    var edgeStringFound = wikiText.search(re) >= 0;
                                    if (edgeStringFound) {
                                        if (editDeletedEdges["" + edgeToNode]) {
                                            var newWikiText = editDeletedEdges["" + edgeToNode].replace(re, "");
                                            editDeletedEdges["" + edgeToNode] = newWikiText;
                                        } else {
                                            var newWikiText = wikiText.replace(re, "");
                                            editDeletedEdges["" + edgeToNode] = newWikiText;
                                        }
                                    }
                                    if (newNodes["" + edgeToNode]) {
                                        var newWikiText = newNodes["" + edgeToNode].replace(re, "");
                                        newNodes["" + edgeToNode] = newWikiText;
                                    }
                                    if (editNodes["" + edgeToNode]) {
                                        var newWikiText = editNodes["" + edgeToNode].replace(re, "");
                                        editNodes["" + edgeToNode] = newWikiText;
                                    }
                                });
                        } else {
                            if (network.getConnectedNodes(edgeToNode).length == 0) {
                                delete newNodes["" + edgeToNode];
                            } else {
                                var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=` + reverseLabel(edgeLabel) + `[\\r\\n]*\\|[\\r\\n]*value=` + edgeFromNode + `[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`;
                                var re = new RegExp(edgeString, "g");
                                var wikiText = newNodes["" + edgeToNode];
                                var newWikiText = wikiText.replace(re, "");
                                newNodes["" + edgeToNode] = newWikiText;
                            }
                        }
                    } else {
                        if (await pageExists(edgeFromNode) === true) {
                            await fetch('/w/api.php?action=parse&page=' + edgeFromNode + '&prop=wikitext&format=json')
                                .then(response => response.json())
                                .then(data => {
                                    var wikiText = data.parse.wikitext['*'];
                                    var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=` + edgeLabel + `[\\r\\n]*\\|[\\r\\n]*value=` + edgeToNode + `[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`;
                                    //var edgeString = '(\\{\\{Semantic\/Element[^}]*[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*[\\r\\n]*\\}[\\r\\n]*\\})'
                                    var re = new RegExp(edgeString, "g");
                                    var edgeStringFound = wikiText.search(re) >= 0;
                                    if (edgeStringFound) {
                                        if (editDeletedEdges["" + edgeFromNode]) {
                                            var newWikiText = editDeletedEdges["" + edgeFromNode].replace(re, "");
                                            editDeletedEdges["" + edgeFromNode] = newWikiText;
                                        } else {
                                            var newWikiText = wikiText.replace(re, "");
                                            editDeletedEdges["" + edgeFromNode] = newWikiText;
                                        }
                                    }
                                    if (newNodes["" + edgeFromNode]) {
                                        var newWikiText = newNodes["" + edgeFromNode].replace(re, "");
                                        newNodes["" + edgeFromNode] = newWikiText;
                                    }
                                    if (editNodes["" + edgeFromNode]) {
                                        var newWikiText = editNodes["" + edgeFromNode].replace(re, "");
                                        editNodes["" + edgeFromNode] = newWikiText;
                                    }
                                });
                        } else {
                            if (network.getConnectedNodes(edgeFromNode).length == 0) {
                                delete newNodes["" + edgeFromNode];
                            } else {
                                var edgeString = `(\{\{Semantic\/Link[\\r\\n]*\\|[\\r\\n]*property=` + edgeLabel + `[\\r\\n]*\\|[\\r\\n]*value=` + edgeToNode + `[\\r\\n]*\\}[\\r\\n]*\\}[\\r\\n]*)`;
                                var re = new RegExp(edgeString, "g");
                                var wikiText = newNodes["" + edgeFromNode];
                                var newWikiText = wikiText.replace(re, "");
                                newNodes["" + edgeFromNode] = newWikiText;
                            }
                        }
                    }
                    //nodes.remove(edges.get(data.edges[0]).to);
                    callback(data);
                    document.querySelector('.vis-delete').remove();
                    create_link();
                }
                
                //HTML for the manipulation popups
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
                
                //function to make the manipulation popups draggable
                function dragElement(elmnt) {
                    var pos1 = 0,
                        pos2 = 0,
                        pos3 = 0,
                        pos4 = 0;
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
