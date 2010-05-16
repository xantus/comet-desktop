Ext.ns( 'CometDesktop.ux.admin' );

CometDesktop.ux.admin.manageStore   = Ext.extend(Ext.data.JsonStore, {
	constructor: function(config) {
        CometDesktop.ux.admin.manageStore.superclass.constructor.call(this, Ext.apply({
            url: config.url,
			id: config.id,
			reader: new Ext.data.JsonReader({
        		totalProperty: 'total', 
        		fields: config.fields,
				root: config.root
    		}),
			baseParams: config.baseParams
			
        }, config));
		this.on('load', this.showSuccess, {
			scope: this
		});
		
		this.on('exception', this.showError, this);
    },
	
	showError:function(store,options,response,e) {
		 
	},
	showSuccess:function(store, records, options) {
		 
	}
    // }}}
    // any other added/overrided methods
}); // eo extend
 
// register an xtype with this class
Ext.reg('managestore', CometDesktop.ux.admin.manageStore);

CometDesktop.ux.admin.manageGroupStore   = Ext.extend(Ext.data.GroupingStore, {
	constructor: function(config) {
        CometDesktop.ux.admin.manageGroupStore.superclass.constructor.call(this, Ext.apply({
            url: this.url,
			autoDestroy: true,
			loadMask: true,
			id: this.id,
			root: this.root,
			fields: this.fields,
			baseParams: this.baseParams,
			scope: this
        }, config));
		this.on('load', this.showSuccess, {
			scope: this
		});
		this.on('exception', this.showError, this);
    },
	showError:function(store,options,response,e) {
		
	},
	showSuccess:function(store,options,response,e) {
		 
	}
    // }}}
    // any other added/overrided methods
}); // eo extend
 
// register an xtype with this class
Ext.reg('managegroupstore', CometDesktop.ux.admin.manageGroupStore);

CometDesktop.ux.admin.dummyGroupData = {
	data: [{
		group_name: 'Users',
		group_count: '1',
		creation_date: new Date(Date.parse('10/15/2006'))
	}]
};

// Grig for grouping and managing the User groups and their properties
CometDesktop.ux.admin.GroupAdminGrid = Ext.extend(Ext.grid.EditorGridPanel, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			//title: 'Groups',
	        columns: [
	            {header: "Group Name", width: 100, dataIndex: 'group_name', sortable: true,
				 editor: new Ext.form.TextField({
                    allowBlank: false
                 })
				},
				{header: "Total Members", width: 120, dataIndex: 'member_count', sortable: true},
	      		{header: "Created", width: 50, dataIndex: 'creation_date', sortable: true}
	        ],
			
			sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
			// Note the use of a storeId, this will register thisStore
			// with the StoreMgr and allow us to retrieve it very easily.
			store: {
				xtype: 'managestore',
				url:  '/desktop/useradmin',
			    root: 'data',
			    fields: [ 'group_name','member_count','creation_date'],
				baseParams: { 
					test: 'test'	
				},		
				data: CometDesktop.ux.admin.dummyGroupData		
			},
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			},
			tbar: [{
					text:'Add Group'
					,xtype: 'button'
					,iconCls:'add_item'
					,scope: this
					,handler: function(){
							var s = this.store;
							var r = new (s.recordType)({group_name:'', group_count:0, creation_date: new Date()});
							s.add(r);
							this.startEditing(s.indexOf(r), 0);
					}
				},
				'-',{
					text: 'Remove Group',
					xtype: 'button',
					iconCls: 'del_item',
					handler: function(){
						var grid = this.findParentByType('groupadmingrid');
						var rec = grid.getSelectionModel().getSelected();
						if (!rec) {
							return false;
						}
						// Remove the User from the db
						Ext.Ajax.request({
							url: grid.getStore().url,
							params: {},
							scope: this,
							success: function(response, options){
								var responseObject = Ext.decode(response.responseText);
								if (responseObject.data) {
									if (responseObject.data.failure) {
										Ext.Msg.alert("User Removal Failed", response.responseText);
										return false;
									}
								}
								grid.store.remove(rec);
								grid.store.commitChanges();
							},
							failure: function(response, options){
								Ext.Msg.alert(options.windowStrings.title, options.windowStrings.message + response.responseText);
							}
							
						});
						
					}
				}]
		});
		// finally call the superclasses implementation
		CometDesktop.ux.admin.GroupAdminGrid.superclass.initComponent.call(this);
	}
});

Ext.reg('groupadmingrid', CometDesktop.ux.admin.GroupAdminGrid);


