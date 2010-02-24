
CometDesktop.WebSocket = Ext.extend( CometDesktop.Module, {

    appChannel: '/desktop/system/websocket',

    init: function() {
        app.socket = this;
        window.webSocketError = this.webSocketError.createDelegate( this );
        window.webSocketLog = this.webSocketLog.createDelegate( this );
        this.location = 'ws://' + location.hostname + ':3001/';
        this.subscribe( '/server', this.eventRoute, this );
        this.subscribe( this.appChannel, this.eventReceived, this );
        // TODO add button item to the panel here instead of in base.js
        this.status = Ext.getCmp( 'websocketStatus' );
        this.pingTask = {
            run: this.doPing,
            scope: this,
            interval: ( 30 * 60 * 60 )
        };
        this.connect();
    },

    setIcon: function( icon ) {
        this.status.setTooltip( 'Status: <b>' + icon + '</b>' );
        icon = 'cd-icon-websocket-' + icon;
        this.status.setIconClass( icon );
        this.icon = icon;
    },

    connect: function() {
        this.setIcon( 'connecting' );
        if ( this.socket ) {
            if ( this.socket.readyState == WebSocket.OPEN )
                return;
            this.socket.close();
        }
        this.socket = new WebSocket( this.location );
        this.socket.onmessage = this.onMessage.createDelegate( this );
        this.socket.onclose = this.onClose.createDelegate( this );
        this.socket.onopen = this.onOpen.createDelegate( this );
    },

    onOpen: function() {
        log("----------------onopen");
        this.setIcon( 'connected' );
        Ext.TaskMgr.stop( this.pingTask );
        Ext.TaskMgr.start( this.pingTask );
        this.send([
            { channel: '/foo/bar', cmd: 'subscribe' },
            { channel: '/desktop/system/notification', cmd: 'subscribe' }
        ]);
    },

    onMessage: function( ev ) {
        log("---------------onmessage: " + ev.data);
        var obj = Ext.decode( ev.data );
        if ( obj.channel == '/connect' ) {
            this.cid = obj.cid;
            //this.send({ channel: '/desktop/system/notification', html: 'Hi from ' + this.cid });
            log('-------------------client id:'+this.cid);
            return;
        }
        if ( obj.channel )
            this.publish( obj.channel, obj );
    },

    onClose: function() {
        log("---------------onclose");
        this.setIcon( 'disconnected' );
        this.connect.defer( 5000, this );
    },

    doPing: function() {
        this.send({ ping: ( new Date ).getTime() });
    },

    eventRoute: function( ev ) {
        this.socket.send( ev );
    },

    close: function() {
        this.socket.close();
    },

    send: function( data ) {
        var json = Ext.encode( data );
        if ( this.socket.readyState == WebSocket.OPEN )
            this.socket.send( json );
        else
           log('Not connected  - event not sent:' + json );
    },

    eventReceived: function( ev ) {
        this.createWindow();
    },

    webSocketError: function( msg ) {
        log( 'websocket error: ' + msg );
        this.onClose();
    },

    webSocketLog: function( msg ) {
        // log( msg );
    },

    createWindow: function() {
        var win = app.getWindow( 'desktop-websocket-win' );
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        var state;
        switch ( this.socket.readyState ) {
            case WebSocket.OPEN:
                state = 'connected';
                break;
            case WebSocket.CONNECTING:
                state = 'connecting';
                break;
            case WebSocket.CLOSED:
                state = 'disconnected';
                break;
        }
        return app.createWindow({
            id: 'desktop-websocket-win',
            title: 'WebSocket Status',
            iconCls: 'cd-icon-system-about',
            animateTarget: this.status.el,
            x: 100,
            y: 100,
            width: 300,
            height: 250,
            layout: 'fit',
            maximizable: false,
            preventBodyReset: true,
            items: [{
                html: 'Socket Status:<br>' + state
            }]
        });
    }

});

new CometDesktop.WebSocket();


/* -------------------------------------------------------------------------*/

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

