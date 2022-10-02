/*@nomin*/
/* 
hint: ResourceLoader minifier does not support ES6 yet, therefore skip minification  with "nomin" (see https://phabricator.wikimedia.org/T255556)
*/

//Root class
class isg {

    static version = "0.0.1";

    constructor(container) {
        this.ui = new isg.UI(container)
        this.data = new isg.Data();
    }

    static getVersion() {
        return this.version;
    }
}

// Assigning namespace.
window.isg = isg;

isg.Graph = class{

    constructor(container) {
        this.ui = new isg.UI(container)
        this.data = new isg.Data();
    }
}

