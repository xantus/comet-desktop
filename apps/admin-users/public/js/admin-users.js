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
		//this.on('beforeload', this.beforeLoad, {
		//	scope: this
		//});
		this.on('exception', this.showError, this);
    },
	
	showError:function(store,options,response,e) {
		 //console.info(store, options, response, e);
		 title = 'Error';
		 var jsonData = e.reader.jsonData.data;
		 //console.info(records);
		 if (jsonData) {
		 	Ext.dropDownMessage.msg('Error','{0}','Request Failed:<br />' + jsonData.result,5);
		 	//Ext.Msg.alert('Error', jsonData.result);
		 }
		 Ext.Msg.show({
			 title:title
			 ,msg:"Load exception for JSON store " + jsonData.result 
			 ,modal:true
			 ,icon:Ext.Msg.ERROR
			 ,buttons:Ext.Msg.OK
		 }); //eo Msg.show
	},
	showSuccess:function(store, records, options) {
		 //var obj = Ext.decode(response.responseText);
		 var jsonData = store.reader.jsonData.data;
		 //console.info(records);
		 if (jsonData.failure === 'true') {
		 	Ext.dropDownMessage.msg('Error','{0}','Request Failed:<br />' + jsonData.result,5);
		 	//Ext.Msg.alert('Error', jsonData.result);
		 }
		 
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
		 //console.dir(response);
		 title = 'Error';
		 Ext.Msg.show({
			 title:title
			 ,msg:"Load exception for JSON store " + response.responseText 
			 ,modal:true
			 ,icon:Ext.Msg.ERROR
			 ,buttons:Ext.Msg.OK
		 }); //eo Msg.show
	},
	showSuccess:function(store,options,response,e) {
		 var jsonData = store.reader.jsonData.data;
		 if (jsonData.failure == 'true') {
		 	Ext.Msg.alert('Error', jsonData.result);
		 }
		 
	}
    // }}}
    // any other added/overrided methods
}); // eo extend
 
// register an xtype with this class
Ext.reg('managegroupstore', CometDesktop.ux.admin.manageGroupStore);

CometDesktop.ux.admin.UserAdminGrid = Ext.extend(Ext.grid.EditGridPanel, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			// Pass in a column model definition
			// Note that the DetailPageURL was defined in the record definition but is not used
			// here. That is okay.
			title: 'Users',
	        columns: [
	            {header: "UserName", width: 20, dataIndex: 'vch_user_name', sortable: true},
				{header: "Email", width: 120, dataIndex: 'vch_email', sortable: true},
	      		{header: "Role", width: 120, dataIndex: 'fk_roles_iroleid', sortable: true}
	        ],
			/*plugins: [new Ext.ux.grid.RowEditor({
        			saveText: 'Update'
    		})],*/
			sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
			// Note the use of a storeId, this will register thisStore
			// with the StoreMgr and allow us to retrieve it very easily.
			store: {
					xtype: 'managestore'
					,url:  '/desktop/control_comm'
				    ,root: 'data'
				    ,fields: [ 'user_id','user_name','user_email','user_role']
					,baseParams: { 
						
					}				
			},
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			}
		});
		// finally call the superclasses implementation
		CometDesktop.ux.admin.UserAdminGrid.superclass.initComponent.call(this);
	}
});

Ext.reg('useradmingrid', CometDesktop.ux.admin.UserAdminGrid);

xg.dummyData = {name: 'TestGuy',email: 'test@test.com',group: 'Admin'};


