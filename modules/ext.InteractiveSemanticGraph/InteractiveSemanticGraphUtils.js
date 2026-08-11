isg.util = class {
    constructor() {
    }

    static getShortUid() {
        return (performance.now().toString(36) + Math.random().toString(36)).replace(/\./g, "");
    }

    static uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    //Removes the given value from the given array
    static removeItemFromArray(arr, value) {
        var index = arr.indexOf(value);
        if (index > -1) {
            arr.splice(index, 1);
        }
        return arr;
    }

    //Creates API query Url with the given root and properties
    //root: string - the root node title
    //properties: list - the property list to query
    //config: dict
    //  query_limit: int - max results
    static getSmwQuery(root, properties, config) {
        if (properties[0] === "-Category") properties[0] = "Category";
        else if (root.startsWith("Category:")) root = ":" + root; //[[Category:X]] queries pages within this category, [[:Category:X]] the category itself
        var url = mw.config.get("wgScriptPath") + `/api.php?action=ask&query=[[${encodeURIComponent(root)}]]`;
        var propertiesVar = '';
        propertiesVar += '|?' + ".Display title of" + "=" + "Display title of"; //explicit query for display title due to slow update of the displaytitle page field 
        for (var i = 0; i < properties.length; i++) {
            propertiesVar += '|?' + encodeURIComponent(properties[i]) + "=" + encodeURIComponent(properties[i]); //explicit label overwrites property display title. ToDo: extrakt label in result and get corresponding printout
            propertiesVar += '|?' + encodeURIComponent(properties[i] + ".Display title of") + "=" + encodeURIComponent(properties[i] + ".Display title of"); //explicit query for display title due to slow update of the displaytitle page field 
            //propertiesVar += '|?' + encodeURIComponent(properties[i] + ".HasLabel#LOCL") + "=" + encodeURIComponent(properties[i] + ".HasLabel"); //explicit query for label in user language 
	    propertiesVar += '|?' + encodeURIComponent(properties[i] + ".Equivalent URI") + "=" + encodeURIComponent(properties[i] + ".Equivalent URI");
        }
        url = url + propertiesVar;
        if (config.query_limit) url += "|limit=" + config.query_limit;
        url += '&format=json';
        return url;
    }

    //Creates an API query Url that matches a single property as a condition in the
    //opposite direction, instead of projecting it as a printout.
    //SMW will not project a property that has no Property: page when its values live
    //on a subobject, so the forward printout of getSmwQuery() comes back empty. The
    //same property still matches as a condition in both directions. Every result row
    //is then one target page carrying its own fulltext, fullurl, exists and
    //displaytitle, rather than an array nested under a printout.
    //root: string - the node the edge starts from
    //properties: string - a single property, with or without a leading "-"
    //config: dict
    //  query_limit: int - max results
    static getSmwInverseQuery(root, property, config) {
        //reverseLabel() toggles the prefix, so a forward property becomes the inverse
        //condition [[-P::root]] and an already inverse one becomes [[P::root]]
        var condition = isg.util.reverseLabel(property);
        var url = mw.config.get("wgScriptPath") + `/api.php?action=ask&query=[[${encodeURIComponent(condition)}::${encodeURIComponent(root)}]]`;
        url += '|?' + encodeURIComponent("Display title of") + "=" + encodeURIComponent("Display title of");
        url += '|?' + encodeURIComponent("Equivalent URI") + "=" + encodeURIComponent("Equivalent URI");
        if (config.query_limit) url += "|limit=" + config.query_limit;
        url += '&format=json';
        return url;
    }

    //Returns the first value of a printout of a result row as a string, or "" when the
    //printout is absent, empty or not a plain value.
    static firstPrintoutValue(row, key) {
        var values = row.printouts ? row.printouts[key] : undefined;
        if (!values || values.length === 0) return "";
        return typeof values[0] === "string" ? values[0] : "";
    }

    //Given Label is reversed with "-" or "-" is removed
    static reverseLabel(label) {
        if (label[0] == "-") {
            return label.substring(1);
        } else {
            return "-" + label;
        }
    }

    static isLabelReversed(label) {
        if (label[0] == "-") {
            return true;
        } else {
            return false;
        }
    }

    //Cartesian Product of arrays
    static cartesianProduct(arr) {
        return arr.reduce(function (a, b) {
            return a.map(function (x) {
                return b.map(function (y) {
                    return x.concat([y]);
                });
            }).reduce(function (a, b) { return a.concat(b); }, []);
        }, [[]]);
    }

    //Copies a text into the clipboard
    static copyToClipboad(copyText) {
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
        document.body.removeChild(input);
    }

};

isg.util.Color = class {
    //Function for random colors

    static golden = 0.618033988749895;

    constructor() {
        this.h = Math.random();
    }
    randomHSL() {

        this.h += isg.util.Color.golden;
        this.h %= 1;
        return "hsla(" + (360 * this.h) + "," + "70%," + "80%,1)";
    }
};