CometDesktop.ux.admin.dummyGroupPropertySourceData = {
        "(name)": "My Object",
        "Created": new Date(Date.parse('10/15/2006')),
        "Available": false,
        "Version": .01,
        "Description": "A test object"
};

CometDesktop.ux.admin.GroupPropertyGrid = Ext.extend(Ext.grid.PropertyGrid, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			// Pass in a column model definition
			// Note that the DetailPageURL was defined in the record definition but is not used
			// here. That is okay.
			//title: 'Group Properties',
			source: CometDesktop.ux.admin.dummyGroupPropertySourceData,
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			},
			tbar: [{
				text:'Save'
				,xtype: 'button'
				,iconCls:'save'
				,scope: this
				,handler: function(){
						Ext.MessageBox.prompt('Add Property', 'Enter group name:', this.addProperty, this);
				}
			}]
		});
		// finally call the superclasses implementation
		CometDesktop.ux.admin.GroupPropertyGrid.superclass.initComponent.call(this);
	},
	onRender:function() {
 		CometDesktop.ux.admin.GroupPropertyGrid.superclass.onRender.apply(this, arguments);
	}, // eo function onRender
	initEvents: function(){
		CometDesktop.ux.admin.GroupPropertyGrid.superclass.initEvents.call(this);
		// any additional load click processing here
	}, 
	addProperty: function(btn, txt){
		if (btn == 'ok' && txt != '') {
			var s = this.store;
			var u = new s.recordType({
				group_name: txt,
				user_name: -1
			});
			s.add(u);
		}
	},
	// add a method which updates the details
	updateProperty: function(data) {
		//this.tpl.overwrite(this.body, data);
	}
});

Ext.reg('grouppropertygrid', CometDesktop.ux.admin.GroupPropertyGrid);

CometDesktop.ux.admin.GroupMasterDetail = Ext.extend(Ext.Panel, {
	// override initComponent
	initComponent: function() {
		// used applyIf rather than apply so user could
		// override the defaults
		Ext.applyIf(this, {
			
			layout: 'border',
			items: [{
				xtype: 'groupadmingrid',
				itemId: 'groupGridPanel',
				region: 'west',
				frame: true,
				width: 500
			},{
				xtype: 'panel',
				itemId: 'groupDetailPanel',
				region: 'center',
				layout:'vbox',
				border: false,
				//hideBorders: true,
				layoutConfig: {
				    align : 'stretch',
				    pack  : 'start'
				},
				items: [{
					xtype: 'grouppropertygrid',
					itemId: 'groupPropertyGrid',
					frame: true,
					flex: 1
				}]
			}]
		})
		// call the superclass's initComponent implementation
		CometDesktop.ux.admin.GroupMasterDetail.superclass.initComponent.call(this);
	},
	// override initEvents
	initEvents: function() {
		// call the superclass's initEvents implementation
		CometDesktop.ux.admin.GroupMasterDetail.superclass.initEvents.call(this);

		var resultGridSm = this.getComponent('groupGridPanel').getSelectionModel();
		resultGridSm.on('rowselect', this.onRowSelect, this);
		resultGridSm.on('rowdeselect', this.onRowDeSelect, this);
	},
	onRowSelect: function(sm, rowIdx, r) {
		var groupDetailPanel    = this.getComponent('groupDetailPanel');
		var groupPropertyGrid   = groupDetailPanel.getComponent('groupPropertyGrid');
		
		this.loadProperty(groupPropertyGrid, r.data);
	},
	onRowDeSelect: function(sm, rowIdx, r) {
		var detailPanel         = this.getComponent('groupDetailPanel');
		var groupPropertyGrid   = detailPanel.getComponent('groupPropertyGrid');
		
		//groupPropertyGrid.clearProperty();
	},
	loadProperty: function(grid, data){
		grid.setSource(data);
	}
});

Ext.reg('groupmasterdetail', CometDesktop.ux.admin.GroupMasterDetail);

// Drop Zone for the User Group grouping grid
CometDesktop.ux.admin.GridDropZone = function(grid, config) {
 	this.grid = grid;
 	CometDesktop.ux.admin.GridDropZone.superclass.constructor.call(this, grid.view.scroller.dom, config);
};
 
