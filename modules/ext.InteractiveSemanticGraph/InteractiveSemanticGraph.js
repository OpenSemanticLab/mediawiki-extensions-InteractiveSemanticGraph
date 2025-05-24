/*@nomin*/
/* 
hint: ResourceLoader minifier does not support ES6 yet, therefore skip minification  with "nomin" (see https://phabricator.wikimedia.org/T255556)
*/

//Root class
class isg {

    static version = "0.0.1";

    constructor() {
    }

    static getVersion() {
        return this.version;
    }
}

// Assigning namespace.
window.isg = isg;

isg.Graph = class {

    param_nodes_set = false;

    nodesClicked = [];
    contextCreatedProps = [];
    objClickedProps = {};
    objColors = {};
    start = 0;

    colors = [];

    constructor(container, config) {
        this.container = container
        this.config = config;
        this.config.show_menu = this.config.show_menu || true;
        this.ui = new isg.UI(this.container, { onLegendClick: (legendEntry) => this.legendFunctionality(legendEntry), legacy_mode: config.legacy_mode });
        this.data = new isg.Data(this.config);
        if (this.config.edit && this.config.legacy_mode) mwjson.parser.init(); //start loading parser

        this.first_call = true;

        //init graph from permalink
        var searchParams = new URLSearchParams(window.location.search);
        if ((searchParams.has('nodes') && !(searchParams.get('nodes') === "")) || this.config.data) {
            this.first_call = false; //prevent auto-expand
            if (this.config.data) {
                this.config.data = this.config.data.replaceAll("&amp;", "&");
                window.history.replaceState(null, document.title, this.config.data);
            }
            //searchParams = new URLSearchParams(window.location.search);
            this.read_link();
        }

        this.config.properties = [...new Set(this.config.properties)]; //remove duplicates
        this.config.properties = this.config.properties.filter((el) => { return !this.config.ignore_properties.includes(el); }); //remove ignored properties
        this.config.inverseProperties = this.config.properties.filter(p => isg.util.isLabelReversed(p));
        this.config.noninverseProperties = this.config.properties.filter(p => !isg.util.isLabelReversed(p));
        this.config.normalizedProperties = [];
        this.config.noninverseProperties.forEach(p => this.config.normalizedProperties.push(p));
        this.config.inverseProperties.forEach(p => this.config.normalizedProperties.push(isg.util.reverseLabel(p))); //normalize propertes
        this.config.normalizedProperties = [...new Set(this.config.normalizedProperties)]; //remove duplicates
        this.randomColor = new isg.util.Color();

	//this.config.uri_color_map = {"gpo": "red"};        



        for (var i = this.colors.length; i < this.config.properties.length; i++) {
            this.colors.push(this.randomColor.randomHSL());
        }

        //Allow custom visnetwork options
        this.options = this.getDefaultOptions();
        this.options = { ...this.options, ...this.config.visnetwork };
        if (!Array.isArray(this.config.root)) this.config.root = [this.config.root]; //ensure array
        this.config.root = [...new Set(this.config.root)]; //remove duplicates

        //Creates groups in the options and sets them all to hidden:false.
        for (var i = 0; i < this.config.normalizedProperties.length; i++) {
            this.options.groups[this.config.normalizedProperties[i]] = {
                hidden: false
            };
        }

        if (this.param_nodes_set === false) {
            for (const root of this.config.root) {
                this.data.nodes.add({
                    id: root,
                    label: root, //todo: query display title
                    color: '#6dbfa9'
                });
            }
        }

        //create the network
        this.network = new vis.Network(this.container, { nodes: this.data.nodes, edges: this.data.edges }, this.options);
        this.initUi();
        this.createEventHandler();

        if (this.param_nodes_set === false) {
            for (const root of this.config.root) {
                this.fetchData(root, this.config.properties); //auto expand
            }
        }

        this.nodes_opened = this.config.root.slice(); //important: create a copy here
        this.loop_counter = 0;
    }

    //Draws graph from url
    read_link() {
        this.param_nodes_set = true;
        var searchParams = new URLSearchParams(window.location.search);
        var d_nodes = mwjson.util.objectFromCompressedBase64(searchParams.get("nodes"));
        var d_edges = mwjson.util.objectFromCompressedBase64(searchParams.get("edges"));

        this.config.root = [d_nodes[0].id];
        var prop_array = [];
        for (var i = 0; i < d_nodes.length; i++) {
            this.data.nodes.add(d_nodes[i]);
        }

        for (var i = 0; i < d_edges.length; i++) {
            this.data.edges.add(d_edges[i]);
            if (prop_array.includes(d_edges[i].group)) {
                continue;

            } else {
                prop_array.push(d_edges[i].group);
                this.colors.push(d_edges[i].color);
            }
        }

        this.config.properties = prop_array.concat(this.config.properties);
        //searchParams = new URLSearchParams(window.location.search);

    }

    //Creates a static link to restore the graph state
    create_link(data, updateWindowLocation = false) {

        var searchParams = new URLSearchParams(window.location.search);
        updateWindowLocation = updateWindowLocation || (searchParams.has('permalink') && searchParams.get('permalink') === 'true') || this.config.sync_permalink || searchParams.has('nodes');

        if (updateWindowLocation) {
            if (!searchParams.has('nodes')) {
                window.history.replaceState(null, document.title, "?nodes=&edges");
            }

            searchParams = new URLSearchParams(window.location.search);
            var e_nodes = mwjson.util.objectToCompressedBase64(data.nodes.get());
            var e_edges = mwjson.util.objectToCompressedBase64(data.edges.get());

            searchParams.set("nodes", "" + e_nodes);
            searchParams.set("edges", "" + e_edges);

            window.history.pushState({}, '', "?" + searchParams);
        }
    }

    initUi() {

        this.ui.init(); //visnetwork will remove all child elements, so we call this after creating the visnetwork instance

        if (this.config.hint) this.ui.createInfoSection();

        //create legend
        this.legendColors = this.ui.createLegend(this.config.normalizedProperties, this.colors);

        //save button
        if (this.config.edit) {
            this.saveButton = this.ui.createSaveButton();
            this.saveButton.addEventListener("click", () => this.data.saveGraphChanges());
            if (!this.config.show_menu) this.saveButton.style.display = "none";
        }

        //permalink button
        var searchParams = new URLSearchParams(window.location.search);
        var requested = searchParams.has('permalink') && searchParams.get('permalink') === 'true';
        if (requested || this.config.permalink || searchParams.has('nodes')) {
            this.permalinkButton = this.ui.createPermalinkButton();
            this.permalinkButton.addEventListener("click", (event) => {
                this.create_link(this.data, true);
                isg.util.copyToClipboad(window.location);
            });
        }

        //reset view button
        this.resetViewButton = this.ui.createResetViewButton();
        this.resetViewButton.addEventListener("click", () => {
            this.network.redraw();
            this.network.fit();
        });
        if (!this.config.show_menu) this.resetViewButton.style.display = "none";

        // reset view if graph was hidden and becomes visible
        // otherwise offset moves graph out of view
        // see also: https://stackoverflow.com/questions/1462138/event-listener-for-when-element-becomes-visible
        var observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio > 0) {
                    this.network.redraw();
                    this.network.fit();
                }
            });
        }, {
            root: document.documentElement,
        });
        observer.observe(this.container);

    }

    getDefaultOptions() {
        var options = {
            width: "100%",
            height: "100%",
            interaction: {
                hover: true
            },
            manipulation: {
                enabled: this.config.edit,
                editEdge: false,
                deleteNode: (data, callback) => {
                    this.deleteSelectedNode(data, callback)
                },
                deleteEdge: (data, callback) => {
                    this.deleteSelectedEdge(data, callback)
                },
                addNode: (data, callback) => {
                    // filling in the popup DOM elements
                    document.getElementById("node-operation").innerText = "Add Node";
                    this.ui.dragElement(document.getElementById("node-popUp"));
                    this.editNode(data, this.clearNodePopUp, callback);
                },
                addEdge: (data, callback) => {
                    if (data.from == data.to) {
                        var r = confirm("Do you want to connect the node to itself?");
                        if (r != true) {
                            callback(null);
                            return;
                        }
                    }
                    document.getElementById("edge-operation").innerText = "Add Edge";
                    this.ui.dragElement(document.getElementById("edge-popUp"));
                    this.editEdgeWithoutDrag(data, callback);
                },
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true
                    },
                    //from:{enabled: true}
                },
                font: { size: this.config.edge_labels ? 14 : 0 } //optional hide labels by set font size to zero
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
        return options;
    }

    fetchData(root, properties, nodeID) {
        if (this.data.nodes.get(root).isLiteral) return; //don't query on literals
        if (!properties) return;
        var promise = this.data.fetchData(root, properties, nodeID, this.legendColors)
        promise.then(result => {
                this.network.setOptions(this.options);
                this.network.body.emitter.emit('_dataChanged');
                this.network.redraw();
                this.create_link(this.data)
                if (this.first_call && this.config.depth) {
                    var first_nodes = this.data.nodes.getIds()
                    first_nodes = first_nodes.slice(1);
                    this.getStartIds(first_nodes);
                    this.first_call = false;
                }
            });
    }

    // Repeats the initial query on newly opened node until depth limit is reached
    // ToDo: Rename function
    async getStartIds(node) {

        //console.log(node);
        var start_nodes = node;//network.getConnectedNodes(node);
        //console.log(start_nodes)
        //nodes_opened.push(start_nodes);
        for (var i = 0; i < start_nodes.length; i++) {
            if (this.nodes_opened.includes(start_nodes[i])) {/*console.log(start_nodes[i]);*/ continue; }
            this.nodes_opened.push(start_nodes[i]);
            /*await isFetched(start_nodes[i]).then(function(response){
                console.log(response);
            });*/
            this.fetchData(start_nodes[i], this.config.properties, start_nodes[i]);
            //console.log(fetched);

        }
        //console.log(nodes_opened);
        setTimeout(() => {
            if (this.loop_counter == this.config.depth - 1) return;
            this.loop_counter++;
            var new_nodes_loop = this.data.nodes.getIds();
            //console.log(new_nodes_loop);
            this.getStartIds(new_nodes_loop);
        }, 300)

        //getStartIds(nodes.getIds());
        //console.log(nodes.getIds());
        //getStartIds(start_nodes[1]);

    }

    createEventHandler() {
        //Ctrl and click on two nodes, puts out all possible paths between the two nodes under the tip
        this.network.on("click",  (params) => {
            mw.hook('isg.node.clicked').fire(this.data.nodes.get(params.nodes[0])); //fire event
            if (params.nodes[0] && params.event.srcEvent.ctrlKey) {
                if (this.nodesClicked.length < 2) {
                    this.nodesClicked.push(params.nodes[0]);
                }
                if (this.nodesClicked.length == 2 && this.nodesClicked[0] != this.nodesClicked[1]) {
                    var pathId = 0;
                    var foundPaths = this.findAllPaths(this.nodesClicked[0], this.nodesClicked[1]);
                    //.querySelector('[id^="poll-"]').id;
                    if (document.querySelectorAll('[id^="fullPath"]')) {
                        for (var i = 0; i < document.querySelectorAll('[id^="fullPath"]').length; i++) {
                            document.querySelectorAll('[id^="fullPath"]')[i].remove();
                        }
                    }
                    var element = '<div id="fullPath' + pathId + '"></div>'
                    this.container.children[0].insertAdjacentHTML('afterend', element);
                    var allStringsArray = this.getAllStringsForAllPaths(foundPaths);
                    var stringDiv = this.container.querySelector('#fullPath' + pathId);
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
                            var stringDiv = this.container.querySelector('#fullPath' + pathId);
                            stringDiv.innerHTML = stringDiv.innerHTML + '&#9679; ' + currentString + '<br>';
                        }
                        stringDiv.innerHTML += "<br>"
                    }
                    this.nodesClicked = [];
                }
                if (this.nodesClicked[0] === this.nodesClicked[1] || this.nodesClicked.length > 2) {
                    this.nodesClicked = [];
                }
            }
            pathId++;
        });
        $(document).keyup((event) => {
            if (!event.ctrlKey) {
                this.nodesClicked = [];
            }
        });

        this.network.on("doubleClick", (params) => {  
            if (params.nodes[0]) {
                //Checks if all node children are created from context menu or manually, if so it creates nodes for before defined properties else it deletes all children
                var conManNodes = this.network.getConnectedNodes(params.nodes[0], 'to');
                var onlyConManNodes = true;
                for (var i = 0; i < conManNodes.length; i++) {
                    if (!(this.data.nodes.get(conManNodes[i]).oncontext || this.data.nodes.get(conManNodes[i]).manually)) {
                        onlyConManNodes = false;
                    }
                }
                //Node is expanded -> delete it and all nodes related to its expansion
                if (this.network.getConnectedNodes(params.nodes[0]).length > 1 && onlyConManNodes == false) {
                    this.deleteNodesChildren(params.nodes[0]);
                    for (var i = 0; i < this.contextCreatedProps.length; i++) {
                        var noNodesInNetwork = true;
                        for (var j = 0; j < this.data.nodes.getIds().length; j++) {
                            if (this.contextCreatedProps[i] == this.data.nodes.get(this.data.nodes.getIds()[j]).group) {
                                noNodesInNetwork = false;
                            }
                        }
                        if (noNodesInNetwork === true) {
                            this.container.querySelector('#' + this.contextCreatedProps[i]).remove();
                            this.contextCreatedProps.splice(this.contextCreatedProps.indexOf(this.contextCreatedProps[i]), 1);
                            i--;
                        }
                    }
                    delete this.objClickedProps["" + params.nodes[0]];
                    this.create_link(this.data)
                    //nodesArray.splice(nodesArray.indexOf(params.nodes[0]), 1);
                } else {
                    //Node is unexpanded -> expand it
                    var nodeById = this.data.nodes.get(params.nodes[0]);
                    this.fetchData(nodeById.id, this.config.properties, params.nodes[0]);
                    //nodesArray.push(params.nodes[0]);
                }
            }
        });

        var ul = document.createElement("ul");
        ul.className = 'custom-menu';
        document.body.append(ul);

        //On a node right click it puts out all properties of the clicked node and a link to the node wiki-page
        this.network.on("oncontext", (params) => {         
            params.event.preventDefault();
            var timeNow = Date.now();
            var timeDiff = timeNow - this.start
            if (timeDiff > 300) {
                this.start = Date.now();
                //console.log(this.data.nodes.get(this.network.getNodeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })));
                //console.log(edges.get(this.network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y })));
                $('.custom-menu').each( (index,element) => { element.innerHTML = "";});//clear menue

                var selected_node_id = this.network.getNodeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y });
                var selected_edge_id = this.network.getEdgeAt({ x: params.pointer.DOM.x, y: params.pointer.DOM.y });
                if (!(selected_edge_id && selected_node_id)) { //edge clicked
                    var selected_edge = this.data.edges.get(selected_edge_id);
                    if (selected_edge.from) {
                        params.event.preventDefault();
                        if (selected_edge.label == 'Category') { //create Category page link
                            var li = document.createElement("li");
                            li.innerHTML = '' + '\uD83D\uDD17' + ' ' + selected_edge.to;
                            li.addEventListener("click", () => window.open('/wiki/' + selected_edge.to));
                            ul.prepend(li);
                        } else { //create property page link
                            var li = document.createElement("li");
                            li.innerHTML = '' + '\uD83D\uDD17' + ' ' + selected_edge.label;
                            li.addEventListener("click", () => window.open('/wiki/' + 'Property:' + selected_edge.label));
                            ul.prepend(li);
                        }
                        $(".custom-menu").finish().toggle(100).css({
                            top: params.event.pageY + "px",
                            left: params.event.pageX + "px",
                            display: "block"
                        });
                    }
                }
                if (selected_node_id) { //node clicked
                    params.event.preventDefault();

                    const selected_node = this.data.nodes.get(selected_node_id);

                    if (selected_node.url) {
                        var li = document.createElement("li");
                        li.classList.add("custom-menu-link-entry");
                        li.innerHTML = '' + '\uD83D\uDD17' + ' ' + selected_node.label;
                        li.addEventListener("click", () => window.open(selected_node.url));
                        ul.prepend(li);
                    }

                    mwjson.api.getSemanticProperties(selected_node.id)
                        .then(page_properties => {
                            page_properties = page_properties.filter( (el) => { return !this.config.ignore_properties.includes(el); }); //remove ignored properties
                            for (var i = 0; i < page_properties.length; i++) {
                                if (!page_properties[i].startsWith("_")) {
                                    var li = document.createElement("li");
                                    li.classList.add("custom-menu-property-entry");
                                    li.dataset.action = page_properties[i].replaceAll('_', ' ');
                                    li.innerHTML = page_properties[i].replaceAll('_', ' ');
                                    ul.append(li);
                                }
                            }
                            this.create_link(this.data)

                            //On left click on one of the properties it creates nodes for the clicked property and if the legend doesnt have that property as a legend entry it is created
                            $(".custom-menu li.custom-menu-property-entry").click((event) => {
                                var clickedProperty = [$(event.target).attr("data-action")]
                                var clickedPropertyColor = this.randomColor.randomHSL();
                                if (!(clickedProperty in this.legendColors)) {
                                    this.legendColors[clickedProperty] = clickedPropertyColor;
                                } else {
                                    clickedPropertyColor = this.legendColors[clickedProperty];
                                }
                                if (this.objColors[clickedProperty]) {
                                    clickedPropertyColor = this.objColors[clickedProperty]
                                } else {
                                    this.objColors[clickedProperty] = clickedPropertyColor;
                                }
                                if (!this.objClickedProps[selected_node.id]) {
                                    this.objClickedProps[selected_node.id] = new Array();
                                }
                                if (!this.objClickedProps["" + selected_node.id].includes(clickedProperty[0])) {
                                    this.fetchData(selected_node.id, clickedProperty, selected_node.id);
                                    this.objClickedProps["" + selected_node.id].push(clickedProperty[0]);
                                }
                                if (!(this.contextCreatedProps.includes(clickedProperty[0]) || this.config.properties.includes(clickedProperty[0]) /*|| this.legendColors[clickedProperty[0]]*/)) {
                                    this.contextCreatedProps.push(clickedProperty[0]);
                                    this.options.groups[clickedProperty] = {
                                        hidden: false
                                    };
                                    this.ui.addLegendEntry(clickedProperty, clickedProperty, clickedPropertyColor);
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

        this.network.on("dragEnd", (params) => {
            console.log("DragEnd");
            params.nodes.forEach((nodeId) => {
                const node = this.data.nodes.get(nodeId)
                const position = this.network.getPosition(nodeId)
                // setting the current position is necessary to prevent snap-back to initial position
                node.x = position.x
                node.y = position.y
                node.fixed = true
                this.data.nodes.update(node)
            })
        });

        this.network.on("dragStart", (params) => {
            params.nodes.forEach((nodeId, index) => {
                const node = this.data.nodes.get(nodeId)
                const position = this.network.getPosition(nodeId)
                // setting the current position is necessary to prevent snap-back to initial position
                node.x = position.x
                node.y = position.y
                node.fixed = false
                this.data.nodes.update(node)

            });
        }
        );
    }

    //hides nodes if their main creation property was clicked in the legend 
    legendFunctionality(legendGroup) {
        //var legendGroup = this.parentNode.childNodes[1].innerHTML;

        //A node is visible if at least one path over visible edges to the root node exists.
        this.options.groups[legendGroup].hidden = !this.options.groups[legendGroup].hidden; //toggle state

        //update all edges
        this.data.edges.forEach( (edge) => {
            edge.hidden = this.options.groups[edge.label].hidden;
            edge.physics = !edge.hidden;
        });
        //reset nodes
        this.data.nodes.forEach( (node) => {
            node.hidden = false;
            node.physics = !node.hidden;
            node.visited = false;
        });
        //check each node
        this.data.nodes.forEach( (node) => {
            this.setNodeVisibilityByVisiblePath(node.id, this.config.root)
            //reset visited state. Todo: Reuse visited nodes between runs
            this.data.nodes.forEach( (node) => {
                node.visited = false;
            });
        });

        this.network.setOptions(this.options);
        this.network.body.emitter.emit('_dataChanged');
        this.network.redraw();
        var allFalse = Object.keys(this.options.groups).every( (k) => {
            if (k === 'useDefaultGroups') {
                return true
            }
            return this.options.groups[k].hidden === false
        });
        if (allFalse === true) {
            /*this.oldGroups = {};*/
        }
    };

    //Checks, if a node has a path over visible edges to the root node(s).
    //If not, the nodes gets hidden
    setNodeVisibilityByVisiblePath(nodeId, rootNodeId) {
        if (!Array.isArray(rootNodeId)) rootNodeId = [rootNodeId]; //ensure array
        if (rootNodeId.includes(nodeId)) {
            return true; //root is always visible
        }
        var node = this.data.nodes.get(nodeId);
        if (node.visited) return !node.hidden //prevent circles. ToDo: Reuse results between runs
        node.visited = true;
        node.hidden = true;
        var connectedEdgesIds = this.network.getConnectedEdges(nodeId);
        var connectedEdges = this.data.edges.get(connectedEdgesIds);
        connectedEdges.forEach( (edge) => {
            if (edge.hidden) return false; //don't follow hidden edges
            var connectedNodesIds = this.network.getConnectedNodes(edge.id);
            var connectedNodes = this.data.nodes.get(connectedNodesIds);
            connectedNodes.forEach( (connectedNode) => {
                if (connectedNode.id == nodeId) return; //prevent self evaluation
                if (this.setNodeVisibilityByVisiblePath(connectedNode.id, rootNodeId)) {
                    node.hidden = false; //set node visible, if at least one connected node is visible
                }
            });
        });
        node.physics = !node.hidden; //disable physics for hidden nodes
        return !node.hidden;
    }



    //Add Node popup
    editNode(data, cancelAction, callback) {
        var newNodeActive = true;
        //document.getElementById("node-label").value = data.label;
        document.getElementById("node-saveButton").onclick = this.saveNodeData.bind(
            this,
            data,
            callback
        );
        document.getElementById("node-cancelButton").onclick = cancelAction.bind(
            this,
            callback
        );
        //document.getElementById("node-popUp")
        $('canvas').on('click', (e) => {
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

    clearNodePopUp() {
        document.getElementById("node-saveButton").onclick = null;
        document.getElementById("node-cancelButton").onclick = null;
        document.getElementById("node-popUp").style.display = "none";
    }

    cancelNodeEdit(callback) {
        this.clearNodePopUp();
        callback(null);
    }
    //saveNodeData to the graph
    saveNodeData(data, callback) {
        const input_element = document.getElementById("node-label")
        data.label = input_element.value;
        if (input_element.dataset.result && input_element.dataset.result !== 'undefined') { //existing page
            const result = JSON.parse(input_element.dataset.result);
            data.id = result.fulltext;
            data.url = result.fullurl;
        }
        else {
            if (this.config.legacy_mode) data.id = "Term:OSL" + isg.util.uuidv4().replaceAll('-', ''); //create a new UUID page in the Term namespace
            else data.id = "Item:" + mwjson.util.OswId();
            data.url = "/wiki/" + data.id;
        }

        var node = this.data.nodes.get(data.id)
        if (node) {
            OO.ui.confirm('Node already exists in the graph. Do you want to navigate to its position?').done((confirmed) => {
                if (confirmed) {
                    var pos = this.network.getPosition(data.id);
                    if (pos.x && pos.y) {
                        input_element.value = "";
                        input_element.dataset.result = "";
                        this.clearNodePopUp();
                        this.network.moveTo({position: pos, animation: true});
                    }
                }
            });
        }
        else {
            data.hidden = false;
            data.physics = false;
            //console.log(data);
            callback(data);
            this.create_link();
            input_element.value = "";
            input_element.dataset.result = "";
            this.clearNodePopUp();
        }


    }
    //addEdge popup
    editEdgeWithoutDrag(data, callback) {
        var newEdgeActive = true;
        // filling in the popup DOM elements
        //document.getElementById("edge-label").value = data.label;

        document.getElementById("edge-saveButton").onclick = this.saveEdgeData.bind(
            this,
            data,
            callback
        );
        document.getElementById("edge-cancelButton").onclick = this.cancelEdgeEdit.bind(
            this,
            callback
        );
        $('canvas').on('click', (e) => {
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

    clearEdgePopUp() {
        document.getElementById("edge-saveButton").onclick = null;
        document.getElementById("edge-cancelButton").onclick = null;
        document.getElementById("edge-popUp").style.display = "none";
    }

    cancelEdgeEdit(callback) {
        this.clearEdgePopUp();
        callback(null);
    }

    //Save button on create edge popup
    async saveEdgeData(data, callback) {
        //Sets various options to the nodes that the edge gets connected
        if (typeof data.to === "object") data.to = data.to.id;
        if (typeof data.from === "object") data.from = data.from.id;
        data.label = document.getElementById("edge-label").value;
        this.options.groups[data.label] = {
            hidden: false
        };
        var toNode = this.data.nodes.get(data.to);
        var fromNode = this.data.nodes.get(data.from);
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
        if (this.legendColors[data.label]) {
            data.color = this.legendColors[data.label];
        } else {
            data.color = this.randomColor.randomHSL();
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
        if (!(this.contextCreatedProps.includes(data.label) || this.config.properties.includes(data.label))) {
            this.contextCreatedProps.push(data.label);
            this.ui.addLegendEntry(data.label, data.label, data.color);
            this.legendColors[data.label] = data.color;
        }
        //Creates new wikitext that will be saved after the save button is clicked
        var sub = fromNode;
        var obj = toNode;
        this.data.editTargetNodes.push(obj.id);
        var property = data.label;
        if (isg.util.isLabelReversed(data.label)) { //reverseOrder
            sub = toNode;
            obj = fromNode;
            property = reverseLabel(property)
        }
        //TODO: make async
        const property_type = await this.data.fetchPropertyType(property);
        //console.log(property_type);
        var property_value = obj.label;

        if (property_type === 'page') {
            //create new page with given id if not exists yet
            property_value = obj.id;
            if (!this.data.editNodes[obj.id]) { //object page not handled yet
                var page = await mwjson.api.getPage(obj.id);
                if (!page.exists) { //create page with default content
                    page.title = obj.id;
                    if (this.config.legacy_mode) {
                        page.dict = [{
                            'OslTemplate:KB/Term': {
                                'label': obj.label,
                                'label_lang_code': 'en',
                                'description': "",
                                'relations': []
                            }
                        }
                            , "\n=Details=\n\n",
                        { 'OslTemplate:KB/Term/Footer': {} }
                        ];
                    }
                    else {
                        if (page.slots['header'] !== "{{#invoke:Entity|header}}") {
                            page.slots['header'] = "{{#invoke:Entity|header}}"
                            page.slots_changed['header'] = true;
                        }
                        if (page.slots['footer'] !== "{{#invoke:Entity|footer}}") {
                            page.slots['footer'] = "{{#invoke:Entity|footer}}"
                            page.slots_changed['footer'] = true;
                        }
                        page.slots['jsondata'] = {
                            "type": [
                                "Category:Item"
                            ],
                            "uuid": mwjson.util.uuidv4(obj.id),
                            "name": mwjson.util.toPascalCase(obj.label),
                            "label": [
                                {
                                    "text": obj.label,
                                    "lang": "en"
                                }
                            ],
                        };
                        page.slots_changed['jsondata'] = true;
                    }
                    this.data.editNodes[obj.id] = page; //store page state
                }
            }
        }
        var page = undefined;
        if (!this.data.editNodes[sub.id]) { //subject page not handled yet
            page = await mwjson.api.getPage(sub.id);
            if (page.exists) {
                if (this.config.legacy_mode) {
                    await mwjson.parser.init();
                    mwjson.parser.parsePage(page);
                    if (page.content.search(/(\{\{OslTemplate:KB\/Term[^}]*[\r\n]*\}[\r\n]*\})/g) >= 0) {
                        //there is already a KB/Term Template
                    } else {
                        console.log(`WARNING: page ${sub.id} exits but is not a Semantic Term`);
                        mwjson.parser.appendTemplate(page, 'OslTemplate:KB/Term', {
                            'label': sub.label,
                            'label_lang_code': 'en',
                            'description': "",
                            'relations': []
                        }
                        );
                    }
                }
            }
            else { //create page with default content
                page.title = sub.id;
                if (this.config.legacy_mode) {
                    page.dict = [{
                        'OslTemplate:KB/Term': {
                            'label': sub.label,
                            'label_lang_code': 'en',
                            'description': "",
                            'relations': []
                        }
                    },
                        "\n=Details=\n\n",
                    { 'OslTemplate:KB/Term/Footer': {} }
                    ];
                }
                else {
                    if (page.slots['header'] !== "{{#invoke:Entity|header}}") {
                        page.slots['header'] = "{{#invoke:Entity|header}}"
                        page.slots_changed['header'] = true;
                    }
                    if (page.slots['footer'] !== "{{#invoke:Entity|footer}}") {
                        page.slots['footer'] = "{{#invoke:Entity|footer}}"
                        page.slots_changed['footer'] = true;
                    }
                    page.slots['jsondata'] = {
                        "type": [
                            "Category:Item"
                        ],
                        "uuid": mwjson.util.uuidv4(sub.id),
                        "name": mwjson.util.toPascalCase(sub.label),
                        "label": [
                            {
                                "text": sub.label,
                                "lang": "en"
                            }
                        ],
                        "statements": []
                    };
                    page.slots_changed['jsondata'] = true;
                }
            }
            this.data.editNodes[sub.id] = page; //store page state    
        }
        else page = this.data.editNodes[sub.id]; //use stored state
        if (this.config.legacy_mode) {
            mwjson.parser.append_to_template_param(page, 'OslTemplate:KB/Term', ['relations'], {
                'OslTemplate:KB/Relation': {
                    'property': property,
                    'value': property_value
                }
            });
        }
        else {
            if (mwjson.util.isString(page.slots['jsondata'])) page.slots['jsondata'] = JSON.parse(page.slots['jsondata']);
            if (!page.slots['jsondata']['statements']) page.slots['jsondata']['statements'] = [];
            page.slots['jsondata']['statements'].push({
                'uuid': mwjson.util.uuidv4(),
                'label': [{'text': ".. " + property + " ..", 'lang': "en"}],
                'predicate': "Property:" + property,
                'object': property_value
            })
            page.slots_changed['jsondata'] = true;
        }
        this.data.editNodes[sub.id] = page; //update stored page state    

        //console.log(sub);
        //console.log(obj);
        //console.log(this.data.editNodes);
        this.clearEdgePopUp();
        callback(data);
        this.network.setOptions(this.options);
        this.network.body.emitter.emit('_dataChanged');
        this.network.redraw();
        this.create_link();
    }

    //Deletes node in manipulation mode and the wiki page.
    async deleteSelectedNode(data, callback) {
        this.deleteNodesChildren(data.nodes[0]);
        this.data.nodes.remove(data.nodes[0]);
        for (var i = 0; i < this.contextCreatedProps.length; i++) {
            var noNodesInNetwork = true;
            for (var j = 0; j < this.data.nodes.getIds().length; j++) {
                if (this.contextCreatedProps[i] == this.data.nodes.get(this.data.nodes.getIds()[j]).group) {
                    noNodesInNetwork = false;
                }
            }
            if (noNodesInNetwork === true) {
                this.container.querySelector('#' + this.contextCreatedProps[i]).remove();
                this.contextCreatedProps.splice(this.contextCreatedProps.indexOf(this.contextCreatedProps[i]), 1);
                i--;
            }
        }
        delete this.objClickedProps["" + data.nodes[0]];
        callback();
        document.querySelector('.vis-delete').remove();
        this.data.editDeletedNodes["" + data.nodes[0]] = "";
        delete this.data.editNodes["" + data.nodes[0]];
        this.create_link(this.data);
    }

    //Deletes edge in manipulation mode and deletes the property from the node wikipages
    async deleteSelectedEdge(data, callback) {
        var edgeToNodeId = this.data.edges.get(data.edges[0]).to;
        var edgeToNode = this.data.nodes.get(edgeToNodeId);
        var edgeFromNodeId = this.data.edges.get(data.edges[0]).from;
        var edgeLabel = this.data.edges.get(data.edges[0]).label;
        this.data.edges.remove(data.edges[0]);
        this.deleteNodesChildren(edgeToNodeId, true);
        this.deleteNodesChildren(edgeFromNodeId, true);
        for (var i = 0; i < this.contextCreatedProps.length; i++) {
            var noNodesInNetwork = true;
            for (var j = 0; j < this.data.nodes.getIds().length; j++) {
                if (this.contextCreatedProps[i] == this.data.nodes.get(this.data.nodes.getIds()[j]).group) {
                    noNodesInNetwork = false;
                }
            }
            if (noNodesInNetwork === true) {
                this.container.querySelector('#' + this.contextCreatedProps[i]).remove();
                this.contextCreatedProps.splice(this.contextCreatedProps.indexOf(this.contextCreatedProps[i]), 1);
                i--;
            }
        }
        var sub = edgeFromNodeId;
        var obj = edgeToNodeId;
        var property = edgeLabel;
        if (isg.util.isLabelReversed(property)) {
            sub = edgeToNodeId;
            obj = edgeFromNodeId;
            property = isg.util.reverseLabel(property);
        }
        const property_type = await this.data.fetchPropertyType(property);

        if (property_type === 'quantity' || edgeToNode.isLiteral) obj = edgeToNode.label; //will never be reversed
        //console.log(property_type, obj);

        var page = undefined;
        if (!this.data.editNodes[sub]) { //subject page not handled yet
            page = await mwjson.api.getPage(sub);
            if (page.exists) {
                if (this.config.legacy_mode) {
                    await mwjson.parser.init();
                    mwjson.parser.parsePage(page);
                    if (page.content.search(/(\{\{OslTemplate:KB\/Term[^}]*[\r\n]*\}[\r\n]*\})/g) >= 0) {
                        //there is already a KB/Term Template
                    } else {
                        console.log(`WARNING: page ${sub.id} exits but is not a Semantic Term`);
                    }
                }
            }
            this.data.editNodes[sub] = page; //store page state   
        }
        else page = this.data.editNodes[sub]; //use stored state
        if (page.exists) {
            if (this.config.legacy_mode) {
                mwjson.parser.update_template_subparam_by_match(page, "OslTemplate:KB/Term", ["relations"], { 'property': property, 'value': obj }, {}); //delete relation
                mwjson.parser.update_template_subparam_by_match(page, "OslTemplate:KB/Term", ["relations"], { 'property': "Property:" + property, 'value': obj }, {}); //delete relation with property NS
            }
            else {
                if (mwjson.util.isString(page.slots['jsondata'])) page.slots['jsondata'] = JSON.parse(page.slots['jsondata']);
                if (!page.slots['jsondata']['statements']) page.slots['jsondata']['statements'] = [];
                console.log(page.slots['jsondata']['statements']);
                page.slots['jsondata']['statements'] = page.slots['jsondata']['statements'].filter(function (statement) {
                    var p = statement.predicate === "Property:" + property;
                    var o = statement.object === obj
                    return !(p && o);
                });
                console.log(page.slots['jsondata']['statements']);
                page.slots_changed['jsondata'] = true;
            }
            this.data.editNodes[sub] = page; //store page state   
        } else {
            console.log(`ERROR: subject page ${sub.id} does not exist`);
            if (this.network.getConnectedNodes(sub).length == 0) {
                delete this.data.editNodes[sub];
            }
        }

        //this.data.nodes.remove(this.data.edges.get(data.this.data.edges[0]).to);
        callback(data);
        document.querySelector('.vis-delete').remove();
        this.create_link(this.data)
    }

    //The function getAllEdgesBetween() returns all edges between two nodes
    getAllEdgesBetween(node1, node2) {
        return this.data.edges.get().filter( (edge) => {
            return (edge.from === node1 && edge.to === node2) || (edge.from === node2 && edge.to === node1);
        });
    }

    //Gets Path array with nodes, returns Cartesian Product  of edges
    getEdgePathsForPath(path) {
        var arraysOfEdgesForNodeInPath = [];
        for (var i = 1; i < path.length; i++) {
            var edgesBetween = this.getAllEdgesBetween(path[i - 1], path[i]);
            var localedgesBetween = edgesBetween.slice();

            arraysOfEdgesForNodeInPath.push(localedgesBetween);
        }
        var allEdgePaths = isg.util.cartesianProduct(arraysOfEdgesForNodeInPath);
        return allEdgePaths;
    }

    //Gets Path array with nodes, returns all possible edge paths
    getEdgeLabelStringsForPath(path) {
        var allEdgePaths = this.getEdgePathsForPath(path);
        var allStrings = new Array(allEdgePaths.length);
        for (var i = 0; i < allEdgePaths.length; i++) {
            var s = "";
            for (var j = 0; j < allEdgePaths[i].length; j++) {
                var edge = allEdgePaths[i][j];
                var label = edge.label;
                var nodeId1 = path[j];
                var nodeId2 = path[j + 1];
                if (edge.to == nodeId1 && edge.from == nodeId2) {
                    label = isg.util.reverseLabel(label);
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
    getAllStringsForAllPaths(paths) {
        var arrayOfAllStrings = [];
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            var allStrings = this.getEdgeLabelStringsForPath(path);
            arrayOfAllStrings.push(allStrings);
        }
        return arrayOfAllStrings;
    }

    //Returns all paths between startNode and endNode
    findAllPaths(startNode, endNode) {
        var visitedNodes = [];
        var currentPath = [];
        var allPaths = [];
        this.dfs(startNode, endNode, currentPath, allPaths, visitedNodes);
        return allPaths;
    }

    //Algorithm to search for all paths between two nodes
    dfs(start, end, currentPath, allPaths, visitedNodes) {
        if (visitedNodes.includes(start)) return;
        visitedNodes.push(start);
        currentPath.push(start);
        if (start == end) {
            var localCurrentPath = currentPath.slice();
            allPaths.push(localCurrentPath);
            isg.util.removeItemFromArray(visitedNodes, start);
            currentPath.pop();
            return;
        }
        var neighbours = this.network.getConnectedNodes(start);
        for (var i = 0; i < neighbours.length; i++) {
            var current = neighbours[i];
            this.dfs(current, end, currentPath, allPaths, visitedNodes);
        }
        currentPath.pop();
        isg.util.removeItemFromArray(visitedNodes, start);
    }
    //Algorithm that gets all nodes that are reachable from the given node in the graph 
    getAllReachableNodesTo(nodeId, excludeIds, reachableNodes) {
        if (reachableNodes.includes(nodeId) || excludeIds.includes(nodeId)) {
            return;
        }
        var children = this.network.getConnectedNodes(nodeId);
        reachableNodes.push(nodeId);
        for (var i = 0; i < children.length; i++) {
            this.getAllReachableNodesTo(children[i], excludeIds, reachableNodes);
            //if(excludeIds.includes(children[i]))continue;
            //reachableNodes.push(children[i]);
        }
    }

    //This function deletes all children of a given node.
    deleteNodesChildren(nodeId, deleteEdge) {
        var excludedIds = [];
        if (deleteEdge === true) {
            //console.log("deleteEdge true")
        } else {
            excludedIds.push(nodeId);
        }
        var reachableNodesTo = [];
        for (const root of this.config.root) {
            this.getAllReachableNodesTo(root, excludedIds, reachableNodesTo);
        }
        var nodesToDelete = [];
        var allIds = this.data.nodes.getIds();
        for (var i = 0; i < allIds.length; i++) {
            if (reachableNodesTo.includes(allIds[i])) continue;
            if (allIds[i] == nodeId) {
                this.deleteEdges(nodeId);
                continue;
            }
            nodesToDelete.push(allIds[i]);
            this.deleteEdges(allIds[i]);
            this.data.nodes.remove(allIds[i]);
            delete this.objClickedProps["" + allIds[i]];
        }
        return nodesToDelete;
    }
    //Deletes all edges from given node
    deleteEdges(nodeID) {
        var fromEdges = this.data.edges.get({
            filter: (item) => {
                return item.from == nodeID;
            }
        });
        for (var j = 0; j < fromEdges.length; j++) {
            this.data.edges.remove(fromEdges[j]);
        }
    }
}

