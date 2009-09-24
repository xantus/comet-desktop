/*
 * Comet Desktop v2
 * Copyright(c) 2008-2009 David Davis
 *
 * Authors:
 *
 * David Davis      - <xantus@xantus.org>
 * http://xant.us/
 *
 * Jonathan Leppert - <Johnathan.Leppert@gmail.com>
 *
 */

/*!
 * Comet Desktop is built on:
 *
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */

Ext.namespace( 'CometDesktop' );

Ext.BLANK_IMAGE_URL = 'lib/ext-3.0.0/resources/images/default/s.gif';

CometDesktop.App = Ext.extend( Ext.util.Observable, {

    isReady: false,
    modules: [],
    minimizeAll: true,
    activeWindow: null,
    timing: [ [ 'extend', new Date() ] ],
    manifest: [
        'core/support.js',
        'js/samples.js'
    ],

    constructor: function( config ) {
        window.app = this;
        Ext.apply( this, config );

        this.time( 'startup' ); // timing stats

        this.subscribe( '*', this.logEvents, this );
        this.subscribe( '/desktop/app/register', this.eventRegisterApp, this );

        this.taskbar = new Ext.ux.TaskBar( this );
        this.viewport = new Ext.Viewport({
            layout: 'border',
            items:[
                this.toolPanel = new CometDesktop.ToolPanel({ id: 'top-toolbar', region: 'north', hidden: true }),
                this.center = new CometDesktop.Desktop(),
                this.taskPanel = new Ext.Panel({
                    region: 'south',
                    width: '100%',
                    height: 30,
                    border: false,
                    hidden: true,
                    items: this.taskbar.container
                })
            ]
        });

        this.windowManager = new Ext.WindowGroup();
        this.keyManager = new CometDesktop.KeyManager();

        // TBD set up this.gaTracker using the account number from the config

        this.addEvents(
            'ready',
            'beforeunload'
        );

        Ext.onReady( this.initApp, this );
    },

    initApp: function() {
        Ext.QuickTips.init();

        this.launcher = Ext.getCmp( 'appsMenu' );

        Ext.fly( 'loading' ).remove();
        Ext.fly( 'loading-mask' ).fadeOut( { duration: 1.5 } );

        Ext.EventManager.on( window, 'beforeunload', this.onUnload, this );
        
        this.taskbarEl = Ext.get( 'ux-taskbar' );
        
        this.subscribe( '/desktop/show', this.eventShowDesktop, this );
        this.subscribe( '/desktop/lock', this.eventLockDesktop, this );
        this.subscribe( '/desktop/logout', this.eventLogout, this );
        this.subscribe( '/desktop/login', this.eventLogin, this );

        this.fireEvent( 'ready', this );
        this.isReady = true;
        this.time( 'ready' );
    },

    logEvents: function( ev, ch ) {
        log('EVENT LOG: channel:'+ch+' event:'+Ext.encode( ev ));
    },

    eventRegisterApp: function( ev ) {
        // defer early registrations until ready
        if ( !this.isReady )
            return Ext.onReady( this.eventRegisterApp.createDelegate( this, [ ev ] ) );

        log('app registered:'+ev.channel);

        if ( ev.channel == '/desktop/system/login' ) {
            if ( this.user )
                return;

            this.publish( ev.channel, { action: 'launch' } );
            return;
        }

        // insert apps before the - and add/remove menu items
        this.launcher.insert( this.launcher.items.length - 2, ev );

        this.modules.push( ev );

        // hack
//        if ( ev.autoStart )
//            this.publish( ev.channel, { action: 'launch' } );
    },

    eventLogin: function() {
        this.toolPanel.show();
        this.taskPanel.show();
        this.viewport.doLayout();

        new CometDesktop.FileFetcher({
            files: this.manifest,
            start: true,
            success: function() {
                var i = 0;
                Ext.each( this.modules, function( m ) {
                    if ( m.autoStart ) {
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
    },

    eventLogout: function() {
        window.location = '../logout';
    },

    eventLockDesktop: function() {
        // TODO, unlock, etc
        Ext.fly( 'loading-mask' ).fadeIn({
            duration: 1.5,
            callback: function() {
                Ext.fly( 'locked-status' ).fadeIn({ duration: 1 });
            }
        });
    },

    eventShowDesktop: function() {
        this.windowManager.each(function( win ) {
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

    time: function( name ) {
        this.timing.push( [ name, new Date() ] );
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
        var win = new ( cls || Ext.Window )(
            Ext.applyIf( config || {}, {
                manager: this.windowManager,
                //constrain: true,
                constrainHeader: true,
                animCollapse: true,
                minimizable: true,
                maximizable: true
            })
        );

        if ( win.captureKeypress )
            this.keyManager.register( win );

        win.render( this.center.el );
        win.taskButton = this.taskbar.addTaskButton( win );
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
            scope: this
        });

        win.on( 'show', this.windowOnShow, win );

        return win;
    },

    windowMinimize: function( win ) {
        win.minimized = true;
        win.hide();
    },

    windowMarkActive: function( win ) {
        if ( this.activeWindow && this.activeWindow !== win )
            this.windowMarkInactive( this.activeWindow );
        this.taskbar.setActiveButton( win.taskButton );
        this.activeWindow = win;
        Ext.fly( win.taskButton.el ).addClass( 'active-win' );
        win.minimized = false;
    },

    windowMarkInactive: function( win ) {
        if ( win == this.activeWindow ) {
            this.activeWindow = null;
            Ext.fly( win.taskButton.el ).removeClass( 'active-win' );
        }
    },

    windowRemove: function( win ) {
        this.taskbar.removeTaskButton( win.taskButton );
    },

    windowOnShow: function() {
        // get all of the window positions in a simple x:y array
        var loc = [];
        this.manager.each(function( w ) {
            // TBD maximized?
            if ( !w || !w.isVisible() || this === w )
                return;
            loc.push( w.getPosition().join(':') );
        }, this);

        // compare the windows x:y until we find a window it won't directly overlap
        var d = this.getBox();
        var repos = false;
        while ( loc.indexOf( d.x + ':' + d.y ) != -1 ) {
            // window directly overlaps another, offset it by 24,24
            d.x += 24; d.y += 24;
            repos = true;
        }
        // shift the window and save the position when it is done
        if ( repos ) {
            // don't fire deactivate
            this.el.disableShadow();
            this.el.shift({
                x: d.x,
                y: d.y,
                duration: .25,
                callback: function() {
                    this.setPagePosition( d.x, d.y );
                    // don't fire activate again
                    if ( !this.maximized )
                        this.el.enableShadow( true );
                },
                scope: this
            });
        }

        // fix an IE6 display bug
        if ( Ext.isIE6 )
            this.setWidth( d.width );

        // remove the listener because we only want this effect on first show
        this.un( 'show', app.windowOnShow, this );

        this.header.on( 'click', this.taskButton.contextMenu, this.taskButton );
        this.header.on( 'contextmenu', this.taskButton.contextMenu, this.taskButton );

        // TBD: option to enable/disable this
        // remove this behavior, and enable double click to expand/collapse
        this.header.un( 'dblclick', this.toggleMaximize, this );
        this.header.on( 'dblclick', function() {
            if ( this.collapsed )
                this.expand();
            else
                this.collapse();
        }, this );
    },

    /* TBD nuke these? */
    getManager: function() {
        return this.windowManager;
    },

    getWindow: function( id ) {
        return this.windowManager.get( id );
    },

    getWinWidth: function() {
        var width = this.center.el.getWidth();
        return width < 200 ? 200 : width;
    },

    getWinHeight: function() {
        var height = this.center.el.getHeight();
        return height < 100 ? 100 : height;
    },

    getWinX: function( width ) {
        return ( this.center.el.getWidth() - width ) / 2;
    },

    getWinY: function( height ) {
        return ( this.center.el.getHeight() - height ) / 2;
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.ToolPanel = Ext.extend( Ext.Toolbar, {

    constructor: function( config ) {
        //this.id = Ext.id( undefined, 'toolbar-' );
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
                var status = item.iconCls.match( /status-(.*)/ )[ 1 ];
                this.publish( '/desktop/user/status', { action: 'status', status: status } );
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
                    checked: true,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Away',
                    iconCls: 'cd-icon-user-status-away',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Busy',
                    iconCls: 'cd-icon-user-status-busy',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Invisible',
                    iconCls: 'cd-icon-user-status-invisible',
                    checked: false,
                    group: 'status',
                    checkHandler: checkHandler
                }, {
                    text: 'Offline',
                    iconCls: 'cd-icon-user-status-offline',
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

        CometDesktop.ToolPanel.superclass.constructor.call( this, Ext.applyIf( config, {
            region: 'north',
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
                    menu: new Ext.ux.menu.StoreMenu({ data: [
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
                }, '-', '->', '-', dateControl, '-', {
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

/* -------------------------------------------------------------------------*/

CometDesktop.Desktop = Ext.extend( Ext.BoxComponent, {

    constructor: function( config ) {
        CometDesktop.Desktop.superclass.constructor.call( this, Ext.applyIf( config || {}, {
            region: 'center',
            height: '100%',
            width: '100%'
        }) );
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

/* -------------------------------------------------------------------------*/

Ext.namespace( 'Ext.ux.menu' );

Ext.ux.menu.StoreMenu = Ext.extend( Ext.menu.Menu, {

    loadMsg: Ext.LoadMask.prototype.msg || 'Loading&hellip;',

    constructor: function() {
        Ext.ux.menu.StoreMenu.superclass.constructor.apply( this, arguments );

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

        if ( !this.appId )
            this.appId = Ext.id( undefined, 'app-' );
        if ( !this.appChannel )
            this.appChannel = '/desktop/app/' + this.appId;

        this.init();
    },

    init: Ext.emptyFn

});

/* -------------------------------------------------------------------------*/

CometDesktop.KeyManager = Ext.extend( Ext.util.Observable, {

    constructor: function() {
        this.wins = [];
        this.active = false;

        if ( Ext.isIE )
            document.onkeydown = this.keyEvent.createDelegate( this );
        else
            document.onkeypress = this.keyEvent.createDelegate( this );
/*
        if ( Ext.isIE )
            Ext.EventManager.on( document, 'keydown', this.keyEvent, this );
        else
            Ext.EventManager.on( document, 'keypress', this.keyEvent, this );
*/
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
        if ( Ext.indexOf( win ) == -1 )
            return;

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
*  Cleaned up by David Davis
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

    extRegexp: /\.(\S+)$/,

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
                this.queue.push( { file: files[ i ], type: this.getType( files[ i ] ), callback: data.callback, scope: data.scope } );
        } else
            this.queue.push( { file: data.file, type: this.getType( data.file ), callback: data.callback, scope: data.scope } );
    },

    getType: function( file ) {
        return this.extRegexp( file )[ 1 ];
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
        item.id = Ext.id( undefined, item.type + '-file-' );

        switch ( item.type ) {
            case 'js':
                var sc = document.createElement( 'scr' + 'ipt' );
                sc.setAttribute( 'type', 'text/javascript' );
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
                    success: function( res ) {
                        Ext.util.CSS.createStyleSheet( res.responseText, this.queue[ 0 ].id );
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
        
        if ( item.callback ) {
            if ( item.scope )
                item.callback.call( item.scope, this );
            else
                item.callback( this );
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

Ext.override( Ext.menu.BaseItem, {

    constructor: function( config ) {
        Ext.menu.BaseItem.superclass.constructor.call( this, config );

        if ( this.channel && !this.handler ) {
            log('registered menu channel '+this.channel);
            this.on( 'click', function() { this.publish( this.channel, { action: 'launch' } ); }, this );
        }

        if ( this.handler )
            this.on( 'click', this.handler, this.scope || this );
    }

});

/* -------------------------------------------------------------------------*/

/* Start the main desktop app */
new CometDesktop.App();

/* -------------------------------------------------------------------------*/

CometDesktop.LoginApp = Ext.extend( CometDesktop.Module, {

    appChannel: '/desktop/system/login',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        this.publish( '/desktop/app/register', {
            id: this.appId,
            channel: this.appChannel,
            text: 'Comet Desktop - Login',
            iconCls: 'cd-icon-system-login'
        });
    },

    eventReceived: function() {
        this.createWindow();
    },

    createWindow: function() {
        var win = app.getWindow( 'desktop-login-win' );
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return app.createWindow({
            id: 'desktop-login-win',
            title: 'Comet Desktop - Login',
            iconCls: 'cd-icon-system-login',
            width: 250,
            height: 150,
            layout: 'fit',
            maximizable: false,
            minimizable: false,
            closable: false,
            preventBodyReset: true,
            items: [
                {
                    html: ['<div style="padding:10px 10px 10px 10px;"><h2>Login</h2></div>'].join('')
                }
            ],
            buttonAlign: 'center',
            buttons: [{
                text: 'Ok',
                handler: function() {
                    var win = app.getWindow( 'desktop-login-win' );
                    win.close();
                    //win.setActive( false );
                    //win.el.fadeOut({ duration: 1.5, callback: win.close, scope: win });

                    this.publish( '/desktop/login', { action: 'login' } );
                },
                scope: this
            }]
        });
    }

});

new CometDesktop.LoginApp();
