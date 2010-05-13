/*
 * Comet Desktop v2
 * Copyright(c) 2008-2009 David Davis
 *
 * Authors:
 *
 * David Davis      - <xantus@xantus.org>
 * http://xant.us/
 *
 */

/*
 * Comet Desktop is built on:
 *
 * Ext JS Library 3.0.2
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ns( 'CometDesktop' );
Ext.ns( 'Apps' );

Ext.apply( CometDesktop, {

    idCounter: 1,

    id: function( x ) {
        return ( x || 'cd-gen' ) + (++CometDesktop.idCounter);
    },

    timing: [
        [ 'begin', window.stNow || new Date() ],
        [ 'load', new Date() ]
    ],

    time: function( name ) {
        CometDesktop.timing.push( [ name, new Date() ] );
    }

});

Ext.apply( window, {
    app: CometDesktop
});

CometDesktop.App = Ext.extend( Ext.util.Observable, {

    isReady: false,
    modules: [],
    minimizeAll: true,

//        'js/samples.js'//,
//        '/apps/irc-example/js/irc-client.js'
//        'js/html5video.js',
//        'js/googlewave.js',
//        'js/xmpp/client.js',
//        'js/feed-reader/feed-reader.css',
//        'js/feed-reader/feed-reader.js',

    // XXX not sure I want to go this route
    channels: {
        registerApp: '/desktop/app/register'
    },

    constructor: function( config ) {
        window.app = this;
        Ext.apply( this, CometDesktop, config );

        this.time( 'startup' ); // timing stats

        this.logTiming();

        Ext.WindowMgr = this.wsManager = new CometDesktop.WorkspaceManager();
        this.keyManager = new CometDesktop.KeyManager();
        // TBD set up this.gaTracker using the account number from the config

        this.subscribe( '*', this.logEvents, this );
        this.subscribe( this.channels.registerApp, this.eventRegisterApp, this );

        this.viewport = new Ext.Viewport({
            layout: 'border',
            items:[
                {
                    id: 'cd-top-toolbar',
                    xtype: 'cd-top-toolpanel',
                    region: 'north',
                    hidden: true
                },{
                    id: 'cd-desktop',
                    xtype: 'cd-desktop',
                    region: 'center'
                },{
                    id: 'cd-task-panel',
                    border: false,
                    xtype: 'cd-task-panel',
                    region: 'south',
                    hidden: true
                }
            ]
        });

        this.addEvents(
            'ready',
            'beforeunload'
        );

        Ext.onReady( this.initApp, this );
    },

    initApp: function() {
        Ext.QuickTips.init();

        this.launcher = Ext.getCmp( 'appsMenu' );
        this.desktop = Ext.getCmp( 'cd-desktop' );
        this.taskbar = Ext.getCmp( 'cd-task-panel' );

        Ext.fly( 'loading' ).remove();
        Ext.fly( 'loading-mask' ).fadeOut( { duration: 1.5 } );

        Ext.EventManager.on( window, 'beforeunload', this.onUnload, this );

        this.subscribe( '/desktop/show', this.eventShowDesktop, this );
        this.subscribe( '/desktop/lock', this.eventLockDesktop, this );
        this.subscribe( '/desktop/unlock', this.eventUnLockDesktop, this );
        this.subscribe( '/desktop/logout', this.eventLogout, this );
        this.subscribe( '/desktop/login', this.eventLogin, this );

        this.isReady = true;
        this.fireEvent( 'ready', this );
        this.time( 'ready' );

        /* login app */
        this.publish( '/desktop/app/login', { action: 'launch' } );
    },

    logEvents: function( ev, ch ) {
        log('EVENT LOG: channel:'+ch+' event:'+Ext.encode( ev ));
        //if ( ch != '/desktop/system/notification' )
        //    this.publish( '/desktop/system/notification', { html: '<span style="font-size:12px;font-weight:bold">channel:'+ch+'<br>event:'+Ext.encode( ev )+'</span>' } );
    },

    logTiming: function() {
        var timing = CometDesktop.timing;
        var begin = timing[ 0 ][ 1 ].getTime();
        for ( var i = 0, len = timing.length - 1; i < len; i++ ) {
            var since = ( timing[ i ][ 1 ].getTime() - begin ) / 1000;
            var ms = ( timing[ i + 1 ][ 1 ].getTime() - timing[ i ][ 1 ].getTime() ) / 1000;
            log( timing[ i + 1 ][ 0 ] + ':' + ( Math.floor( ms * 10 ) / 10 ) + 'ms and '+( Math.floor( since * 10 ) / 10 )+' since start' )
        }
    },

    eventRegisterApp: function( ev ) {
        // defer early registrations until ready
        if ( !this.isReady )
            return Ext.onReady( this.eventRegisterApp.createDelegate( this, [ ev ] ) );

        log('app registered:'+ev.channel);

        // insert apps before the - and add/remove menu items
        this.launcher.insert( this.launcher.items.length - 2, ev );

        this.modules.push( ev );
    },

    eventLogin: function( ev ) {
        Ext.getCmp( 'cd-top-toolbar' ).show();
        Ext.getCmp( 'cd-task-panel' ).show();
        this.viewport.doLayout();

        var manifest = [];

        if ( ev.res && ev.res.data ) {
            if ( ev.res.data.load )
                manifest = manifest.concat( ev.res.data.load );
            if ( ev.res.data.nickname )
               Ext.getCmp( 'system-user-menu' ).setText( ev.res.data.nickname );
        }

        var apps = [ '@core-support' ];
        Ext.each( manifest, function( o ) {
            apps.push( '@' + o.id );
            $JIT.depends[o.id] = { virtual: true, depends: [ o.path + o.file  ] };
        });

        // our virtual to load all the apps
        $JIT.depends[ 'user-apps' ] = { virtual: true, depends: apps };
        $JIT.depends[ 'core-support' ] = { virtual: true, depends: [ 'core/support.js' ] };

        $JIT({
//            debug: true,
            method: 'GET',
            callback: function( loaded ) {
                if ( !loaded )
                    return;

                var i = 0;
                Ext.each( this.modules, function( m ) {
                    if ( m.autoStart ) {
                        // TBD revisit this
                        i += 500;
                        this.publish.defer( i, this, [ m.channel, { action: 'launch' } ] );
                    }
                }, this);
            },
            scope: this
        }, '@user-apps' );

/*
        new CometDesktop.FileFetcher({
            files: manifest,
            noCache: true,
            start: true,
            itemHandler: function( item ) {
                //this.publish( this.appChannel, Ext.apply( data, { action: 'file-loaded' } ) );
                log('do something with basename',item);
            },
            success: function() {
                var i = 0;
                Ext.each( this.modules, function( m ) {
                    if ( m.autoStart ) {
                        // TBD revisit this
                        i += 500;
                        this.publish.defer( i, this, [ m.channel, { action: 'launch' } ] );
                    }
                }, this);
            },
            failure: function() {
                // TBD better error handling
                log('failed to load all files');
            },
            scope: this
        });
*/
    },

    eventLogout: function() {
        Ext.Ajax.request({
            method: 'POST',
            url: 'logout',
            success: function( r ) {
                var data = app.decodeResponse( r );
                if ( data.success )
                    window.location.reload();
                else if ( data.error )
                    Ext.MesageBox.alert( 'Error', data.error );
                else
                    Ext.MesageBox.alert( 'Error '+r.status, r.statusText );
            },
            failure: function( r ) {
                Ext.MesageBox.alert( 'Error '+r.status, r.statusText );
            }
        });
    },

    eventLockDesktop: function() {
        // TBD, unlock, etc
        Ext.fly( 'loading-mask' ).fadeIn({
            duration: 1.5,
            callback: function() {
                Ext.fly( 'locked-status' ).fadeIn({ duration: 1 });
            }
        });
    },

    eventUnLockDesktop: function() {
        // TBD, unlock, etc
        Ext.fly( 'loading-mask' ).fadeIn({
            duration: 1.5,
            callback: function() {
                Ext.fly( 'locked-status' ).fadeIn({ duration: 1 });
                
            }
        });
    },

    eventShowDesktop: function() {
        this.wsManager.each(function( win ) {
            if ( this.minimizeAll ) {
                win.minimize();
            } else {
                if ( !win.isVisible() )
                    win.show();
                else
                    win.restore();
            }
        }, this);
        // XXX this allows it to toggle
        //this.minimizeAll = this.minimizeAll === false;
    },

    getModule: function( name ) {
        var ms = this.modules;
        for ( var i = 0, len = ms.length; i < len; i++ )
            if ( ms[ i ].id == name || ms[ i ].appType == name )
                return ms[ i ];
        return '';
    },

    onReady: function( fn, scope ) {
        if ( !this.isReady )
            this.on( 'ready', fn, scope );
        else
            fn.call( scope, this );
    },

    onUnload: function(e) {
        if ( this.fireEvent( 'beforeunload', this ) === false )
            e.stopEvent();
    },

    gaSetVar: function( v ) {
        if ( !this.gaTracker )
            return;
        return this.gaTracker._setVar( v );
    },

    gaPageview: function( id ) {
        if ( !this.gaTracker )
            return;
        log('ga pageview: ' + id);
        return this.gaTracker._trackPageview( id );
    },

    sha1_hex: function( data ) {
        if ( !this.sha1 )
            this.sha1 = new CometDesktop.SHA1();
        return this.sha1.hex( data );
    },

    /* window handling */
    createWindow: function( config, cls ) {
        tools = Ext.isArray( config.tools ) ? config.tools : [];
        var win = null;
        /*
        tools.push({
            id: 'gear',
            hidden: true,
            handler: function() { log('gear'); }
        });
        */
        if ( !config.noPin ) {
            tools.push({
                id: 'pin',
                hidden: true,
                handler: function() {
                    win.pinned = ( win.pinned ) ? false : true;
                    if ( win.pinned )
                        win.getTool( 'pin' ).show();
                }
            });
        }
        var cfg = Ext.applyIf( config || {}, {
            xtype: 'window',
            tools: tools,
            manager: this.wsManager,
            //constrain: true,
            constrainHeader: true,
            animCollapse: true,
            minimizable: true,
            maximizable: true
        });

        win = cls ? new ( cls )( cfg ) : Ext.create( cfg );

        if ( win.captureKeypress )
            this.keyManager.register( win );

        win.taskButton = this.taskbar.addTaskButton( win );
        if ( !win.animateTarget )
            win.animateTarget = win.taskButton.el;

        win.on({
            activate: {
                fn: this.windowMarkActive
            },
            beforeshow: {
                fn: this.windowMarkActive
            },
            deactivate: {
                fn: this.windowMarkInactive
            },
            minimize: {
                fn: this.windowMinimize
            },
            close: {
                fn: this.windowRemove
            },
            beforerender: {
                fn: this.windowRenderFix
            },
            show: {
                fn: this.windowOnShow,
                single: true
            },
            iconchange: {
                fn: this.windowIconChange
            },
            scope: this
        });

        return win;
    },

    windowIconChange:function( win, newCls ) {
        win.taskButton.setIconClass( newCls );
    },

    windowMinimize: function( win ) {
        win.minimized = true;
        win.hide();
    },

    windowMarkActive: function( win ) {
        var active = this.wsManager.getActiveWindow( win );
        if ( active && active !== win )
            this.windowMarkInactive( active );

        this.wsManager.setActiveWindow( win );
        this.taskbar.setActiveButton( win.taskButton );
        Ext.fly( win.taskButton.el ).addClass( 'active-win' );
        win.minimized = false;
    },

    windowMarkInactive: function( win ) {
        var active = this.wsManager.getActiveWindow( win );
        if ( win === active ) {
            // deactivate window?
//            this.wsManager.setActiveWindow( null );
            Ext.fly( win.taskButton.el ).removeClass( 'active-win' );
        }
    },

    windowRemove: function( win ) {
        this.taskbar.removeTaskButton( win.taskButton );
        win.taskButton = null;
    },

    windowOnShow: function( win ) {
        this.wsManager.switchTo( win );
        win.taskButton.show( null );

        if ( !win.maximized ) {
            // get all of the window positions in a simple x:y array
            var loc = [];
            this.wsManager.each(function( w ) {
                // TBD maximized?
                if ( !w || !w.isVisible() || win === w )
                    return;
                loc.push( w.getPosition().join(':') );
            }, win );

            // compare the windows x:y until we find a window it won't directly overlap
            var repos = false;
            var d = win.getBox();
            while ( loc.indexOf( d.x + ':' + d.y ) != -1 ) {
                // window directly overlaps another, offset it by 24,24
                d.x += 24; d.y += 24;
                repos = true;
            }
            // shift the window and save the position when it is done
            if ( repos ) {
                // don't fire deactivate
                win.el.disableShadow();
                win.el.shift({
                    x: d.x,
                    y: d.y,
                    duration: .25,
                    callback: function() {
                        this.setPagePosition( d.x, d.y );
                        // don't fire activate again
                        if ( !this.maximized )
                            this.el.enableShadow( true );
                    },
                    scope: win
                });
            }

            // fix an IE6 display bug
            if ( Ext.isIE6 )
                win.setWidth( d.width );
        }

        if ( !win.noPin ) {
            win.header.hover( function() {
                if ( this._hoverOutTask ) {
                    this._hoverOutTask.cancel();
                    this._hoverOutTask = null;
                }
                if ( !this._hoverTask )
                    this._hoverTask = new Ext.util.DelayedTask( function() {
                        this._hoverTask = null;
                        Ext.iterate( this.tools, function( x ) {
                            if ( /^(minimize|maximize|restore|close|toggle)$/.test( x ) )
                                return;
                            if ( x == 'pin' && this.pinned )
                                return;
                            try {
                                this.tools[ x ].stopFx().fadeIn( { duration: .5 } );
                            } catch(e){};
                        }, this );
                    }, this );
                this._hoverTask.delay( 500 );
            }, function() {
                if ( this._hoverTask ) {
                    this._hoverTask.cancel();
                    this._hoverTask = null;
                }
                if ( !this._hoverOutTask )
                    this._hoverOutTask = new Ext.util.DelayedTask( function() {
                        this._hoverOutTask = null;
                        Ext.iterate( this.tools, function( x ) {
                            if ( /^(minimize|maximize|restore|close|toggle)$/.test( x ) )
                                return;
                            if ( x == 'pin' && this.pinned )
                                return;
                            try {
                                this.tools[ x ].stopFx().fadeOut( { duration: .3 } );
                            } catch(e){};
                        }, this );
                    }, this );
                this._hoverOutTask.delay( 700 );
            }, win );
        }

        win.header.on( 'click', win.taskButton.contextMenu, win.taskButton );
        win.header.on( 'contextmenu', win.taskButton.contextMenu, win.taskButton );

        // TBD: option to enable/disable win
        // remove win behavior, and enable double click to expand/collapse
        win.header.un( 'dblclick', win.toggleMaximize, win );
        win.header.on( 'dblclick', function() {
            if ( this.collapsed )
                this.expand();
            else
                this.collapse();
        }, win );
    },

    /* hack to allow afterrender listeners to be set
     * since win.render( win.renderTo ); is called on
     * window construction IF set and in essence
     * firing afterrender before you have a chance to
     * listen to the event
     */
    windowRenderFix: function( win ) {
        if ( win.renderTo )
            return;
        win.render( win.renderTo = this.desktop.el );
        delete win.renderTo;
        return false;
    },

    getManager: function() {
        return this.wsManager;
    },

    getWindow: function( id ) {
        var win = this.wsManager.getWindow( id );
        if ( win ) {
            // XXX automatically move to the current workspace
            this.wsManager.moveToCurrent( win );
            return win;
        }
    },

    /* TBD nuke these? */
    getWinWidth: function() {
        var width = this.desktop.el.getWidth();
        return width < 200 ? 200 : width;
    },

    getWinHeight: function() {
        var height = this.desktop.el.getHeight();
        return height < 100 ? 100 : height;
    },

    getWinX: function( width ) {
        return ( this.desktop.el.getWidth() - width ) / 2;
    },

    getWinY: function( height ) {
        return ( this.desktop.el.getHeight() - height ) / 2;
    },

    websocketUrl: function( path, port ) {
        var https = window.location.protocol.substr( -2, 1 ) == 's' ? true : false;
        return 'ws' + ( https ? 's' : '' ) + '://' + window.location.hostname + ( port ? ':' + port : '' ) + ( path || '/' );
    },

    decodeResponse: function( r ) {
        var data = ( r.responseText.substr( 0, 1 ) == '{' )
            ? Ext.decode( r.responseText ) : Ext.copyTo( { success: false }, r, 'responseText,status,statusText' );
        log(data);
        return data;
    }

});

