
Ext.ns( 'Apps' );

Apps.HTML5VideoPlayer = Ext.extend( CometDesktop.Module, {
            
    iconCls: 'cd-icon-app-media-player',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        this.register({
            id: this.appId,
            channel: this.appChannel,
            text: 'Video Player',
            iconCls: this.iconCls,
            autoStart: true
        });
    },

    eventReceived: function() {
        this.createWindow();
    },

    createWindow: function() {
        var win = this.create();
        var renderPreview = this.renderPreview.createDelegate( this, [ win ] );

        win.on( 'afterrender', function() {
            win.videoEl = Ext.getCmp( win.id + '-vidpanel' ).video.dom;

            // TBD width and height proportional to the actual video size
            var width = 160, height = 96;

            win.tip = new Ext.ToolTip({
                anchor: 'bottom',
                target: win.taskButton.el,
                autoHide: true,
                hideDelay: 300,
                height: height,
                width: width,
                bodyCfg: {
                    tag: 'canvas',
                    id: win.id + '-canvas',
                    width: width,
                    height: height
                }
            });

            win.tip.on( 'render', function() {
                var canvas = Ext.getDom( win.id + '-canvas' );
                if ( canvas )
                    win.ctx = canvas.getContext( '2d' );
            });
            win.tip.on( 'show', renderPreview );
        }, this );

        win.show();
    },

    renderPreview: function( win ) {
        if ( !win.tip.isVisible() || !win.videoEl )
            return;

        if ( win.ctx )
            win.ctx.drawImage( win.videoEl, 0, 0, win.tip.width, win.tip.height );

        this.renderPreview.defer( 1, this, [ win ] );
    },

    create: function() {
        var id = Ext.id();
        return app.createWindow({
            id: id,
            title: 'Video Player',
            width: 600,
            height: 450,
            iconCls: this.iconCls,
            shim: false,
            animCollapse: false,
            layout: 'fit',
            items: [{
                id: id + '-vidpanel',
                xtype: 'html5video',
                poster: 'http://new.annodex.net/~silvia/itext/elephants_dream/elephant.png',
                src:[{
                    //src: '/elephants_dream.ogv',
                    src: 'http://new.annodex.net/~silvia/itext/elephants_dream/elephant.ogv',
                    type: 'video/ogg'
                }],
                // or
                //src: '/elephants_dream.ogv',
                start: 20,
                autobuffer: true,
                autoplay: true,
                controls: true /* default */
            }]
        });
    }

});

Ext.ns( 'Ext.ux' );

/* your server must send the right content type, for more info see
 * https://developer.mozilla.org/En/HTML/Element/Video
 */
Ext.ux.HTML5VideoPanel = Ext.extend( Ext.Panel, {
    
    constructor: function( config ) {
        Ext.ux.HTML5VideoPanel.superclass.constructor.call( this, Ext.applyIf( config, {
            width: '100%',
            height: '100%',
            autoplay: false,
            controls: true,
            bodyCssClass: 'video-panel',
            html: '',
            suggestChromeFrame: false
        } ) );

        this.on( 'afterlayout', this._afterLayout, this );
    },

    _afterLayout: function() {
        this.un( 'afterlayout', this._afterLayout, this );

        var msg = '';
        if ( this.unsupportedMsg ) {
            msg = this.unsupportedMsg;
        } else {
            msg = "Your browser doesn't supoort html5 video. ";
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

        /* applet fallback: http://www.theora.org/cortado/
            <applet code="com.fluendo.player.Cortado.class" archive="http://theora.org/cortado.jar" width="600" height="300">
                <param name="url" value="video.ogv"/>
            </applet>
            -or-
            <object type="application/x-java-applet" width="320" height="240">  
                <param name="archive" value="http://theora.org/cortado.jar">
                <param name="code" value="com.fluendo.player.Cortado.class">  
                <param name="url" value="video.ogv">  
                <p>You need to install Java to play this video.</p>
            </object>
        */

        var size = this.getSize();
        var cfg = Ext.copyTo( {
            tag: 'video',
            width: size.width,
            height: size.height
        }, this, 'poster,start,loopstart,loopend,playcount,autobuffer,loop' );

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

        this.video = this.body.createChild( cfg );

        /* notable html5 video events:
         * abort, canplay, canplaythrough, canshowcurrentframe,
         * dataunavailable, durationchange, emptied, empty,
         * ended, error, load, loadedfirstframe, loadedmetadata,
         * loadstart, pause, play, ratechange, seeked, seeking,
         * timeudpate, volumechange, waiting
         */

        this.on( 'bodyresize', function( panel, width, height ) {
            if ( this.video )
                this.video.setSize( width, height );
        }, this );
    },

    destroy: function() {
        this.video = null;
        Ext.ux.HTML5VideoPanel.superclass.destroy.call( this, arguments );
    }

} );

Ext.reg( 'html5video', Ext.ux.HTML5VideoPanel );

new Apps.HTML5VideoPlayer();

/* -------------------------------------------------------------------------*/
