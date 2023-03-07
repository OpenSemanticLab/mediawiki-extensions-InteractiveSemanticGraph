/*@nomin*/
/* 
hint: ResourceLoader minifier does not support ES6 yet, therefore skip minification  with "nomin" (see https://phabricator.wikimedia.org/T255556)
*/

isg.UI = class {


    constructor(container, config = { onLegendClick: undefined, legacy_mode: false }) {
        this.config = config;
        this.container = container;
        this.container.style.position = "relative";
        this.container.style.display = "inline-block";
        this.init();
    }

    init() {

        // If the document is clicked somewhere it hides the context menu
        $(document).bind("mousedown", function (e) {
            // If the clicked element is not the menu
            if (!$(e.target).parents(".custom-menu").length > 0) {
                // Hide it
                $(".custom-menu").hide(100);
            }
        });

        this.legendClickEvent = new CustomEvent("legend-click", {
            detail: {
                hazcheeseburger: true
            }
        });

        this.createEditorElements();
    }

    createInfoSection() {
        var tip = '<p><strong>Hinweis:</strong> Um sich einen Pfad zwischen zwei Knoten ausgeben zu lassen, <em>Strg</em> gedrückt halten und die gewünschten zwei Knoten mit der <em>linken Maustaste</em> anklicken. </p>'
        this.container.insertAdjacentHTML('afterbegin', tip);
    }

    createLegend(properties, colors) {
        this.legendDiv = document.createElement("div");

        this.legendDiv.style.width = '100%';
        this.legendDiv.style.position = 'relative';
        this.legendDiv.style.display = 'inline-block';
        this.legendDiv.id = "legendContainer";
        var legendColors = {};

        for (var i = 0; i < properties.length; i++) { //create legend entries only for non-inversed properties
            legendColors[properties[i]] = colors[i];
            this.addLegendEntry(properties[i], properties[i], colors[i])
        }

        this.container.append(this.legendDiv);
        return legendColors;
    }

    addLegendEntry(id, label, color) {
        var propertyContainer = document.createElement("div");
        var propertyColor = document.createElement("div");
        var propertyName = document.createElement("div");
        propertyContainer.className = "legend-element-container";
        propertyContainer.id = id;
        propertyColor.className = "color-container";
        propertyName.className = "name-container";
        propertyColor.style.float = "left";
        propertyName.style.float = "left";
        propertyColor.style.border = "1px solid black";
        propertyName.style.border = "1px solid black";
        propertyColor.style.background = color;
        propertyColor.innerHTML = "";
        propertyName.innerHTML = label;
        propertyColor.style.width = "30px";
        propertyColor.style.height = "30px";
        propertyName.style.height = "30px";
        propertyName.style.background = '#DEF';
        propertyContainer.dataset.active = true;
        //propertyName.text-align = 'center';
        propertyContainer.paddinng = '5px 5px 5px 5px';
        propertyName.addEventListener("click", event => this.dispatchEvent_LegendClick(event, id));
        propertyColor.addEventListener("click", event => this.dispatchEvent_LegendClick(event, id));
        this.legendDiv.append(propertyContainer);
        propertyContainer.append(propertyColor);
        propertyContainer.append(propertyName);
    }

    dispatchEvent_LegendClick(event, id) {
        //toogle color
        var container = document.querySelector('#' + id);
        var propertyName = $(container).find('.name-container')[0];

        if (container.dataset.active === 'true') {
            container.dataset.active = false;
            propertyName.style.background = '#FFFFFF';
        }
        else {
            container.dataset.active = true;
            propertyName.style.background = '#DEF';
        }
        // create and dispatch the event
        if (this.config.onLegendClick) this.config.onLegendClick(id);
        //var event = new CustomEvent("legend-click", {
        //    id: id
        //});
        //this.dispatchEvent(event);
    }

    createEditorElements() {
        //HTML for the manipulation popups
        var editHtml = '' +
            '<div id="node-popUp" style="width: 550px; height: 200px;">' +
            '  <span id="node-operation" style="cursor: move;">node</span> <br />' +
            '  <table style="margin: auto">' +
            '    <tbody>' +
            '      <tr>' +
            '        <td>label</td>' +
            '        <td><div id="isg-node-label-autocomplete"><input id="node-label" class="autocomplete-input" style="width: 480px;" value="" /></input><ul class="autocomplete-result-list"></ul></div></td>' +
            '      </tr>' +
            '    </tbody>' +
            '  </table>' +
            '  <input type="button" value="save" id="node-saveButton" />' +
            '  <input type="button" value="cancel" id="node-cancelButton" />' +
            '</div>' +
            '' +
            '<div id="edge-popUp" style="width: 350px; height: 200px;">' +
            '  <span id="edge-operation" style="cursor: move;">edge</span> <br />' +
            '  <table style="margin: auto">' +
            '    <tbody>' +
            '      <tr>' +
            '        <td>label</td>' +
            '        <td><div id="isg-edge-label-autocomplete"><input id="edge-label" class="autocomplete-input" style="width: 280px;" value="" /></input><ul class="autocomplete-result-list"></ul></div></td>' +
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

        var query_prefix = "[[Category:Entity]]";
        if (this.config.legacy_mode) query_prefix = "[[Category:KB/Term]]";

        //init autocompletion
        mwjson.editor.createAutocompleteInput({
            div_id: "isg-node-label-autocomplete",
            query: (input) => { return query_prefix + "[[Display_title_of::~*" + input + "*]][[!~*QUERY*]]|?Display_title_of=HasDisplayName|?HasDescription|?HasImage|limit=1000"; },
            minInputLen: 1,
            filter: (result, input) => {
                if (result.printouts['HasDisplayName'][0]) return result.printouts['HasDisplayName'][0].toLowerCase().includes(input.toLowerCase());
                else return result.fulltext.split(":")[result.fulltext.split(":").length - 1].toLowerCase().includes(input.toLowerCase());
            },
            _renderResult: (result, props) => `
                            <li ${props}>
                                <div class="wiki-title">
                                    ${result.printouts['HasDisplayName'][0] ? result.printouts['HasDisplayName'][0] + ' (' + result.fulltext + ')' : result.fulltext}
                                </div>
                            </li>
                            <div class="wiki-snippet">
                                ${result.printouts['HasDescription'][0] ? result.printouts['HasDescription'][0] : ''}
                            </div>
                            `,
            renderMode: "wikitext",
            renderResult: (result, props) => {
                var wikitext = "";
                if (result.printouts['HasImage'][0]) wikitext += `[[${result.printouts['HasImage'][0]['fulltext']}|right|x66px|link=]]`;
                wikitext += `</br> [[${result.fulltext}]]`;
                if (result.printouts['HasDescription'][0]) wikitext += `</br>${result.printouts['HasDescription'][0]}`;
                return wikitext;
            },
            getResultValue: result => {
                if (result.printouts['HasDisplayName'][0]) return result.printouts['HasDisplayName'][0];
                else return result.fulltext.split(":")[result.fulltext.split(":").length - 1];
            },
            onSubmit: result => document.querySelector('#node-label').dataset.result = JSON.stringify(result)
        });

        mwjson.editor.createAutocompleteInput({
            div_id: "isg-edge-label-autocomplete",
            query: (input) => { return "[[Category:ObjectProperty]]OR[[Category:QuantityProperty]]|?Display_title_of=HasDisplayName|?HasDescription|limit=1000"; },
            filter: (result, input) => { return result.fulltext.split(":")[result.fulltext.split(":").length - 1].toLowerCase().includes(input.toLowerCase()); },
            _renderResult: (result, props) => `
                            <li ${props}>
                                <div class="wiki-title">
                                    ${result.printouts['HasDisplayName'][0] ? result.printouts['HasDisplayName'][0] + ' (' + result.fulltext + ')' : mwjson.util.stripNamespace(result.fulltext)}
                                </div>
                            </li>
                            ${result.printouts['HasDescription'][0] ? '<div class="wiki-snippet">' + result.printouts['HasDescription'][0] + '</div>' : ''}
                            `,
            renderMode: "wikitext",
            renderResult: (result, props) => {
                var wikitext = "";
                wikitext += `[[${result.fulltext}|${mwjson.util.stripNamespace(result.fulltext)}]]`;
                if (result.printouts['HasDescription'][0]) wikitext += `</br>${result.printouts['HasDescription'][0]}`;
                return wikitext;
            },
            getResultValue: result => result.fulltext.split(":")[result.fulltext.split(":").length - 1],
            onSubmit: result => document.querySelector('#edge-label').dataset.result = JSON.stringify(result)
        });
    }

    createPermalinkButton() {
        var permalinkButton = document.createElement("button");

        permalinkButton.innerHTML = "Copy permalink";
        permalinkButton.style.width = "auto";
        permalinkButton.style.height = "auto";
        this.container.appendChild(permalinkButton);
        return permalinkButton;
    }

    createSaveButton() {
        var saveBtn = document.createElement("button");

        saveBtn.innerHTML = "Save changes";
        saveBtn.style.width = "auto";
        saveBtn.style.height = "auto";
        this.container.appendChild(saveBtn);
        return saveBtn;
    }

    createInfoDialog(text) {
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
            message: '' + text,
            verbose: true,
            actions: [{
                action: 'accept',
                label: 'Okay',
                flags: 'primary'
            }]
        });
        /*OO.ui.alert( "" + text ).done( function () {
            console.log( text );
        } );*/
    }

    //function to make the manipulation popups draggable
    dragElement(elmnt) {
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