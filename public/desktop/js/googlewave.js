
Ext.ns( 'Apps' );

Apps.GoogleWave = Ext.extend( CometDesktop.Module, {

    iconCls: 'cd-icon-app-google-wave',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        this.register({
            id: this.appId,
            channel: this.appChannel,
            text: 'Google Wave',
            iconCls: this.iconCls //,
//            autoStart: true
        });
    },

    eventReceived: function() {
        this.createWindow();
    },

    createWindow: function() {
        var id = Ext.id();
        var win = app.createWindow({
            id: id,
            title: 'Google Wave',
            width: 600,
            height: 450,
            iconCls: this.iconCls,
            shim: false,
            animCollapse: false,
            layout: 'fit',
            items: [{
                id: id + '-gwpanel',
                xtype: 'googlewave',
                waveId: 'wavesandbox.com!w+waveID'
            }]
        });
        win.show();
    }

});

Ext.ns( 'Ext.ux' );

Ext.ux.GoogleWavePanel = Ext.extend( Ext.Panel, {

    configMap: {
        color: 'setColor',
        bgcolor: 'setBgcolor',
        font: 'setFont',
        fontsize: 'setFontSize',
        footerEnabled: 'setFooterEnabled',
        headerEnabled: 'setHeaderEnabled',
        toolbarEnabled: 'setToolbarEnabled'
    },

    constructor: function( config ) {
        Ext.ux.GoogleWavePanel.superclass.constructor.call( this, Ext.applyIf( config, {
            width: '100%',
            height: '100%',
            //bodyStyle: 'background-color:#000;color:#fff',
            waveUrl: 'http://wave.google.com/a/wavesandbox.com/',
            waveAPIUrl: 'http://wave-api.appspot.com/public/embed.js', // this loads: https://wave.google.com/gadgets/js/core:rpc?debug=1&c=1
            bgcolor: 'white',
            color: 'black',
            font: 'Arial',
            fontsize: '12pt',
            footerEnabled: true,
            headerEnabled: true,
            toolbarEnabled: true,
            html: ''
        } ) );

        this.on( 'afterlayout', this._afterLayout, this );
    },

    _afterLayout: function() {
        this.un( 'afterlayout', this._afterLayout, this );
        this._loadAPI();
    },

    _loadAPI: function() {
        if ( !window.WavePanel ) {
            var sc = document.createElement( 'scr' + 'ipt' );
            sc.setAttribute( 'type', 'text/javascript' );
            sc.setAttribute( 'src', this.waveAPIUrl );
            sc.setAttribute( 'id', this._scriptid = Ext.id() );
            Ext.EventManager.on( sc, 'load', this._checkAPI, this );
            //document.getElementsByTagName( 'head' )[ 0 ].appendChild( sc );
            ( document.getElementsByTagName( 'head' )[ 0 ] || Ext.getBody() ).appendChild( sc );
        } else
            this._checkAPI();
    },

    _checkAPI: function() {
        log('api loaded');
        this.loadTask = Ext.TaskMgr.start({
            run: this._checkLoaded,
            scope: this,
            interval: 100,
            repeat: 10000
        });
    },

    _checkLoaded: function() {
        if ( window.gadgets && gadgets.rpc && gadgets.rpc.init ) {
            Ext.TaskMgr.stop( this.loadTask );
            this.startWave();
        }
    },

    startWave: function() {
        var wave = this.wavePanel = new WavePanel( this.waveUrl );

        var cfg = new WavePanel.UIConfig();
        Ext.iterate( this.configMap, function( x ) {
            if ( !Ext.isEmpty( this[ x ] ) )
                cfg[ this.configMap[ x ] ]( this[ x ] );
        }, this);
        wave.setUIConfigObject( cfg );

        wave.loadWave( this.waveId );
        wave.init( this.body );
    },

    destroy: function() {
        this.wavePanel = null;
        Ext.ux.GoogleWavePanel.superclass.destroy.call( this, arguments );
    }

} );

Ext.reg( 'googlewave', Ext.ux.GoogleWavePanel );

new Apps.GoogleWave();

/* -------------------------------------------------------------------------*/