/* -------------------------------------------------------------------------*/

Ext.onReady(function() {

    try {
        document.write = function( html ) {
            log('document.write captured:', arguments);
            Ext.DomHelper.insertHtml( 'afterEnd', document.body, html );
        };
    } catch(e) { log('document write catch error:'+e); };

});

/* -------------------------------------------------------------------------*/

/* PubSub based menus */

Ext.override( Ext.menu.BaseItem, {

    initComponent: function() {
        Ext.menu.BaseItem.superclass.initComponent.apply( this, arguments );

        if ( this.channel && !this.handler ) {
            log('registered menu channel '+this.channel);
            this.on( 'click', function() { this.publish( this.channel, { action: 'launch' } ); }, this );
        }

        if ( this.handler )
            this.on( 'click', this.handler, this.scope || this );
    }

});

/* -------------------------------------------------------------------------*/

/* PubSub based buttons, etc */

Ext.override( Ext.BoxComponent, {

    initComponent: function() {
        Ext.BoxComponent.superclass.initComponent.apply( this, arguments );

        if ( this.channel && !this.handler ) {
            log('registered box component channel '+this.channel);
            this.on( 'click', function() { this.publish( this.channel, { action: 'launch' } ); }, this );
        }
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.WorkspaceManager = Ext.extend( Ext.util.Observable, {

    constructor: function( config ) {
        Ext.apply( this, {
            rows: 2,
            cols: 2,
            zseed: 9000
        }, config );
        this.groups = [];
        this.groupMap = {};

        /* send /desktop/workspace/switch/1 or
         * /desktop/worspace/switch and event: { ws: 1 }
         */
        this.subscribe( '/desktop/workspace/switch', this.eventSwitchWorkspace, this );

        for ( var i = 0, len = this.rows * this.cols; i < len; i++ ) {
            var grp = this.createWindowGroup();
            this.groupMap[ grp.id ] = grp;
            this.groups.push( grp ); // TBD switch to only ids?
        }

        this.wg = this.groups[ 0 ];
    },

    createWindowGroup: function() {
        var group = new Ext.WindowGroup( { zseed: this.zseed } );
        group.id = app.id( 'cd-ws-' );
        return group;
    },

    eventSwitchWorkspace: function( ev, ch ) {
        if ( Ext.isObject( ev ) && ev.ws ) {
            if ( !isNaN( ev.ws ) )
                this.switchTo( ev.ws );
        } else {
            var id = ch.match( /\d+$/ )[0];
            if ( !isNaN( id ) )
                this.switchTo( id );
        }
    },

    currentGroup: function() {
        return this.wg;
    },

    moveToCurrent: function( win ) {
        if ( win.wsId == this.wg.id )
            return;
        // move the window to the new work space
        win.hide( null );
        win.taskButton.hide( null );
        this.unregister( win );
        this.register( win );
    },

    eachAll: function() {
        for ( var i = 0, len = this.groups.length; i < len; i++ )
            this.groups[ i ].each.apply( this.groups[ i ], arguments );
    },

    /* pass a window obj, or workspace id */
    getWorkspace: function( ws ) {
        if ( Ext.isObject( ws ) ) {
            var idx;
            for ( var i = 0, len = this.groups.length; i < len; i++ )
                this.groups[ i ].each(function( w ) {
                    if ( w === ws )
                        idx = i;
                });
            if ( isNaN( idx ) )
                return false;
            else
                ws = idx;
        } else
            ws -= 1; // make it zero based

        if ( ws > this.groups.length - 1 )
            return;

        return this.groups[ ws ];
    },

    /* pass a window obj, or workspace id */
    switchTo: function( ws ) {
        ws = this.getWorkspace( ws );
        if ( !ws )
            return;

        /* avoid hide/show */
        if ( this.wg === ws )
            return this.wg;

        /* preserve the z order by using getBy which walks in last access order, and reverse it */
        Ext.each( this.getBy(function() { return true }).reverse(), function( win ) {
            if ( win.pinned ) {
                // move the window to the new workspace
                this.unregister( win );
                win.wsId = ws.id;
                ws.register( win );
            } else {
                win.hide( null ); // no animation
                win.taskButton.hide( null );
            }
        }, this );

        this.wg = ws;

//        Ext.invoke( this.getBy(function() { return true }).reverse(), 'show', null );
        Ext.each( this.getBy(function() { return true }).reverse(), function( win ) {
            // keep the window minimized
            if ( win.minimized )
                win.taskButton.show( null );
            else
                win.show();
        }, this );

        return this.wg;
    },

    /* find a window across all spaces */
    getWindow: function( id ) {
        for ( var i = 0, len = this.groups.length; i < len; i++ ) {
            var win = this.groups[ i ].get( id );
            if ( win )
                return win;
        }
    },

    getActiveWindow: function( win ) {
        var ws = this.groupMap[ win.wsId ]
        return ( ws ? ws : this.wg ).getActive();
    },

    setActiveWindow: function( win ) {
        if ( win )
            return this.bringToFront( win );
    },

    each: function() {
        return this.wg.each.apply( this.wg, arguments );
    },

    get: function() {
        return this.wg.get.apply( this.wg, arguments );
    },

    getActive: function() {
        return this.wg.getActive();
    },

    getBy: function() {
        return this.wg.getBy.apply( this.wg, arguments );
    },

    hideAll: function() {
        this.wg.hideAll();
    },

    bringToFront: function( win ) {
        var ws = this.groupMap[ win.wsId ];
        return ( ws ? ws : this.wg ).bringToFront( win );
    },

    sendToBack: function( win ) {
        var ws = this.groupMap[ win.wsId ]
        return ( ws ? ws : this.wg ).sendToBack( win );
    },

    register: function( win ) {
        win.wsId = this.wg.id;
        return this.wg.register( win );
    },

    unregister: function( win ) {
        var ws = this.groupMap[ win.wsId ];
        return ( ws ? ws : this.wg ).unregister( win );
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.ToolPanel = Ext.extend( Ext.Toolbar, {

    constructor: function( config ) {
        if ( !this.id )
            this.id = app.id( 'toolbar-' );
        /*
        if ( !Ext.isArray( this.plugins ) )
            this.plugins = [];
        this.plugins.push( new Ext.ux.ToolbarReorderer({ defaultReorderable: true }) );
        */
        var appsMenu = new Ext.menu.Menu({
            id: 'appsMenu',
            style: {
                overflow: 'visible'
            },
            items: [
                '-', {
                    text: 'Add/Remove&hellip;',
                    iconCls: 'cd-icon-apps-system-addremove',
                    channel: '/desktop/apps/add-remove'
                }
            ]
        });

        var placesMenu = new Ext.menu.Menu({
            id: 'placesMenu',
            style: {
                overflow: 'visible'
            },
            items: [
                {
                    text: 'Home Folder',
                    iconCls: 'cd-icon-place-home',
                    channel: '/desktop/places/home'
                }, {
                    text: 'Desktop',
                    iconCls: 'cd-icon-place-desktop',
                    channel: '/desktop/places/desktop'
                }, '-', {
                    text: 'Computer',
                    iconCls: 'cd-icon-place-computer',
                    channel: '/desktop/places/computer'
                }
            ]
        });

        var systemMenu = new Ext.menu.Menu({
            id: 'systemMenu',
            style: {
                overflow: 'visible'
            },
            items: [
                {
                    text: 'Preferences',
                    iconCls: 'cd-icon-system-prefs',
                    menu: {
                        items: [
                            {
                                text: 'About Me',
                                iconCls: 'cd-icon-system-prefs-about',
                                channel: '/desktop/system/prefs/about'
                            }, {
                                text: 'Appearance',
                                iconCls: 'cd-icon-system-prefs-appearance',
                                channel: '/desktop/system/prefs/appearance'
                            }, {
                                text: 'Main Menu',
                                iconCls: 'cd-icon-system-prefs-mainmenu',
                                channel: '/desktop/system/prefs/mainmenu'
                            }, {
                                text: 'Sound',
                                iconCls: 'cd-icon-system-prefs-sound',
                                channel: '/desktop/system/prefs/sound'
                            }, {
                                text: 'Windows',
                                iconCls: 'cd-icon-system-prefs-windows',
                                channel: '/desktop/system/prefs/windows'
                            }
                        ]
                    }
                }, {
                    text: 'Administration',
                    iconCls: 'cd-icon-system-admin',
                    menu: {
                        items: [
                            {
                                text: 'Language Support',
                                iconCls: 'cd-icon-system-admin-locale',
                                channel: '/desktop/system/admin/locale'
                            }, {
                                text: 'Login Window',
                                iconCls: 'cd-icon-system-admin-login',
                                channel: '/desktop/system/admin/login'
                            }, {
                                text: 'System Monitor',
                                iconCls: 'cd-icon-system-admin-system',
                                channel: '/desktop/system/admin/system'
                            }, {
                                text: 'Time and Date',
                                iconCls: 'cd-icon-system-admin-datetime',
                                channel: '/desktop/system/admin/datetime'
                            }, {
                                text: 'Users and Groups',
                                iconCls: 'cd-icon-system-admin-users',
                                channel: '/desktop/system/admin/users'
                            }
                        ]
                    }
                }, '-', {
                    text: 'Help and Support',
                    iconCls: 'cd-icon-system-help',
                    channel: '/desktop/system/help'
                }, {
                    text: 'About Comet Desktop',
                    iconCls: 'cd-icon-system-about',
                    channel: '/desktop/system/about'
                }
            ]
        });

        var checkHandler = function( item, checked ) {
            if ( checked ) {
                Ext.getCmp( 'system-user-menu' ).setIconClass( item.iconCls );
                this.publish( '/desktop/user/status', { action: 'change', status: item.status } );
            }
        };

        var userMenu = new Ext.menu.Menu({
            id: 'userMenu',
            style: {
                overflow: 'visible'
            },
            items: [
                {
                    text: 'Available',
                    iconCls: 'cd-icon-user-status-available',
                    status: 'available',
                    checked: true,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Away',
                    iconCls: 'cd-icon-user-status-away',
                    status: 'away',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Busy',
                    iconCls: 'cd-icon-user-status-busy',
                    status: 'busy',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Invisible',
                    iconCls: 'cd-icon-user-status-invisible',
                    status: 'invisible',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Offline',
                    iconCls: 'cd-icon-user-status-offline',
                    status: 'offline',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, '-', {
                    text: 'Lock screen',
                    iconCls: 'cd-icon-user-lock',
                    channel: '/desktop/lock'
                }, '-', {
                    text: 'Log Out&hellip;',
                    iconCls: 'cd-icon-user-logout',
                    channel: '/desktop/logout'
                }
            ]
        });

        var dateMenu = new Ext.menu.DateMenu({
            handler: function( dp, date ) {
                //Ext.example.msg('Date Selected', 'You chose {0}.', date.format('M j, Y'));
            }
        });

        var dateControl = new Ext.Action({
            text: '',
            menu: dateMenu
        });

        var dr = Ext.util.Format.dateRenderer( 'D M j, H:i' );
        var setDate = function() {
            var dt = new Date;
            dateControl.setText( dr( dt ) );
            // defer until after the nearest minute
            setDate.defer( ( 61 - dt.format( 's' ) ) * 1000 );
        };

        setDate();

        var wsToggle = function( btn, pressed ) {
            if ( !pressed )
                return;
            app.publish( '/desktop/workspace/switch', { ws: btn.ws } );
        };

        CometDesktop.ToolPanel.superclass.constructor.call( this, Ext.applyIf( config, {
            width: '100%',
            height: 30,
            plain: true,
            border: false,
            items: [
                {
                    text: 'Applications',
                    iconCls: 'cd-icon-apps',
                    menu: appsMenu
                }, ' ', ' ',
                {
                    text: 'Places',
                    menu: placesMenu
/*
                    menu: new CometDesktop.menu.StoreMenu({ data: [
                        {
                            text: 'Home Folder',
                            iconCls: 'cd-icon-place-home',
                            channel: '/desktop/places/home'
                        }, {
                            text: 'Desktop',
                            iconCls: 'cd-icon-place-desktop',
                            channel: '/desktop/places/desktop'
                        }, '-', {
                            text: 'Computer',
                            iconCls: 'cd-icon-place-computer',
                            channel: '/desktop/places/computer'
                        }
                    ] })
*/
                }, ' ', ' ', {
                    text: 'System',
                    menu: systemMenu
                }, '->', {
                    text: ' 1 ',
                    ws: 1,
                    enableToggle: true,
                    reorderable: false,
                    toggleHandler: wsToggle,
                    pressed: true,
                    toggleGroup: 'ws-toggle'
                },
                {
                    text: ' 2 ',
                    ws: 2,
                    enableToggle: true,
                    reorderable: false,
                    toggleHandler: wsToggle,
                    toggleGroup: 'ws-toggle'
                },
                {
                    text: ' 3 ',
                    ws: 3,
                    enableToggle: true,
                    reorderable: false,
                    toggleHandler: wsToggle,
                    toggleGroup: 'ws-toggle'
                },
                {
                    text: ' 4 ',
                    ws: 4,
                    enableToggle: true,
                    reorderable: false,
                    toggleHandler: wsToggle,
                    toggleGroup: 'ws-toggle'
                }, '-', dateControl, '-', {
                    id: 'websocketStatus',
                    channel: '/desktop/system/websocket',
                    iconCls: 'cd-icon-websocket-disconnected'
                }, {
                    id: 'notificationArea',
                    iconCls: 'cd-icon-system-notification',
                    menu: [{
                        text: 'Show Last Notification',
                        channel: '/desktop/system/notification'
                    }]
                }, {
                    id: 'system-user-menu',
                    text: 'Guest User',
                    iconCls: 'cd-icon-user-status-available',
                    menu: userMenu
                }
            ]
        }) );

        this.on( 'render', this._onRender, this );
    },

    _onRender: function() {
        this.dropTarget = new Ext.dd.DropTarget( this.el, {
            ddGroup: 'toolbar-group',
            copy: false,
            notifyDrop: function() {
                log('drop');
                return true;
            },
            notifyEnter: function() {
                log('enter');
                // open menu, etc
            }
        });

        this.menu = new Ext.menu.Menu({
            items: [{
                text: 'Add to Panel&hellip;',
                iconCls: 'cd-icon-toolbar-add',
                channel: '/desktop/toolbar/' + this.id + '/add'
            },{
                text: 'Properties',
                iconCls: 'cd-icon-toolbar-properties',
                channel: '/desktop/toolbar/' + this.id + '/properties'
            }]
        });

        this.el.on( 'contextmenu', function( e ) {
            e.stopEvent();
            if ( !this.menu.el )
                this.menu.render();

            var xy = e.getXY();

            // open the menu upwards if it will fall below the viewable area
            var mHeight = this.menu.el.getHeight();
            if ( mHeight + xy[ 1 ] > Ext.lib.Dom.getViewHeight() )
                xy[ 0 ] -= mHeight;

            // open the menu to the left if it will fall outside the viewable area
            var mWidth = this.menu.el.getWidth();
            if ( mWidth + xy[ 0 ] > Ext.lib.Dom.getViewWidth() )
                xy[ 0 ] -= mWidth;

            this.menu.showAt( xy );
        }, this );
    }

});

Ext.reg( 'cd-top-toolpanel', CometDesktop.ToolPanel );

/* -------------------------------------------------------------------------*/

CometDesktop.Desktop = Ext.extend( Ext.BoxComponent, {

    constructor: function( config ) {
        CometDesktop.Desktop.superclass.constructor.call( this, Ext.applyIf( config || {}, {
            height: '100%',
            width: '100%'
        } ) );
        this.on( 'render', this._onRender, this );
    },

    _onRender: function() {
        this.menu = new Ext.menu.Menu({
            items: [{
                text: 'Change Desktop Background',
                iconCls: 'cd-icon-system-prefs-appearance-background',
                channel: '/desktop/system/prefs/appearance/background'
            }]
        });

        this.el.on( 'contextmenu', function( e, el ) {
            // only handle the desktop
            if ( el !== this.el.dom )
                return;
            e.stopEvent();
            if ( !this.menu.el )
                this.menu.render();

            var xy = e.getXY();

            // open the menu upwards if it will fall below the viewable area
            var mHeight = this.menu.el.getHeight();
            if ( mHeight + xy[ 1 ] > Ext.lib.Dom.getViewHeight() )
                xy[ 0 ] -= mHeight;

            // open the menu to the left if it will fall outside the viewable area
            var mWidth = this.menu.el.getWidth();
            if ( mWidth + xy[ 0 ] > Ext.lib.Dom.getViewWidth() )
                xy[ 0 ] -= mWidth;

            this.menu.showAt( xy );
        }, this );
    }

});

Ext.reg( 'cd-desktop', CometDesktop.Desktop );

/* -------------------------------------------------------------------------*/

Ext.ns( 'CometDesktop.menu' );

CometDesktop.menu.StoreMenu = Ext.extend( Ext.menu.Menu, {

    loadMsg: Ext.LoadMask.prototype.msg || 'Loading&hellip;',

    constructor: function() {
        CometDesktop.menu.StoreMenu.superclass.constructor.apply( this, arguments );

        this.loaded = false;

        if ( !this.store ) {
            if ( this.url ) {
                this.store = new Ext.data.SimpleStore({
                    fields: [ 'config' ],
                    url: this.url,
                    baseParams: this.baseParams || {}
                });
            } else {
                this.local = true;
                this.loaded = true;
                this.store = new Ext.data.ArrayStore({
                    fields: [ 'config' ],
                    data: this.data || [ { text: 'No menu config specified' } ]
                });
            }
        }

        this.store.on( 'beforeload', this._storeOnBeforeLoad, this );
        this.store.on( 'load', this._storeOnLoad, this );

        this.on( 'show', this._onShow, this );
    },

    _onShow: function() {
        if ( this.loaded )
            this.updateMenu( this.store.getRange() );
        else
            this.store.load();
    },

    _storeOnBeforeLoad: function( store ) {
        store.baseParams = this.baseParams;
        this.updateMenu();
    },

    _storeOnLoad: function( store, records ) {
        this.updateMenu( records );
    },

    updateMenu: function( records ) {
        // TBD attach to the store, and only modify the menu when it changes
        this.removeAll();
        this.el.sync();

        if ( !records ) {
            if ( this.local )
                return;
            this.add( String.format( '<span class="loading-indicator">{0}</span>', this.loadMsg ) );
            return;
        }

        this.loaded = true;

        for ( var i = 0, len = records.length; i < len; i++ ) {
            // TBD do this, or require xtype for sub menus
            if ( records[ i ].json.menu )
                records[ i ].json.menu = new Ext.menu.Menu( records[ i ].json.menu );
            this.add( records[ i ].json );
        }
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.Module = Ext.extend( Ext.util.Observable, {

    constructor: function( config ) {
        Ext.apply( this, config );

        // TBD use id instead?
        if ( !this.id )
            this.id = app.id( 'app-' );

        // TBD use channel instead?
        if ( !this.appChannel )
            this.appChannel = '/desktop/app/' + this.id;

        this.init( config );

        if ( this.requires ) {
            //Ext.apply( $JIT.depends, this.requires );
            if ( $JIT.depends[ this.appId ] ) {
                $JIT.depends[ this.appId ].depends = $JIT.depends[ this.appId ].depends.concat( this.requires );
            } else {
                $JIT.depends[ this.appId ] = { virtual: true, depends: this.requires };
            }
            $JIT({
                method: 'GET',
                modulePath: 'apps/' + this.appName + '/',
                scope: this,
                callback: function( loaded ) {
                    if ( loaded )
                        this.startup();
                },
            }, '@' + this.appId );
        } else {
            this.startup();
        }
    },

    init: Ext.emptyFn,
    startup: Ext.emptyFn,

    register: function( ev ) {
        this.publish( app.channels.registerApp, ev );
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.KeyManager = Ext.extend( Ext.util.Observable, {

    constructor: function() {
        this.wins = [];
        this.active = false;

/*
        if ( Ext.isIE )
            document.onkeydown = this.keyEvent.createDelegate( this );
        else
            document.onkeypress = this.keyEvent.createDelegate( this );
*/
        if ( Ext.isIE )
            Ext.EventManager.on( document, 'keydown', this.keyEvent, this );
        else
            Ext.EventManager.on( document, 'keypress', this.keyEvent, this );
    },

    keyEvent: function( ev ) {
        if ( !this.active )
            return;

        if ( !this.activeWin ) {
            this.active = false;
            log('active win is gone!');
            return;
        }

        return this.activeWin.fireEvent( 'documentKeypress', ev );
    },

    register: function( win ) {
        // TBD check for dupes?

        log('register window');
        win.addEvents(
            /**
             * @event documentkeypress
             * Fires when a keypress on the document occurs and the window is active
             * @param {Ext.Window} this
             * @param {Object} event
             */
            'documentkeypress'
        );

        log('registered new window');
        this.wins.push( win );
        win.on( 'close', this.windowClose, this );
        win.on( 'activate', this.windowActivate, this );
        win.on( 'deactivate', this.windowDeactivate, this );
    },

    windowActivate: function( win ) {
        log('activate win');
        this.active = true;
        this.activeWin = win;
    },

    windowDeactivate: function( win ) {
        log('deactivate win');
        this.active = false;
        this.activeWin = null;
    },

    windowClose: function( win ) {
        log('window closed');
        this.unregister( win );
    },

    unregister: function( win ) {
        if ( this.activeWin === win ) {
            this.active = false;
            this.activeWin = null;
        }
        this.wins.remove( win );
    }

});

/* -------------------------------------------------------------------------*/

/**
*  SHA-1
*  http://www.webtoolkit.info/javascript-sha1.html
*  License:
*  "As long as you leave the copyright notice of the original script,
*  or link back to this website, you can use any of the content
*  published on this website free of charge for any use: commercial
*  or noncommercial."
*
*  Modified by David Davis
**/

CometDesktop.SHA1 = Ext.extend( Ext.util.Observable, {

    hex: function( msg ) {
        msg = this.utf8Encode( msg );
        var W = new Array( 80 );
        var H0 = 0x67452301;
        var H1 = 0xEFCDAB89;
        var H2 = 0x98BADCFE;
        var H3 = 0x10325476;
        var H4 = 0xC3D2E1F0;
        var i, A, B, C, D, E, temp;
        var msglen = msg.length;
        var words = [];

        for ( i = 0; i < msglen - 3; i += 4 ) {
            words.push(
                msg.charCodeAt( i ) << 24 | msg.charCodeAt( i + 1 ) << 16 |
                msg.charCodeAt( i + 2 ) << 8 | msg.charCodeAt( i + 3 )
            );
        }

        switch( msglen % 4 ) {
            case 0:
                i = 0x080000000;
                break;
            case 1:
                i = msg.charCodeAt( msglen - 1 ) << 24 | 0x0800000;
                break;

            case 2:
                i = msg.charCodeAt( msglen - 2 ) << 24
                    | msg.charCodeAt( msglen - 1 ) << 16 | 0x08000;
                break;

            case 3:
                i = msg.charCodeAt( msglen - 3 ) << 24
                    | msg.charCodeAt( msglen - 2 ) << 16
                    | msg.charCodeAt( msglen - 1 ) << 8 | 0x80;
                break;
        }

        words.push( i );

        while ( ( words.length % 16 ) != 14 ) words.push( 0 );

        words.push( msglen >>> 29 );
        words.push( ( msglen << 3 ) & 0x0ffffffff );

        for ( var blockstart = 0, len = words.length; blockstart < len; blockstart += 16 ) {

            for ( i = 0; i < 16; i++ )
                W[ i ] = words[ blockstart + i ];
            for ( i = 16; i <= 79; i++ )
                W[ i ] = this.rotateLeft( W[ i - 3 ] ^ W[ i - 8 ]
                    ^ W[ i - 14 ] ^ W[ i - 16 ], 1 );

            A = H0; B = H1; C = H2; D = H3; E = H4;

            for ( i = 0; i <= 19; i++ ) {
                temp = ( this.rotateLeft( A, 5 ) + (( B & C )
                    | ( ~B & D )) + E + W[ i ] + 0x5A827999 ) & 0x0ffffffff;
                E = D; D = C;
                C = this.rotateLeft( B, 30 );
                B = A; A = temp;
            }

            for ( i = 20; i <= 39; i++ ) {
                temp = ( this.rotateLeft( A, 5 ) + ( B ^ C ^ D )
                    + E + W[ i ] + 0x6ED9EBA1 ) & 0x0ffffffff;
                E = D; D = C;
                C = this.rotateLeft( B, 30 );
                B = A; A = temp;
            }

            for ( i = 40; i <= 59; i++ ) {
                temp = ( this.rotateLeft( A, 5 ) + (( B & C ) | ( B & D )
                    | ( C & D )) + E + W[ i ] + 0x8F1BBCDC ) & 0x0ffffffff;
                E = D; D = C;
                C = this.rotateLeft( B, 30 );
                B = A; A = temp;
            }

            for ( i = 60; i <= 79; i++ ) {
                temp = ( this.rotateLeft( A, 5 ) + ( B ^ C ^ D )
                    + E + W[ i ] + 0xCA62C1D6 ) & 0x0ffffffff;
                E = D; D = C;
                C = this.rotateLeft( B, 30 );
                B = A; A = temp;
            }

            H0 = ( H0 + A ) & 0x0ffffffff;
            H1 = ( H1 + B ) & 0x0ffffffff;
            H2 = ( H2 + C ) & 0x0ffffffff;
            H3 = ( H3 + D ) & 0x0ffffffff;
            H4 = ( H4 + E ) & 0x0ffffffff;

        }

        var str = this.convertHex( H0 ) + this.convertHex( H1 )
            + this.convertHex( H2 ) + this.convertHex( H3 ) + this.convertHex( H4 );

        return str.toLowerCase();
    },

    rotateLeft: function( n, s ) {
        return ( n << s ) | ( n >>> ( 32 - s ) );
    },

    convertHex: function( val ) {
        var str = '';
        for ( var i = 7; i >= 0; i-- ) {
            var v = ( val >>> ( i * 4 ) ) & 0x0f;
            str += v.toString( 16 );
        }
        return str;
    },

    utf8Encode: function( str ) {
        str = str.replace( /\r\n/g, '\n' );
        var utftext = '';

        for ( var n = 0, len = str.length; n < len; n++ ) {
            var c = str.charCodeAt( n );

            if ( c < 128 ) {
                utftext += String.fromCharCode( c );
            } else if ( ( c > 127 ) && ( c < 2048 ) ) {
                utftext += String.fromCharCode( ( c >> 6 ) | 192 );
                utftext += String.fromCharCode( ( c & 63 ) | 128 );
            } else {
                utftext += String.fromCharCode( ( c >> 12 ) | 224 );
                utftext += String.fromCharCode( ( ( c >> 6 ) & 63 ) | 128 );
                utftext += String.fromCharCode( ( c & 63 ) | 128 );
            }
        }

        return utftext;
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.FileFetcher = Ext.extend( Ext.util.Observable, {

    extRegexp: /\.([^\./]+)$/,
    basedirRegexp: /(^.+)\/[^\/]*$/,

    constructor: function( config ) {
        this.queue = [];
        this.active = false;

        if ( Ext.isArray( config ) )
            this.load( { files: config } );

        if ( Ext.isObject( config ) )
            this.start( config );
    },

    load: function( data ) {
        if ( Ext.isArray( data.files ) ) {
            var files = data.files;
            delete data.files;
            for ( var i = 0, len = files.length; i < len; i++ )
                this.queue.push( Ext.copyTo( { file: files[ i ] }, data, 'callback,scope,noCache' ) );
        } else
            this.queue.push( Ext.copyTo( { file: data.file }, data, 'callback,scope,noCache' ) );
    },

    getType: function( file ) {
        var r = this.extRegexp.exec( file );
//        if ( r )
            return r[ 1 ];
    },

    getBaseDir: function( file ) {
        var r = this.basedirRegexp.exec( file );
        return r[ 1 ];
    },

    start: function( config ) {
        var start = config.start ? true : false;
        delete config.start;

        Ext.apply( this, config );

        if ( this.files )
            this.load( { files: this.files } );

        if ( start || !config )
            this.checkQueue();
    },

    checkQueue: function() {
        if ( this.active )
            return;

        this.active = true;
        var item = this.queue[ 0 ];
        if ( !item.type )
            item.type = this.getType( item.file );
        item.id = app.id( item.type + '-file-' );

        item.basedir = this.getBaseDir( item.file );

        switch ( item.type ) {
            case 'js':
                var sc = document.createElement( 'scr' + 'ipt' );
                sc.setAttribute( 'type', 'text/javascript' );
                if ( item.noCache || this.noCache )
                    sc.setAttribute( 'src', Ext.urlAppend( item.file, '_dc=' + ( new Date().getTime() ) ) );
                else
                    sc.setAttribute( 'src', item.file );
                sc.setAttribute( 'id', item.id );
                Ext.EventManager.on( sc, 'load', this.requestDone, this );
                document.getElementsByTagName( 'head' )[ 0 ].appendChild( sc );
                break;

            case 'css':
                Ext.Ajax.request({
                    method: 'GET',
                    url: item.file,
                    scope: this,
                    disableCaching: ( item.noCache || this.noCache ? true : false ),
                    success: function( res ) {
                        // hack
                        var txt = res.responseText.replace( 'url(', 'url(' + item.basedir + '/', 'g' );
                        txt = txt.replace( "src='", "src='" + item.basedir + '/', 'g' );
                        Ext.util.CSS.createStyleSheet( txt, this.queue[ 0 ].id );
                        this.requestDone();
                    },
                    failure: this.requestFailed
                });
                break;

            default:
                log('unhandled type in fetcher:'+item.type);
        }

    },

    requestDone: function() {
        this.active = false;

        var item = this.queue.shift();
        if ( item.file )
            log('file loaded:'+item.file);

        if ( this.itemHandler ) {
            if ( this.scope )
                this.itemHandler.call( this.scope, item );
            else
                this.itemHandler( item );
        }

        if ( item.callback ) {
            if ( item.scope )
                item.callback.call( item.scope, this, item );
            else
                item.callback( this, item );
        }

        if ( item.type == 'js' )
            Ext.fly( item.id ).remove();

        if ( this.queue.length )
            this.checkQueue.defer( 10, this );
        else {
            log('fetcher finished');
            if ( this.scope )
                this.success.call( this.scope, this );
            else
                this.success( this );
        }
    },

    requestFailed: function() {
        this.active = false;

        // TBD better error handling
        log('fetcher failed to load file(s)');

        if ( this.failure ) {
            if ( this.scope )
                this.failure.call( this.scope, this );
            else
                this.failure( this );
        }
    },

    callback: function( callback, scope ) {
        this.queue.push( { type: 'callback', callback: callback, scope: scope } );
    }

});

/* -------------------------------------------------------------------------*/

/* Start the main desktop app */
new CometDesktop.App();

CometDesktop.localeStore = new Ext.data.SimpleStore({
    fields: [ 'locale', 'english', 'lang' ],
    data: [
        [ 'en_US', 'English', 'United States' ],
        [ 'en_UK', 'English', 'United Kingdom' ],
        [ 'es_MX', 'Spanish', 'Español' ],
        [ 'fr_FR', 'French', 'Français' ],
        [ 'de_DE', 'German', 'Deutsch' ],
        [ 'ru_RU', 'Russian', 'Русский' ],
        [ 'it_IT', 'Italian', 'Italiano' ],
        [ 'pt_BR', 'Brazilian Portuguese', 'Português Brasileiro' ],
        [ 'ko_KR', 'Korean', '한국어' ],
        [ 'ja_JP', 'Japanese', '日本語' ],
        [ 'zh_CN', 'Chinese', '中文' ]
    ]
});

CometDesktop.menu.LocaleMenu = Ext.extend( CometDesktop.menu.StoreMenu, {

    constructor: function() {
        var locale = Ext.util.Cookies.get( 'locale' );
        this.locale = ( locale ) ? locale : 'en_US';
        this.store = CometDesktop.localeStore;
        CometDesktop.menu.LocaleMenu.superclass.constructor.apply( this, arguments );
        this.local = true;
        this.loaded = true;
    },

    updateMenu: function( records ) {
        this.removeAll();
        this.el.sync();

        Ext.each( records, function( rec ) {
            this.add({
                xtype: 'menucheckitem',
                text: String.format( '{0} ({1})', rec.data.english, rec.data.lang ),
                checked: ( this.locale == rec.data.locale ),
                locale: rec.data.locale,
                group: 'lang',
                checkHandler: this.langChange,
                scope: this
            });
        }, this);
    },

    _onShow: function() {
        this.updateMenu( this.store.getRange() );
        this.un( 'show', this._onShow, this );
    },

    langChange: function( item, checked ) {
        if ( !checked )
            return;
        this.locale = item.locale;
        Ext.util.Cookies.set( 'locale', this.locale, ( new Date() ).add( Date.YEAR, 1 ), location.pathname );
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.LoginApp = Ext.extend( CometDesktop.Module, {

    appChannel: '/desktop/app/login',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        this.menu = new Ext.menu.Menu({
            items: [{
                xtype: 'menuitem',
                text: 'Language',
                iconCls: 'cd-icon-system-admin-locale',
                menu: new CometDesktop.menu.LocaleMenu()
            }]
        });
    },

    eventReceived: function( ev ) {
        if ( ev.action != 'launch' )
            return;
        Ext.Ajax.request({
            method: 'POST',
            url: 'login',
            success: function( r ) {
                var data = app.decodeResponse( r );
                if ( data.success )
                    this.publish( '/desktop/login', { res: data } );
                else
                    this.openLogin( data );
            },
            failure: function( r ) {
                this.openLogin( app.decodeResponse( r ) );
            },
            scope: this
        });
    },

    createWindow: function() {
        var win = app.getWindow( 'desktop-login-win' );
        if ( !win )
            win = this.create();
        win.show();
        return win;
    },

    checkAuth: function() {
        var win = app.getWindow( 'desktop-login-win' );
        var user = win.find( 'name', 'username' )[ 0 ].getValue();
        var pass = win.find( 'name', 'password' )[ 0 ];
        var password = pass.getValue(); pass.reset();
        if ( this.token ) {
            password = app.sha1_hex( this.token + ':' + password );
        }
        win.body.mask();
        Ext.Ajax.request({
            method: 'POST',
            url: 'login',
            params: {
                token: this.token || '',
                username: user,
                password: password
            },
            success: function( r ) {
                var data = app.decodeResponse( r );
                if ( data.success )
                    this.loginSuccess( data );
                else
                    this.loginFailure( data );
            },
            failure: function( r ) {
                this.loginFailure( app.decodeResponse( r ) );
            },
            scope: this
        });
    },

    loginSuccess: function( data ) {
        app.getWindow( 'desktop-login-win' ).close();
        this.publish( '/desktop/login', { res: data } );
    },

    openLogin: function( data ) {
        if ( data.token )
            this.token = data.token;
        if ( data.token )
            this.username = data.username;
        this.createWindow();
    },

    loginFailure: function( data ) {
        if ( data.token )
            this.token = data.token;
        var win = this.createWindow();
        win.body.unmask();
        win.getLayout().setActiveItem( 0 );
        if ( !win.el.hasActiveFx() ) {
            var x = win.el.getX();
            win.el.disableShadow();
            win.el.sequenceFx();
            win.el.shift({ x: x-10, duration: .1 });
            win.el.shift({ x: x+10, duration: .1 });
            win.el.shift({ x: x, duration: .1, callback: function() { this.enableShadow( true ); }, scope: win.el });
        }
    },

    create: function() {
        return app.createWindow({
            id: 'desktop-login-win',
            noPin: true,
            title: 'Comet Desktop - Login',
            iconCls: 'cd-icon-system-login',
            width: 250,
            height: 100,
            maximizable: false,
            minimizable: false,
            closable: false,
            layout: 'card',
            activeItem: 0,
            items: [{
                layout: 'form',
                padding: 10,
                labelAlign: 'top',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'textfield',
                    name: 'username',
                    fieldLabel: 'Username',
                    selectOnFocus: true,
                    value: this.username || '',
                    listeners: {
                        specialkey: function( field, e ) {
                            if ( e.getKey() == e.ENTER || e.getKey() == e.TAB )
                                app.getWindow( 'desktop-login-win' ).getLayout().setActiveItem( 1 );
                        }
                    }
                }],
                listeners: {
                    activate: function() {
                       this.find( 'name', 'username' )[ 0 ].el.focus();
                    }
                }
            }, {
                layout: 'form',
                padding: 10,
                labelAlign: 'top',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'textfield',
                    name: 'password',
                    fieldLabel: 'Password',
                    inputType: 'password',
                    listeners: {
                        specialkey: function( field, e ) {
                            var key = e.getKey();
                            if ( key == e.TAB )
                                e.stopEvent();
                            if ( key == e.ENTER || key == e.TAB ) {
                                if ( field.getValue().trim().length > 0 )
                                    this.checkAuth();
                            }
                        },
                        scope: this
                    }
                }],
                listeners: {
                    activate: function() {
                       this.find( 'name', 'password' )[ 0 ].el.focus();
                    }
                }
            }],
            tools: [{
                id: 'gear',
                handler: function( ev, toolEl ) {
                    this.menu.show( toolEl );
                },
                scope: this
            }],
            listeners: {
                activate: function() {
                    var el = this.find( 'name', 'username' )[ 0 ].el;
                    el.focus.defer( 200, el );
                },
                show: function() {
                    this.getLayout().setActiveItem( 0 );
                }
            }
        });
    }

});

new CometDesktop.LoginApp();