Ext.extend(CometDesktop.ux.admin.GridDropZone, Ext.dd.DropZone, {
  	 /*onNodeOver : function(target, dd, e, data){ 
            return Ext.dd.DropZone.prototype.dropAllowed;
     },
	 onNodeDrop : function(target, dd, e, data){
            var rowIndex = this.grid.getView().findRowIndex(target);
            var r = this.grid.getStore().getAt(rowIndex);
            Ext.Msg.alert('Drop gesture', 'Dropped Record id ' + data.draggedRecord.id +
                ' on Record id ' + r.id);
            return true;
     },*/
	 onContainerOver:function(dd, e, data) {
		//console.info(dd.getDragData(e).rowIndex);
	 	return dd.grid !== this.grid ? this.dropAllowed : this.dropNotAllowed;
	 }, // eo function onContainerOver
	 onContainerDrop:function(dd, e, data) {
		 if(dd.grid !== this.grid) {
		 	 var u = new this.grid.store.recordType({
			    group_name        : 'test',
            	user_name         : data.selections[0].data.vch_user_name,
        	 });
			 this.grid.store.add(u);
			 this.grid.onRecordsDrop(dd.grid, data.selections);
			 return true;
		 } else {
		 	return false;
		 }
	 }, // eo function onContainerDrop
	 containerScroll:true
  
});

CometDesktop.ux.admin.dummyData = {
	data: [{
		vch_user_name: 'root',
		vch_email: 'foo@bar.com',
		fk_roles_iroleid: 'Administrator'
	}]
};

CometDesktop.ux.admin.UserAdminGrid = Ext.extend(Ext.grid.EditorGridPanel, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			title: 'Users',
	        columns: [
	            {header: "UserName", width: 100, dataIndex: 'vch_user_name', sortable: true,
				 editor: new Ext.form.TextField({
                    allowBlank: false
                 })
				},
				{header: "Email", width: 120, dataIndex: 'vch_email', sortable: true,
				 editor: new Ext.form.TextField({
                    allowBlank: false,
					vtype: 'email'
                 })
				},
	      		{header: "Role", width: 50, dataIndex: 'fk_roles_iroleid', sortable: true}
	        ],
			enableDragDrop:true,
			ddGroup: 'gridToGroup',
			ddText: 'drag and drop user to group', 
			sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
			// Note the use of a storeId, this will register thisStore
			// with the StoreMgr and allow us to retrieve it very easily.
			store: {
				xtype: 'managestore',
				url:  '/desktop/useradmin',
			    root: 'data',
			    fields: [ 'vch_user_name','vch_email','fk_roles_iroleid'],
				baseParams: { 
					test: 'test'	
				},		
				data: CometDesktop.ux.admin.dummyData		
			},
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			},
			tbar: [{
					text:'Add User'
					,xtype: 'button'
					,iconCls:'add_item'
					,scope: this
					,handler: function(){
							var s = this.store;
							var r = new (s.recordType)({vch_user_name:'', vch_email:'', fk_roles_iroleid:''});
							s.add(r);
							this.startEditing(s.indexOf(r), 0);
					}
				},
				'-',{
					text: 'Remove User',
					xtype: 'button',
					iconCls: 'del_item',
					handler: function(){
						var grid = this.findParentByType('useradmingrid');
						var rec = grid.getSelectionModel().getSelected();
						if (!rec) {
							return false;
						}
						// Remove the User from the db
						Ext.Ajax.request({
							url: grid.getStore().url,
							params: {},
							scope: this,
							success: function(response, options){
								var responseObject = Ext.decode(response.responseText);
								if (responseObject.data) {
									if (responseObject.data.failure) {
										Ext.Msg.alert("User Removal Failed", response.responseText);
										return false;
									}
								}
								grid.store.remove(rec);
								grid.store.commitChanges();
							},
							failure: function(response, options){
								Ext.Msg.alert(options.windowStrings.title, options.windowStrings.message + response.responseText);
							}
							
						});
						
					}
				}]
		});
		// finally call the superclasses implementation
		CometDesktop.ux.admin.UserAdminGrid.superclass.initComponent.call(this);
	}
});

Ext.reg('useradmingrid', CometDesktop.ux.admin.UserAdminGrid);

Ext.extend(Ext.grid.GroupingView, {
    getGroupData : function(e){
        var groupBody = e.getTarget('.x-grid-group', this.mainBody);
        if(groupBody){
            var hd = groupBody.child('.x-grid-group-hd');
            if (hd) {
                var groupValue = hd.id.substring(hd.id.lastIndexOf('-') + 1);
                return {
                    groupField: this.getGroupField(),
                    value: groupValue
                };
            }
        }
    }
});

CometDesktop.ux.admin.dummyGroupData = {
	data: [{
		group_name: 'Admins',
		user_name: 'root'
	}, {
		group_name: 'Users',
		user_name: 'root'
	}]
};