CometDesktop.ux.admin.UserGroupGrid = Ext.extend(Ext.grid.EditGridPanel, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			// Pass in a column model definition
			// Note that the DetailPageURL was defined in the record definition but is not used
			// here. That is okay.
			title: 'Users',
	        columns: [
	            {header: "UserName", width: 20, dataIndex: 'vch_user_name', sortable: true},
				{header: "Email", width: 120, dataIndex: 'vch_email', sortable: true},
	      		{header: "Role", width: 120, dataIndex: 'fk_roles_iroleid', sortable: true}
	        ],
			view: new Ext.grid.GroupingView({
            	forceFit:true,
            	groupTextTpl: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "Items" : "Item"]})'
        	}),
			sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
			// Note the use of a storeId, this will register thisStore
			// with the StoreMgr and allow us to retrieve it very easily.
			store: {
				xtype: 'managegroupstore',
				groupField:'group',
				//url:  '/',
            	reader: new Ext.data.JsonReader({
					root: 'data',
					fields: [ 'group','user_name'  ]
				}),
            	data: xg.dummyData,
            	baseParams: {},
				sortInfo:{field: 'group', direction: "ASC"}
				
        	},
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			}
		});
		// finally call the superclasses implementation
		CometDesktop.ux.admin.UserGroupGrid.superclass.initComponent.call(this);
	},
	
	// add a method which updates the details
	updateDetail: function(data) {
		this.tpl.overwrite(this.body, data);
	}
});

Ext.reg('usergroupgrid', CometDesktop.ux.admin.UserGroupGrid);

CometDesktop.ux.admin.UserDetail = Ext.extend(Ext.Panel, {
	// add tplMarkup as a new property
	tplMarkup: [
		'{actual_result}<br/>'
	],
	// startingMarup as a new property
	startingMarkup: 'Please select a command row to see additional details',
	
	initComponent: function() {
		this.tpl = new Ext.Template(this.tplMarkup);
		Ext.apply(this, {
			bodyStyle: {
				background: '#ffffff',
				padding: '7px'
			},
			autoScroll: true,
			html: this.startingMarkup
		});
		
		CometDesktop.ux.admin.UserDetail.superclass.initComponent.call(this);
	},
	// add a method which updates the details
	updateDetail: function(data) {
		this.tpl.overwrite(this.body, data);
	}
});

Ext.reg('userdetail', CometDesktop.ux.admin.UserDetail);

CometDesktop.ux.admin.UserMasterDetail = Ext.extend(Ext.Panel, {
	// override initComponent
	initComponent: function() {
		// used applyIf rather than apply so user could
		// override the defaults
		Ext.applyIf(this, {
			frame: true,
			layout: 'border',
			items: [{
				xtype: 'useradmingrid',
				itemId: 'gridPanel',
				region: 'west',
				frame: true,
				width: 600
			},{
				xtype: 'panel',
				itemId: 'detailPanel',
				region: 'center',
				layout:'vbox',
				layoutConfig: {
				    align : 'stretch',
				    pack  : 'start'
				},
				items: [{
					title: 'Groups',
					xtype: 'usergroupgrid',
					itemId: 'userGroupPanel',
					flex: 1
				},{
					title: 'User Detail',
					xtype: 'userdetail',
					itemId: 'userDetailPanel',
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
		var userGroupPanel  = detailPanel.getComponent('userGroupPanel');
		var userDetailPanel = detailPanel.getComponent('userDetailPanel');
		
		userDetailPanel.updateDetail(r.data);
		userGroupPanel.updateDetail(r.data);
	}
});

Ext.reg('usermasterdetail', CometDesktop.ux.admin.UserMasterDetail);


CometDesktop.ux.admin.UserAdmin = Ext.extend( CometDesktop.Module, {

    appId: '8cf006705cb011df89f4a7889ed35127',
    appName: 'admin-users',

    id: 'admin-users-win',
    title: 'User Admin',
    appChannel: '/desktop/system/admin/users',
/*
    requires: [
        'apps/admin-users/css/admin-users.css'
    ],
*/
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
        if ( ev.action == 'launch' )
            this.createWindow();
    },

    createWindow : function(){
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
            height: 500,
            iconCls: 'icon-grid',
            animCollapse: false,
			items: [{
				xtype: 'usermasterdetail',
				height: 780,
				width: 480
			}]
        });
    }

});

new CometDesktop.ux.admin.UserAdmin();


