
Ext.ns( 'Ext.ux' );

Ext.ux.HTML5Sound = Ext.extend( Ext.util.Observable, {

    constructor: function( config ) {
        Ext.apply( this, config );

        var msg = '';
        if ( this.unsupportedMsg ) {
            msg = this.unsupportedMsg;
        } else {
            msg = "Your browser doesn't supoort html5 audio. ";
            if ( Ext.isIE && this.suggestChromeFrame ) {
                /* chromeframe requires that your site have a special tag in the header
                 * see http://code.google.com/chrome/chromeframe/ for details
                 */
                msg += '<a href="http://www.google.com/chromeframe">Get Google Chrome Frame for IE</a>';
            } else if ( Ext.isChrome ) {
                msg += '<a href="http://www.google.com/chrome">Upgrade Chrome</a>';
            } else if ( Ext.isGecko ) {
                msg += '<a href="http://www.mozilla.com/en-US/firefox/upgrade.html">Upgrade to Firefox 3.5</a>';
            } else {
                msg += '<a href="http://www.mozilla.com/en-US/firefox/upgrade.html">Get Firefox 3.5</a>';
            }
        }

        var cfg = Ext.copyTo( {
            tag: 'audio',
        }, this, 'autobuffer,loop,src' );

        /* just having the params exist enables them */
        if ( this.autoplay )
            cfg.autoplay = 1;
        if ( this.controls )
            cfg.controls = 1;

        /* handle multiple sources */
        if ( Ext.isArray( this.src ) ) {
            cfg.children = [];
            for ( var i = 0, len = this.src.length; i < len; i++ )
                cfg.children.push( Ext.applyIf( { tag: 'source' }, this.src[ i ] ) );
            cfg.children.push( { html: msg } );
        } else {
            cfg.src = this.src;
            cfg.html = msg;
        }

        this.el = Ext.fly( this.container || Ext.getBody() ).createChild( cfg );
        window.foobar = this.el.dom;
    },

    play: function() {
        
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.SoundSystem = Ext.extend( CometDesktop.Module, {

    appChannel: '/desktop/system/sound',

    init: function() {
        this.sm = new Ext.ux.HTML5Sound({ src: 'sound/test.ogg', autoplay: true });
        this.subscribe( this.appChannel, this.eventReceived, this );
    },

    eventReceived: function( ev ) {
        if ( ev.sound )
            this.sm.play( ev.sound )
    }

});

new CometDesktop.SoundSystem();