CometDesktop.ux.admin.UserGroupGrid = Ext.extend(Ext.grid.EditorGridPanel, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			// Pass in a column model definition
			// Note that the DetailPageURL was defined in the record definition but is not used
			// here. That is okay.
			title: 'Groups',
	        columns: [
	            {header: "Group Name", width: 100, dataIndex: 'group_name', sortable: true},
				{header: "Members", width: 100, dataIndex: 'user_name', sortable: true}
	        ],
			enableDragDrop:true,
			ddGroup: 'gridToGroup',
			view: new Ext.grid.GroupingView({
            	forceFit:true,
			    hideGroupedColumn: true,
				showGroupName: true,
				startCollapsed: true,
				groupTextTpl: '{text} <tpl if="values.rs[0].data.user_name != -1">({[values.rs.length]} {[values.rs.length > 1 ? "Items" : "Item"]})</tpl>',
            	getRowClass: function(rec) {
            		if (rec.data.user_name === -1) return 'x-hide-display';
            	}
            	//groupTextTpl: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "Items" : "Item"]})'
        	}),
			sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
			// Note the use of a storeId, this will register thisStore
			// with the StoreMgr and allow us to retrieve it very easily.
			store: {
				xtype: 'managegroupstore',
				groupField:'group_name',
				root: 'data',
				url:  '/desktop/useradmin',
            	reader: new Ext.data.JsonReader({
					root: 'data',
					fields: [ 'group_name','user_name'  ]
				}),
            	data: CometDesktop.ux.admin.dummyGroupData,
            	baseParams: { 
					test: 'test'	
				},
				sortInfo:{field: 'group_name', direction: "ASC"}
				
        	},
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			},
			tbar: [{
				text:'Manage Groups'
				,xtype: 'button'
				,iconCls:'add_item'
				,scope: this
				,handler: function(){
					this.createGroupManageWindow();
					//Ext.MessageBox.prompt('Add Group', 'Enter group name:', this.addGroupName, this);
				}
			}]
		});
		// finally call the superclasses implementation
		CometDesktop.ux.admin.UserGroupGrid.superclass.initComponent.call(this);
	},
	onRender:function() {
 		CometDesktop.ux.admin.UserGroupGrid.superclass.onRender.apply(this, arguments);
  
 		this.dz = new CometDesktop.ux.admin.GridDropZone(this, {ddGroup:this.ddGroup || 'GridDD'});
	}, // eo function onRender
	initEvents: function(){
		CometDesktop.ux.admin.UserGroupGrid.superclass.initEvents.call(this);
		// any additional load click processing here
		var groupGridSm = this.getSelectionModel();
		groupGridSm.on('rowselect', this.onRowSelect, this);
	 	groupGridSm.on('rowdeselect', this.onRowDeSelect, this);
	}, 
	onRowSelect: function(sm, rowIdx, r) {
		
	},
	onRowDeSelect: function(sm, rowIdx, r) {
		
	},
	addGroupName: function(btn, txt){
		if (btn == 'ok' && txt != '') {
			var s = this.store;
			var u = new s.recordType({
				group_name: txt,
				user_name: -1
			});
			s.add(u);
		}
	},
	createGroupManageWindow: function(){
		var win = new Ext.Window({
			title       : 'Manage Groups',
            layout      : 'fit',
            width       : 800,
            height      : 500,
			hidden      : false,
            plain       : true,
            modal: true,
            items       : { 
            	xtype: 'groupmasterdetail',
            }
        });
		
        win.show();  
		win.center(); 
	},
	// add a method which updates the details
	updateGroup: function(data) {
		//this.tpl.overwrite(this.body, data);
	},
	onRecordsDrop:function(grid, record){
		//console.info(grid, record);
	}
});

Ext.reg('usergroupgrid', CometDesktop.ux.admin.UserGroupGrid);

