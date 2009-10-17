
CometDesktop.NotificationApp = Ext.extend( CometDesktop.Module, {

    appChannel: '/desktop/system/notification',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        /*
        Ext.apply(Ext.QuickTips.getQuickTip(), {
            maxWidth: 600
        });
        */
        //this.tip = new CometDesktop.NotificationApp.ToolTip({
        this.tip = new Ext.ToolTip({
            id: 'notification-tip',
//            title: '&nbsp;',
            iconCls: 'cd-icon-tip-system-notification',
            anchor: 'top',
            html: 'Comet Desktop',
            bodyCssClass: 'cd-notification-body',
            autoHide: false
        });
        this.toolbarHeight = Ext.getCmp( 'cd-top-toolbar' ).getHeight();
        // bypass initTarget, we don't need hover coverage on the target
        this.tip.target = Ext.fly( 'notificationArea' ).parent();


        this.show( 'Test notification' );
        // or
        //this.publish('/desktop/system/notification', { html: 'Test notification' });
    },

    show: function( html ) {
        var xy = this.tip.target.getXY();

        if ( this.tip.rendered && html )
            this.tip.body.update( '' );

        /* jump through hoops to get the tooltip to position correctly */
        if ( html ) {
            this.tip.showAt( [ -1000, -1000 ] );
            this.tip.body.update( html );
        }
        this.tip.showAt( [ -1000, -1000 ] );
        this.tip.el.setStyle( 'width', 'auto' );
        this.tip.body.setStyle( 'width', 'auto' );

        var width = this.tip.getWidth();
        this.tip.anchorOffset = width - 33;
        this.tip.anchorEl.show();

        xy[ 0 ] -= width - 25;
        xy[ 1 ] += this.toolbarHeight;

        this.tip.showAt( xy );
    },

    eventReceived: function( ev ) {
        if ( ev && ev.html )
            this.show( ev.html );
        else
            this.show();
    }

});

new CometDesktop.NotificationApp();

/* -------------------------------------------------------------------------*/

CometDesktop.AboutApp = Ext.extend( CometDesktop.Module, {

    appChannel: '/desktop/system/about',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
    },

    eventReceived: function() {
        this.createWindow();
    },

    createWindow: function() {
        var win = app.getWindow( 'desktop-about-win' );
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return app.createWindow({
            id: 'desktop-about-win',
            title: 'About Comet Desktop',
            iconCls: 'cd-icon-system-about',
            x: 100,
            y: 100,
            width: 300,
            height: 250,
            layout: 'fit',
            maximizable: false,
            preventBodyReset: true,
            items: [
                {
                    html: ['<div style="padding:10px 10px 10px 10px;"><h2>Comet Desktop</h2><h3>Ext web desktop</h3><br>',
                    '<a href="http://github.com/xantus/comet-desktop">Comet Desktop at Github</a>',
                    '<h3>Authors</h3><ul><li>David Davis - <a href="http://xant.us/" target="_blank">http://xant.us/</a></li>',
                    '</ul></div>'].join('')
                }
            ]
        });
    }

});

new CometDesktop.AboutApp();

/* -------------------------------------------------------------------------*/

