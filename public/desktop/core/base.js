/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */

CometDesktop = new Ext.app.App({

	init: function(){
		Ext.QuickTips.init();

        Ext.fly('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove: true, duration: 2 });
        
        /*
        var blah = new Ext.ux.BubblePanel({
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
            new CometDesktop.SampleApp(),
            new CometDesktop.SampleApp2()
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


CometDesktop.SampleApp = Ext.extend(Ext.app.Module, {

    id:'sampleapp',

    init : function(){
        this.launcher = {
            text: 'Sample App',
            iconCls: 'icon-grid',
            // hack: this is not how I want to auto start apps
            autoStart: true,
            handler: this.createWindow,
            scope: this
        }
    },

    createWindow : function(){
        var win = this.app.desktop.getWindow('sampleapp-win');
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return this.app.desktop.createWindow({
            id: 'sampleapp-win',
            title: 'Sample App',
            width: 300,
            height: 250,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            constrainHeader: true,
            layout: 'fit',
            items: [
                {
                    html: 'Sample App'
                }
            ]
        });
    }

});

CometDesktop.SampleApp2 = Ext.extend(Ext.app.Module, {

    id:'sampleapp2',

    init : function(){
        this.launcher = {
            text: 'Sample App 2',
            iconCls: 'icon-grid',
            // hack: this is not how I want to auto start apps
            autoStart: true,
            handler: this.createWindow,
            scope: this
        }
    },

    createWindow : function(){
        this.create().show();
    },

    create: function() {
        return this.app.desktop.createWindow({
            // don't include a window id if you plan on allowing multiple instances
            title: 'Sample App 2',
            width: 300,
            height: 250,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            constrainHeader: true,
            layout: 'fit',
            items: [
                {
                    html: 'Sample App 2<br><br>multiple instances allowed'
                }
            ]
        });
    }

});

Ext.ux.BubblePanel = Ext.extend(Ext.Panel, {
    baseCls: 'x-bubble',
    frame: true
});

