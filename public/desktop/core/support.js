
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
                    html: ['<div style="padding:10px 10px 10px 10px;"><h2>Comet Desktop</h2><h3>Ext web desktop</h3>',
                    '<h3>Authors</h3><ul><li>David Davis - <a href="http://xant.us/" target="_blank">http://xant.us/</a></li>',
                    '<li>Jonathan Leppert</li></ul></div>'].join('')
                }
            ]
        });
    }

});

new CometDesktop.AboutApp();

/* -------------------------------------------------------------------------*/

