/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */

Ext.ux.BubblePanel = Ext.extend(Ext.Panel, {
    baseCls: 'x-bubble',
    frame: true
});

MyDesktop = new Ext.app.App({

	init: function(){
		Ext.QuickTips.init();

        Ext.fly('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove: true, duration: 2 });
        /*
        var title = new Ext.ux.BubblePanel({
            bodyStyle: 'padding-left:8px; color:#0d2a59;',
            renderTo: 'bubbleCt',
            html: 'Alert!',
            width: 200,
            autoHeight: true
        });
        */
	},

	getModules : function(){
		return [
            new MyDesktop.MediaManager(),
            new MyDesktop.MediaSearch()
		];
	},

    getStartConfig : function(){
        return {
            title: 'Guest',
            iconCls: 'user',
            toolItems: [{
                text:'Settings',
                iconCls:'settings',
                scope:this
            },'-',{
                text:'Logout',
                iconCls:'logout',
                scope:this
            }]
        };
    }

});


MyDesktop.MediaManager = Ext.extend(Ext.app.Module, {

    id:'mediamanager-win',

    init : function(){
        this.launcher = {
            text: 'Media Manager',
            iconCls: 'icon-grid',
           // autoStart: true,
            handler: this.createWindow,
            scope: this
        }
    },

    createWindow : function(){
        var win = this.app.getDesktop().getWindow('mediamanager-win');
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        // Album toolbar
        var newIndex = 3;
        var tb = new Ext.Toolbar({
            items:[{
                text: 'New Album',
                iconCls: 'album-btn',
                handler: function(){
                    var node = root.appendChild(new Ext.tree.TreeNode({
                        text: 'Album ' + (++newIndex),
                        cls: 'album-node',
                        allowDrag: false
                    }));
                    tree.getSelectionModel().select(node);
                    setTimeout(function(){
                        ge.editNode = node;
                        ge.startEdit(node.ui.textNode);
                    }, 10);
                }
            }]
        });

        // set up the Album tree
        var tree = new Ext.tree.TreePanel({
             animate: true,
             enableDD: true,
             containerScroll: true,
             ddGroup: 'organizerDD',
             rootVisible: false,
             region: 'west',
             width: 200,
             split: true,
             title: 'My Albums',
             autoScroll: true,
             tbar: tb,
             margins: '5 0 5 5'
        });

        var root = new Ext.tree.TreeNode({
            text: 'Albums',
            allowDrag: false,
            allowDrop: false
        });
        tree.setRootNode(root);

        for ( var i = 1; i <= 4; i++ ) {
            root.appendChild(
                new Ext.tree.TreeNode({text:'Album '+i, cls:'album-node', allowDrag:false})
            );
        }

        // add an inline editor for the nodes
        var ge = new Ext.tree.TreeEditor(tree, {/* fieldconfig here */ }, {
            allowBlank:false,
            blankText:'A name is required',
            selectOnFocus:true
        });

        var view = new Ext.DataView({
            itemSelector: 'div.thumb-wrap',
            style: 'overflow:auto',
            multiSelect: true,
            plugins: new Ext.DataView.DragSelector({ dragSafe:true }),
            store: new Ext.data.JsonStore({
                url: '/data.json',
                autoLoad: true,
                root: 'images',
                id: 'name',
                fields:[
                    'name', 'url',
                    { name: 'shortName', mapping: 'name', convert: shortName }
                ]
            }),
            tpl: new Ext.XTemplate(
                '<tpl for=".">',
                '<div class="thumb-wrap" id="{name}">',
                '<div class="thumb"><img src="lib/ext-3.0.0/{url}" class="thumb-img"></div>',
                '<span>{shortName}</span></div>',
                '</tpl>'
            )
        });
        
        view.on('afterrender',function() {        
            new MyImageDragZone( this, {
                containerScroll: true,
                ddGroup: 'organizerDD'
            });
        }, view);

        var images = new Ext.Panel({
            id: 'images',
            region: 'center',
            margins:  '5 5 5 0',
            layout: 'fit',
            items: view
        });

        return this.app.getDesktop().createWindow({
            id: 'mediamanager-win',
            title: 'Media Manager',
            width: 600,
            height: 380,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            constrainHeader: true,
            layout: 'border',
            items: [
                tree, images
            ]
        });
    }

});

MyDesktop.MediaSearch = Ext.extend(Ext.app.Module, {

    id:'mediasearch-win',

    init : function(){
        this.launcher = {
            text: 'Media Search',
            iconCls: 'icon-grid',
            autoStart: true,
            handler: this.createWindow,
            scope: this
        }
    },

    createWindow : function(){
        var win = this.app.getDesktop().getWindow('mediasearch-win');
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        var ds = new Ext.data.JsonStore({
            url: '/imdb-search',
            autoLoad: false,
            root: 'results',
            id: 'name',
            fields:[
                'name', 'url',
                { name: 'shortName', mapping: 'name', convert: shortName }
            ]
        });
        var view = new Ext.DataView({
            itemSelector: 'div.thumb-wrap',
            style: 'overflow:auto',
            multiSelect: true,
            plugins: new Ext.DataView.DragSelector({ dragSafe:true }),
            store: ds,
            tpl: new Ext.XTemplate(
                '<tpl for=".">',
                '<div class="thumb-wrap" id="{name}">',
                '<div class="thumb"><img src="{url}" class="thumb-img"></div>',
                //'<div class="thumb"><img src="lib/ext-3.0.0/{url}" class="thumb-img"></div>',
                '<span>{shortName}</span></div>',
                '</tpl>'
            )
        });
        
        view.on('afterrender',function() {        
            new MyImageDragZone( this, {
                containerScroll: true,
                ddGroup: 'organizerDD'
            });
        }, view);

        return this.app.getDesktop().createWindow({
            id: 'mediasearch-win',
            title: 'Media Search',
            width: 600,
            height: 380,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            constrainHeader: true,
            layout: 'border',
            tbar: [
                'Search: ', ' ', /*
                new Ext.ux.SelectBox({
                    listClass:'x-combo-list-small',
                    width:90,
                    value:'Starts with',
                    id:'search-type',
                    store: new Ext.data.SimpleStore({
                        fields: ['text'],
                        expandData: true,
                        data : ['Starts with', 'Ends with', 'Any match']
                    }),
                    displayField: 'text'
                }), ' ', ' ', */
                new Ext.form.TextField({
                    store: ds,
                    width: 200,
                    emptyText: 'Search IMDB',
                    enableKeyEvents: true,
                    listeners: {
                        keyup: function(f, e) {
                            if (e.getKey() == e.ENTER)
                                ds.load({ params: { q: f.getValue() } });
                        }
                    }
                }) /*,
                new Ext.app.SearchField({
                    width: 300,
                    store: ds,
                    paramName: 'q'
                })*/
            ],
            bbar: new Ext.PagingToolbar({
                store: ds,
                pageSize: 22,
                displayInfo: true,
                displayMsg: 'Results {0} - {1} of {2}',
                emptyMsg: "No results to display"
            }),
            items: [{
                id: 'images',
                region: 'center',
                margins:  '5 5 5 0',
                layout: 'fit',
                items: view,
                autoScroll: true
            }]
        });
    }

});

Ext.namespace( 'Ext.app' );

Ext.app.SearchField = Ext.extend(Ext.form.TwinTriggerField, {
    initComponent : function(){
        if(!this.store.baseParams){
            this.store.baseParams = {};
        }
        Ext.app.SearchField.superclass.initComponent.call(this);
        this.on('specialkey', function(f, e){
            if(e.getKey() == e.ENTER){
                this.onTrigger2Click();
            }
        }, this);
    },

    validationEvent:false,
    validateOnBlur:false,
    trigger1Class:'x-form-clear-trigger',
    trigger2Class:'x-form-search-trigger',
    hideTrigger1:true,
    width:180,
    hasSearch : false,
    paramName : 'query',

    onTrigger1Click : function(){
        if(this.hasSearch){
            this.store.baseParams[this.paramName] = '';
            this.store.removeAll();
            this.el.dom.value = '';
            this.triggers[0].hide();
            this.hasSearch = false;
            this.focus();
        }
    },

    onTrigger2Click : function(){
        var v = this.getRawValue();
        if(v.length < 1){
            this.onTrigger1Click();
            return;
        }
        if(v.length < 2){
            Ext.Msg.alert('Invalid Search', 'You must enter a minimum of 2 characters to search the API');
            return;
        }
        this.store.baseParams[this.paramName] = v;
        var o = {start: 0};
        this.store.reload({params:o});
        this.hasSearch = true;
        this.triggers[0].show();
        this.focus();
    }
});


        /*
        return desktop.createWindow({
            id: 'mediamanager-win',
            title:'Grid Window',
            width:740,
            height:480,
            iconCls: 'icon-grid',
            shim:false,
            animCollapse:false,
            constrainHeader:true,
            layout: 'fit',
            items: [
                new Ext.grid.GridPanel({
                    border:false,
                    ds: new Ext.data.Store({
                        reader: new Ext.data.ArrayReader({}, [
                           {name: 'company'},
                           {name: 'price', type: 'float'},
                           {name: 'change', type: 'float'},
                           {name: 'pctChange', type: 'float'}
                        ]),
                        data: Ext.grid.dummyData
                    }),
                    cm: new Ext.grid.ColumnModel([
                        new Ext.grid.RowNumberer(),
                        {header: "Company", width: 120, sortable: true, dataIndex: 'company'},
                        {header: "Price", width: 70, sortable: true, renderer: Ext.util.Format.usMoney, dataIndex: 'price'},
                        {header: "Change", width: 70, sortable: true, dataIndex: 'change'},
                        {header: "% Change", width: 70, sortable: true, dataIndex: 'pctChange'}
                    ]),

                    viewConfig: {
                        forceFit:true
                    },
                    //autoExpandColumn:'company',

                    tbar:[{
                        text:'Add Something',
                        tooltip:'Add a new row',
                        iconCls:'add'
                    }, '-', {
                        text:'Options',
                        tooltip:'Blah blah blah blaht',
                        iconCls:'option'
                    },'-',{
                        text:'Remove Something',
                        tooltip:'Remove the selected item',
                        iconCls:'remove'
                    }]
                })
            ]
        });
        */
    


/**
 * Create a DragZone instance for our JsonView
 */
MyImageDragZone = function(view, config){
    this.view = view;
    MyImageDragZone.superclass.constructor.call(this, view.getEl(), config);
};
Ext.extend(MyImageDragZone, Ext.dd.DragZone, {
    // We don't want to register our image elements, so let's 
    // override the default registry lookup to fetch the image 
    // from the event instead
    getDragData : function(e){
        var target = e.getTarget('.thumb-wrap');
        if(target){
            var view = this.view;
            if(!view.isSelected(target)){
                view.onClick(e);
            }
            var selNodes = view.getSelectedNodes();
            var dragData = {
                nodes: selNodes
            };
            if(selNodes.length == 1){
                dragData.ddel = target;
                dragData.single = true;
            }else{
                var div = document.createElement('div'); // create the multi element drag "ghost"
                div.className = 'multi-proxy';
                for(var i = 0, len = selNodes.length; i < len; i++){
                    div.appendChild(selNodes[i].firstChild.firstChild.cloneNode(true)); // image nodes only
                    if((i+1) % 3 == 0){
                        div.appendChild(document.createElement('br'));
                    }
                }
                var count = document.createElement('div'); // selected image count
                count.innerHTML = i + ' items selected';
                div.appendChild(count);
                
                dragData.ddel = div;
                dragData.multi = true;
            }
            return dragData;
        }
        return false;
    },

    // this method is called by the TreeDropZone after a node drop
    // to get the new tree node (there are also other way, but this is easiest)
    getTreeNode : function(){
        var treeNodes = [];
        var nodeData = this.view.getRecords(this.dragData.nodes);
        for(var i = 0, len = nodeData.length; i < len; i++){
            var data = nodeData[i].data;
            treeNodes.push(new Ext.tree.TreeNode({
                text: data.name,
                icon: '../view/'+data.url,
                data: data,
                leaf:true,
                cls: 'image-node'
            }));
        }
        return treeNodes;
    },
    
    // the default action is to "highlight" after a bad drop
    // but since an image can't be highlighted, let's frame it 
    afterRepair:function(){
        for(var i = 0, len = this.dragData.nodes.length; i < len; i++){
            Ext.fly(this.dragData.nodes[i]).frame('#8db2e3', 1);
        }
        this.dragging = false;    
    },
    
    // override the default repairXY with one offset for the margins and padding
    getRepairXY : function(e){
        if(!this.dragData.multi){
            var xy = Ext.Element.fly(this.dragData.ddel).getXY();
            xy[0]+=3;xy[1]+=3;
            return xy;
        }
        return false;
    }
});

// Utility functions

function shortName(name){
    if(name.length > 15){
        return name.substr(0, 12) + '...';
    }
    return name;
};

/**
 * @class Ext.DataView.LabelEditor
 * @extends Ext.Editor
 * 
 */
Ext.DataView.LabelEditor = Ext.extend(Ext.Editor, {
    alignment: "tl-tl",
    hideEl : false,
    cls: "x-small-editor",
    shim: false,
    completeOnEnter: true,
    cancelOnEsc: true,
    labelSelector: 'span.x-editable',
    
    constructor: function(cfg, field){
        Ext.DataView.LabelEditor.superclass.constructor.call(this,
            field || new Ext.form.TextField({
                allowBlank: false,
                growMin:90,
                growMax:240,
                grow:true,
                selectOnFocus:true
            }), cfg
        );
    },
    
    init : function(view){
        this.view = view;
        view.on('render', this.initEditor, this);
        this.on('complete', this.onSave, this);
    },

    initEditor : function(){
        this.view.on({
            scope: this,
            containerclick: this.doBlur,
            click: this.doBlur
        });
        this.view.getEl().on('mousedown', this.onMouseDown, this, {delegate: this.labelSelector});
    },
    
    doBlur: function(){
        if(this.editing){
            this.field.blur();
        }
    },

    onMouseDown : function(e, target){
        if(!e.ctrlKey && !e.shiftKey){
            var item = this.view.findItemFromChild(target);
            e.stopEvent();
            var record = this.view.store.getAt(this.view.indexOf(item));
            this.startEdit(target, record.data[this.dataIndex]);
            this.activeRecord = record;
        }else{
            e.preventDefault();
        }
    },

    onSave : function(ed, value){
        this.activeRecord.set(this.dataIndex, value);
    }
});


Ext.DataView.DragSelector = function(cfg){
    cfg = cfg || {};
    var view, proxy, tracker;
    var rs, bodyRegion, dragRegion = new Ext.lib.Region(0,0,0,0);
    var dragSafe = cfg.dragSafe === true;

    this.init = function(dataView){
        view = dataView;
        view.on('render', onRender);
    };

    function fillRegions(){
        rs = [];
        view.all.each(function(el){
            rs[rs.length] = el.getRegion();
        });
        bodyRegion = view.el.getRegion();
    }

    function cancelClick(){
        return false;
    }

    function onBeforeStart(e){
        return !dragSafe || e.target == view.el.dom;
    }

    function onStart(e){
        view.on('containerclick', cancelClick, view, {single:true});
        if(!proxy){
            proxy = view.el.createChild({cls:'x-view-selector'});
        }else{
            proxy.setDisplayed('block');
        }
        fillRegions();
        view.clearSelections();
    }

    function onDrag(e){
        var startXY = tracker.startXY;
        var xy = tracker.getXY();

        var x = Math.min(startXY[0], xy[0]);
        var y = Math.min(startXY[1], xy[1]);
        var w = Math.abs(startXY[0] - xy[0]);
        var h = Math.abs(startXY[1] - xy[1]);

        dragRegion.left = x;
        dragRegion.top = y;
        dragRegion.right = x+w;
        dragRegion.bottom = y+h;

        dragRegion.constrainTo(bodyRegion);
        proxy.setRegion(dragRegion);

        for(var i = 0, len = rs.length; i < len; i++){
            var r = rs[i], sel = dragRegion.intersect(r);
            if(sel && !r.selected){
                r.selected = true;
                view.select(i, true);
            }else if(!sel && r.selected){
                r.selected = false;
                view.deselect(i);
            }
        }
    }

    function onEnd(e){
        if (!Ext.isIE) {
            view.un('containerclick', cancelClick, view);    
        }        
        if(proxy){
            proxy.setDisplayed(false);
        }
    }

    function onRender(view){
        tracker = new Ext.dd.DragTracker({
            onBeforeStart: onBeforeStart,
            onStart: onStart,
            onDrag: onDrag,
            onEnd: onEnd
        });
        tracker.initEl(view.el);
    }
};

/**
 * Makes a ComboBox more closely mimic an HTML SELECT.  Supports clicking and dragging
 * through the list, with item selection occurring when the mouse button is released.
 * When used will automatically set {@link #editable} to false and call {@link Ext.Element#unselectable}
 * on inner elements.  Re-enabling editable after calling this will NOT work.
 *
 * @author Corey Gilmore
 * http://extjs.com/forum/showthread.php?t=6392
 *
 * @history 2007-07-08 jvs
 * Slight mods for Ext 2.0
 */
Ext.ux.SelectBox = function(config){
    this.searchResetDelay = 1000;
    config = config || {};
    config = Ext.apply(config || {}, {
        editable: false,
        forceSelection: true,
        rowHeight: false,
        lastSearchTerm: false,
        triggerAction: 'all',
        mode: 'local'
    });

    Ext.ux.SelectBox.superclass.constructor.apply(this, arguments);

    this.lastSelectedIndex = this.selectedIndex || 0;
};

Ext.extend(Ext.ux.SelectBox, Ext.form.ComboBox, {
    lazyInit: false,
    initEvents : function(){
        Ext.ux.SelectBox.superclass.initEvents.apply(this, arguments);
        // you need to use keypress to capture upper/lower case and shift+key, but it doesn't work in IE
        this.el.on('keydown', this.keySearch, this, true);
        this.cshTask = new Ext.util.DelayedTask(this.clearSearchHistory, this);
    },

    keySearch : function(e, target, options) {
        var raw = e.getKey();
        var key = String.fromCharCode(raw);
        var startIndex = 0;

        if( !this.store.getCount() ) {
            return;
        }

        switch(raw) {
            case Ext.EventObject.HOME:
                e.stopEvent();
                this.selectFirst();
                return;

            case Ext.EventObject.END:
                e.stopEvent();
                this.selectLast();
                return;

            case Ext.EventObject.PAGEDOWN:
                this.selectNextPage();
                e.stopEvent();
                return;

            case Ext.EventObject.PAGEUP:
                this.selectPrevPage();
                e.stopEvent();
                return;
        }

        // skip special keys other than the shift key
        if( (e.hasModifier() && !e.shiftKey) || e.isNavKeyPress() || e.isSpecialKey() ) {
            return;
        }
        if( this.lastSearchTerm == key ) {
            startIndex = this.lastSelectedIndex;
        }
        this.search(this.displayField, key, startIndex);
        this.cshTask.delay(this.searchResetDelay);
    },

    onRender : function(ct, position) {
        this.store.on('load', this.calcRowsPerPage, this);
        Ext.ux.SelectBox.superclass.onRender.apply(this, arguments);
        if( this.mode == 'local' ) {
            this.calcRowsPerPage();
        }
    },

    onSelect : function(record, index, skipCollapse){
        if(this.fireEvent('beforeselect', this, record, index) !== false){
            this.setValue(record.data[this.valueField || this.displayField]);
            if( !skipCollapse ) {
                this.collapse();
            }
            this.lastSelectedIndex = index + 1;
            this.fireEvent('select', this, record, index);
        }
    },

    render : function(ct) {
        Ext.ux.SelectBox.superclass.render.apply(this, arguments);
        if( Ext.isSafari ) {
            this.el.swallowEvent('mousedown', true);
        }
        this.el.unselectable();
        this.innerList.unselectable();
        this.trigger.unselectable();
        this.innerList.on('mouseup', function(e, target, options) {
            if( target.id && target.id == this.innerList.id ) {
                return;
            }
            this.onViewClick();
        }, this);

        this.innerList.on('mouseover', function(e, target, options) {
            if( target.id && target.id == this.innerList.id ) {
                return;
            }
            this.lastSelectedIndex = this.view.getSelectedIndexes()[0] + 1;
            this.cshTask.delay(this.searchResetDelay);
        }, this);

        this.trigger.un('click', this.onTriggerClick, this);
        this.trigger.on('mousedown', function(e, target, options) {
            e.preventDefault();
            this.onTriggerClick();
        }, this);

        this.on('collapse', function(e, target, options) {
            Ext.getDoc().un('mouseup', this.collapseIf, this);
        }, this, true);

        this.on('expand', function(e, target, options) {
            Ext.getDoc().on('mouseup', this.collapseIf, this);
        }, this, true);
    },

    clearSearchHistory : function() {
        this.lastSelectedIndex = 0;
        this.lastSearchTerm = false;
    },

    selectFirst : function() {
        this.focusAndSelect(this.store.data.first());
    },

    selectLast : function() {
        this.focusAndSelect(this.store.data.last());
    },

    selectPrevPage : function() {
        if( !this.rowHeight ) {
            return;
        }
        var index = Math.max(this.selectedIndex-this.rowsPerPage, 0);
        this.focusAndSelect(this.store.getAt(index));
    },

    selectNextPage : function() {
        if( !this.rowHeight ) {
            return;
        }
        var index = Math.min(this.selectedIndex+this.rowsPerPage, this.store.getCount() - 1);
        this.focusAndSelect(this.store.getAt(index));
    },

    search : function(field, value, startIndex) {
        field = field || this.displayField;
        this.lastSearchTerm = value;
        var index = this.store.find.apply(this.store, arguments);
        if( index !== -1 ) {
            this.focusAndSelect(index);
        }
    },

    focusAndSelect : function(record) {
        var index = typeof record === 'number' ? record : this.store.indexOf(record);
        this.select(index, this.isExpanded());
        this.onSelect(this.store.getAt(record), index, this.isExpanded());
    },

    calcRowsPerPage : function() {
        if( this.store.getCount() ) {
            this.rowHeight = Ext.fly(this.view.getNode(0)).getHeight();
            this.rowsPerPage = this.maxHeight / this.rowHeight;
        } else {
            this.rowHeight = false;
        }
    }

});