CometDesktop.ux.admin.UserFormDetail = Ext.extend(Ext.FormPanel, {
	
	initComponent:function() {
		  
	 // hard coded - cannot be changed from outside
		 var config = {
			 defaultType:'textfield',
			 //title: this.title,
			 monitorValid:true,
			 layout: {
	            type: 'vbox',
	            align: 'stretch'  // Child items are stretched to full width
	         },
	         defaults: {
	            xtype: 'textfield'
	         },
			 items: [{
				labelWidth: 50,
				xtype: 'fieldset',
				defaultType: 'textfield',
	            autoHeight: true,
	            bodyStyle: Ext.isIE ? 'padding:0 0 5px 15px;' : 'padding:10px 15px;',
	            border: false,
	            style: {
	                "margin-left": "10px", // when you add custom margin in IE 6...
	                "margin-right": Ext.isIE6 ? (Ext.isStrict ? "-10px" : "-13px") : "0"  // you have to adjust for it somewhere else
	            },
	            items: [{
	                fieldLabel: 'Name',
	                name: 'vch_user_name'
	            }]
			}],
			tbar: [{
				text:'Save'
				,xtype: 'button'
				,iconCls:'save'
				,scope: this
				,handler: function(){
						var s = this.store;
				}
			}]
		 }; // eo config object
	  
		 // apply config
		 Ext.apply(this, Ext.apply(this.initialConfig, config));
		  
		 // call parent
		 CometDesktop.ux.admin.UserFormDetail.superclass.initComponent.apply(this, arguments);

	}, // eo function initComponent	
	onRender:function() {
	 	CometDesktop.ux.admin.UserFormDetail.superclass.onRender.apply(this, arguments);
	 	this.getForm().waitMsgTarget = this.getEl();
	  
	}, // eo function onRender
	initEvents: function(){
		CometDesktop.ux.admin.UserFormDetail.superclass.initEvents.call(this);
	 	// any additional load click processing here
	},    
	onSuccess:function(form, action) {
			
	}, // eo function onSuccess
	onFailure:function(form, action) {
	 	
	 	 	
	}, // eo function onFailure
	showError:function(msg, title) {
		 
	}, 
	updateForm: function(data) {
		var form = this.getForm();	
		form.loadRecord(data);	
	} // eo function updateForm
});

Ext.reg('userformdetail', CometDesktop.ux.admin.UserFormDetail);

CometDesktop.ux.admin.UserMasterDetail = Ext.extend(Ext.Panel, {
	// override initComponent
	initComponent: function() {
		// used applyIf rather than apply so user could
		// override the defaults
		Ext.applyIf(this, {
			
			layout: 'border',
			items: [{
				xtype: 'useradmingrid',
				itemId: 'gridPanel',
				region: 'west',
				frame: true,
				width: 500
			},{
				xtype: 'panel',
				itemId: 'detailPanel',
				region: 'center',
				layout:'vbox',
				border: false,
				//hideBorders: true,
				layoutConfig: {
				    align : 'stretch',
				    pack  : 'start'
				},
				items: [{
					title: 'Groups',
					xtype: 'usergroupgrid',
					itemId: 'userGroupGrid',
					frame: true,
					flex: 1
				},{
					title: 'User Detail',
					xtype: 'userformdetail',
					itemId: 'userFormDetail',
					frame: true,
					flex: 1
				}]
			}]
		})
		// call the superclass's initComponent implementation
		CometDesktop.ux.admin.UserMasterDetail.superclass.initComponent.call(this);
	},
	// override initEvents
	initEvents: function() {
		// call the superclass's initEvents implementation
		CometDesktop.ux.admin.UserMasterDetail.superclass.initEvents.call(this);

		var resultGridSm = this.getComponent('gridPanel').getSelectionModel();
		resultGridSm.on('rowselect', this.onRowSelect, this);
	},
	onRowSelect: function(sm, rowIdx, r) {
		// getComponent will retrieve itemId's or id's. Note that itemId's
		// are scoped locally to this instance of a component to avoid
		// conflicts with the ComponentMgr
		var detailPanel     = this.getComponent('detailPanel');
		var userGroupGrid   = detailPanel.getComponent('userGroupGrid');
		var userFormDetail  = detailPanel.getComponent('userFormDetail');
		
		userGroupGrid.updateGroup(r.data);
		userFormDetail.updateForm(r);
	}
});

Ext.reg('usermasterdetail', CometDesktop.ux.admin.UserMasterDetail);


CometDesktop.ux.admin.UserAdmin = Ext.extend( CometDesktop.Module, {
	
    appId: '8cf006705cb011df89f4a7889ed35127',
    appName: 'admin-users',
	
    id: 'admin-users-win',
    title: 'User Admin',
    appChannel: '/desktop/system/admin/users',
    autoStart: true,
	requires: [
        'css/admin-users.css'
    ],
    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        /*
        this.register({
            self: this,
            id: this.id,
            channel: this.appChannel,
            text: this.title,
            iconCls: 'icon-grid',
            autoStart: true
        });
        */
    },

    eventReceived: function( ev ) {
        switch ( ev.action ) {
            case 'launch':
                this.start();
                break;

            case 'startup':
                this.startup();
                break;
        }
    },

    startup : function(){
        var win = app.getWindow( this.id );
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return app.createWindow({
            id: this.id,
            title: this.title,
            width: 800,
            height: 600,
            iconCls: 'icon-grid',
            animCollapse: false,
			layout: 'fit',
			items: [{
				xtype: 'usermasterdetail',
				height: 580,
				width: 780
			}]
        });
    }

});

new CometDesktop.ux.admin.UserAdmin();


