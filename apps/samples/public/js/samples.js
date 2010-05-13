
Ext.ns( 'Apps' );

Apps.SampleApp = Ext.extend( CometDesktop.Module, {

    appId: 'b4e000f85ca711df9f47dfe6670e4c36',
    appName: 'samples',
    requires: [
        'js/foobar.js'
    ],

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        this.register({
            id: this.id,
            channel: this.appChannel,
            text: 'Sample App',
            iconCls: 'icon-grid'//,
            // hack: this is not how I want to auto start apps
            //autoStart: true
        });
    },

    startup: function() {
        // requires list is loaded, start app here
    },

    eventReceived: function() {
        this.createWindow();
    },

    createWindow: function() {
        var win = app.getWindow('sampleapp-win');
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return app.createWindow({
            id: 'sampleapp-win',
            title: 'Sample App',
            width: 300,
            height: 250,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            layout: 'fit',
            items: [
                {
                    html: 'Sample App'
                }
            ]
        });
    }

});

new Apps.SampleApp();

/* -------------------------------------------------------------------------*/

Apps.SampleApp2 = Ext.extend( CometDesktop.Module, {

    appId: 'b4e000f85ca711df9f47dfe6670e4c36',
    appName: 'samples',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        this.register({
            id: this.id,
            channel: this.appChannel,
            text: 'Sample App 2',
            iconCls: 'icon-grid'//,
            // hack: this is not how I want to auto start apps
            //autoStart: true
        });
    },

    eventReceived: function() {
        this.createWindow();
    },

    createWindow: function() {
        this.create().show();
    },

    create: function() {
        return app.createWindow({
            // don't include a window id if you plan on allowing multiple instances
            title: 'Sample App 2',
            width: 300,
            height: 250,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            layout: 'fit',
            items: [
                {
                    html: 'Sample App 2<br><br>multiple instances allowed'
                }
            ]
        });
    }

});

new Apps.SampleApp2();

