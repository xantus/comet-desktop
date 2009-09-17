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
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */

Ext.namespace('CometDesktop');

Ext.BLANK_IMAGE_URL = 'lib/ext-3.0.0/resources/images/default/s.gif';

window.app = {
    register: Ext.emptyFn
};


CometDesktop.Desktop = Ext.extend( Ext.util.Observable, {

    constructor: function( app ) {
        this.taskbar = new Ext.ux.TaskBar( app );
        var center;
        this.toolPanel = new CometDesktop.ToolPanel({ region: 'north' }),
        this.viewport = new Ext.Viewport({
            layout: 'border',
            items:[
                this.toolPanel,
                this.center = new Ext.BoxComponent({
                    region: 'center',
                    height: '100%',
                    width: '100%'
                }), /*
                {
                    region: 'east',
                    width: 200,
                    title: 'East',
                    collapsible: true,
                    items: [
                        {
                            html: 'test'
                        }
                    ]
                }, */ 
                {
                    region: 'south',
                    width: '100%',
                    height: 30,
                    border: false,
                    items: this.taskbar.container
                }
            ]
        });

        this.taskbarEl = Ext.get( 'ux-taskbar' );
        this.shortcuts = Ext.get( 'x-shortcuts' );

        this.windowManager = new Ext.WindowGroup();
        this.activeWindow = null;

        this.keyManager = new CometDesktop.KeyManager();

        if ( this.shortcuts ) {
            this.shortcuts.on( 'click', function( e, t ) {
                if ( t = e.getTarget( 'dt', this.shortcuts ) ) {
                    e.stopEvent();
                    var module = this.getModule( t.id.replace( '-shortcut', '' ) );
                    // TBD: impl module.launch() instead of this
                    if ( module ) {
                        if ( module.launcher.scope )
                            module.launcher.handler.call( module.launcher.scope );
                        else
                            module.launcher.handler();
                    }
                }
            }, this);
        }
    },

    minimizeWin: function( win ) {
        win.minimized = true;
        win.hide();
    },

    markActive: function( win ) {
        if ( this.activeWindow && this.activeWindow !== win )
            this.markInactive( this.activeWindow );
        this.taskbar.setActiveButton( win.taskButton );
        this.activeWindow = win;
        Ext.fly( win.taskButton.el ).addClass( 'active-win' );
        win.minimized = false;
    },

    markInactive: function( win ) {
        if ( win == this.activeWindow ) {
            this.activeWindow = null;
            Ext.fly( win.taskButton.el ).removeClass( 'active-win' );
        }
    },

    removeWin: function( win ) {
    	this.taskbar.removeTaskButton( win.taskButton );
    },

    createWindow: function( config, cls ) {
    	var win = new ( cls || Ext.Window )(
            Ext.applyIf( config || {}, {
                manager: this.windowManager,
                constrain: true,
                constrainHeader: true,
                minimizable: true,
                maximizable: true
            })
        );

        if ( win.captureKeypress )
            this.keyManager.register( win );

        win.render( this.center.el );
        win.taskButton = this.taskbar.addTaskButton( win );

        win.cmenu = new Ext.menu.Menu({
            items: [

            ]
        });

        win.animateTarget = win.taskButton.el;

        win.on({
        	'activate': {
        		fn: this.markActive
        	},
        	'beforeshow': {
        		fn: this.markActive
        	},
        	'deactivate': {
        		fn: this.markInactive
        	},
        	'minimize': {
        		fn: this.minimizeWin
        	},
        	'close': {
        		fn: this.removeWin
        	},
            scope: this
        });

        // TBD move this to a Window class
        function showWin() {
            // get all of the window positions in a simple x:y array
            var loc = [];
            this.manager.each(function( w ) {
                // TBD maximized?
                if ( !w || !w.isVisible() || this === w )
                    return;
                var box = w.getBox();
                loc.push( box.x + ':' + box.y );
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
                this.el.shift({
                    x: d.x,
                    y: d.y,
                    duration: .25,
                    callback: this.setPosition.createDelegate( this, [ d.x, d.y ] )
                });
            }

            // fix an IE6 display bug
            if ( Ext.isIE6 )
                this.setWidth( d.width );

            // remove the listener because we only want this effect on first show
            this.un( 'show', showWin, this );
        }

        win.on( 'show', showWin, win );
        
        return win;
    },

    getManager: function() {
        return this.windowManager;
    },

    getWindow: function( id ) {
        return this.windowManager.get( id );
    },

    getWinWidth: function() {
		var width = Ext.lib.Dom.getViewWidth();
		return width < 200 ? 200 : width;
	},

	getWinHeight: function() {
		var height = ( Ext.lib.Dom.getViewHeight() - this.taskbarEl.getHeight() );
		return height < 100 ? 100 : height;
	},

	getWinX: function( width ) {
		return ( Ext.lib.Dom.getViewWidth() - width ) / 2
	},

	getWinY: function( height ) {
		return ( Ext.lib.Dom.getViewHeight() - this.taskbarEl.getHeight() - height ) / 2;
	}

});

/* -------------------------------------------------------------------------*/

CometDesktop.ToolPanel = Ext.extend( Ext.Toolbar, {

    constructor: function( config ) {
        var appsMenu = new Ext.menu.Menu({
            id: 'appsMenu',
            style: {
                overflow: 'visible'
            },
            items: [
                '-', {
                    text: 'Add/Remove&hellip;',
                    iconCls: 'cd-icon-apps-system-addremove',
                    handler: Ext.emptyFn
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
                    handler: Ext.emptyFn
                }, {
                    text: 'Desktop',
                    iconCls: 'cd-icon-place-desktop',
                    handler: Ext.emptyFn
                }, '-', {
                    text: 'Computer',
                    iconCls: 'cd-icon-place-computer',
                    handler: Ext.emptyFn
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
                                handler: Ext.emptyFn
                            }, {
                                text: 'Appearance',
                                iconCls: 'cd-icon-system-prefs-appearance',
                                handler: Ext.emptyFn
                            }, {
                                text: 'Main Menu',
                                iconCls: 'cd-icon-system-prefs-mainmenu',
                                handler: Ext.emptyFn
                            }, {
                                text: 'Sound',
                                iconCls: 'cd-icon-system-prefs-sound',
                                handler: Ext.emptyFn
                            }, {
                                text: 'Windows',
                                iconCls: 'cd-icon-system-prefs-windows',
                                handler: Ext.emptyFn
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
                                handler: Ext.emptyFn
                            }, {
                                text: 'Login Window',
                                iconCls: 'cd-icon-system-admin-login',
                                handler: Ext.emptyFn
                            }, {
                                text: 'System Monitor',
                                iconCls: 'cd-icon-system-admin-system',
                                handler: Ext.emptyFn
                            }, {
                                text: 'Time and Date',
                                iconCls: 'cd-icon-system-admin-datetime',
                                handler: Ext.emptyFn
                            }, {
                                text: 'Users and Groups',
                                iconCls: 'cd-icon-system-admin-users',
                                handler: Ext.emptyFn
                            }
                        ]
                    }
                }, '-', {
                    text: 'Help and Support',
                    iconCls: 'cd-icon-system-help',
                    handler: Ext.emptyFn
                }, {
                    text: 'About Comet Desktop',
                    iconCls: 'cd-icon-system-about',
                    handler: Ext.emptyFn
                }
            ]
        });

        var checkHandler = function( item, checked ) {
            if ( checked )
                Ext.getCmp( 'system-user-menu' ).setIconClass( item.iconCls );
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
                    handler: Ext.emptyFn
                }, '-', {
                    text: 'Log Out...',
                    iconCls: 'cd-icon-user-logout',
                    handler: function() { window.location = '../logout'; }
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
        
        var dr = Ext.util.Format.dateRenderer('D M j, H:i');
        var setDate = function() {
            var dt = new Date;
            dateControl.setText( dr( dt ) );
            // defer until after the nearest minute
            setDate.defer( ( 61 - dt.format('s') ) * 1000 );
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
                    //menu: new Ext.ux.menu.StoreMenu()
                }, ' ', ' ',
                {
                    text: 'Places',
                    menu: placesMenu
                }, ' ', ' ', {
                    text: 'System',
                    menu: systemMenu
                }, '-', '->', dateControl, '-', {
                    id: 'system-user-menu',
                    text: 'Guest User',
                    iconCls: 'cd-icon-user-status-available',
                    menu: userMenu
                }
            ]
        }) );
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.App = Ext.extend( Ext.util.Observable, {

    isReady: false,
    startMenu: null,
    modules: null,

    constructor: function( config ) {
        Ext.apply( this, config );

        window.app = this;

        // TBD set up this.gaTracker using the account number from the config

        this.addEvents({
            'ready': true,
            'beforeunload': true
        });

        this.timing = [ 'start', new Date() ];
        Ext.onReady( this.initApp, this );
    },

    initApp: function() {
        this.time( 'start' );
		Ext.QuickTips.init();

        this.startConfig = this.startConfig || this.getStartConfig();

        this.desktop = new CometDesktop.Desktop( this );

        this.launcher = Ext.getCmp( 'appsMenu' );

		this.modules = this.getModules();
        if ( this.modules.length )
            this.initModules( this.modules );

        Ext.fly('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove: true, duration: 2 });

        this.startup();

        Ext.EventManager.on( window, 'beforeunload', this.onUnload, this );
		this.fireEvent( 'ready', this );
        this.isReady = true;
    },

    time: function( name ) {
        this.timing.push( [ name, new Date() ] );
    },

    getModules: function() {
        return []; // overridden later
    },

    getStartConfig: Ext.emptyFn,

    startup: Ext.emptyFn,

    initModules: function( ms ) {
		for ( var i = 0, len = ms.length; i < len; i++ ) {
            var m = ms[ i ];
            // insert apps before the - and add/remove menu items
            this.launcher.insert( this.launcher.items.length - 2, m.launcher );
            m.app = this;
            if ( m.launcher.autoStart )
                if ( m.launcher.scope )
                    m.launcher.handler.call( m.launcher.scope );
                else
                    m.launcher.handler();
        }
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
    }

});

/* -------------------------------------------------------------------------*/

Ext.namespace( 'Ext.ux.menu' );

Ext.ux.menu.StoreMenu = Ext.extend( Ext.menu.Menu, {

    loadMsg: Ext.LoadMask.prototype.msg || 'Loading...',

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
                records[ i ].json.menu = eval( records[ i ].json.menu );

            this.add( records[ i ].json );
        }
    }

});

