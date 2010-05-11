Ext.ns( 'CometDesktop.ux' );

CometDesktop.ux.UserAdmin = Ext.extend( CometDesktop.Module, {

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
            id: this.appId,
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
            width: 600,
            height: 300,
            iconCls: 'icon-grid',
            animCollapse: false
        });
    }

});

new CometDesktop.ux.UserAdmin();


