isg.Data = class {

    nodes = {};
    edged = {};

    constructor() {
        // create an array with nodes
        this.nodes = new vis.DataSet([]);
        // create an array with edges
        this.edges = new vis.DataSet([]);
    }
}