/* -------------------------------------------------------------------------*/

new CometDesktop.App({

	getModules: function() {
		return [
            new CometDesktop.SampleApp(),
            new CometDesktop.SampleApp2()
		];
	},

    getStartConfig: function() {
        return {
            title: 'Guest',
            iconCls: 'user',
            toolItems: [{
                text: 'Settings',
                iconCls: 'settings',
                scope: this
            },'-', {
                text: 'Logout',
                iconCls: 'logout',
                handler: function() { window.location = '../logout'; },
                scope: this
            }]
        };
    }

});

/* -------------------------------------------------------------------------*/

CometDesktop.Module = Ext.extend( Ext.util.Observable, {

    constructor: function( config ) {
        Ext.apply(this, config);
        this.init();
    },

    init: Ext.emptyFn

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
        str = str.replace( /\r\n/g, "\n" );
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
    },
});

/* -------------------------------------------------------------------------*/


CometDesktop.SampleApp = Ext.extend(CometDesktop.Module, {

    id: 'sampleapp',

    init: function() {
        this.launcher = {
            text: 'Sample App',
            iconCls: 'icon-grid',
            // hack: this is not how I want to auto start apps
            autoStart: true,
            handler: this.createWindow,
            scope: this
        };
    },

    createWindow: function() {
        var win = this.app.desktop.getWindow('sampleapp-win');
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return this.app.desktop.createWindow({
            id: 'sampleapp-win',
            title: 'Sample App',
            width: 300,
            height: 250,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            constrainHeader: true,
            layout: 'fit',
            items: [
                {
                    html: 'Sample App'
                }
            ]
        });
    }

});

CometDesktop.SampleApp2 = Ext.extend(CometDesktop.Module, {

    id: 'sampleapp2',

    init: function() {
        this.launcher = {
            text: 'Sample App 2',
            iconCls: 'icon-grid',
            // hack: this is not how I want to auto start apps
            autoStart: true,
            handler: this.createWindow,
            scope: this
        };
    },

    createWindow: function() {
        this.create().show();
    },

    create: function() {
        return this.app.desktop.createWindow({
            // don't include a window id if you plan on allowing multiple instances
            title: 'Sample App 2',
            width: 300,
            height: 250,
            iconCls: 'icon-grid',
            shim: false,
            animCollapse: false,
            constrainHeader: true,
            layout: 'fit',
            items: [
                {
                    html: 'Sample App 2<br><br>multiple instances allowed'
                }
            ]
        });
    }

});

