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

CometDesktop.Desktop = function( app ) {
	var taskbar = this.taskbar = new Ext.ux.TaskBar( app );

	var desktopEl = Ext.get( 'x-desktop' );
    var taskbarEl = Ext.get( 'ux-taskbar' );
    var shortcuts = Ext.get( 'x-shortcuts' );

    var windows = new Ext.WindowGroup();
    var activeWindow;

    function minimizeWin( win ) {
        win.minimized = true;
        win.hide();
    }

    function markActive( win ) {
        if ( activeWindow && activeWindow != win )
            markInactive(activeWindow);
        taskbar.setActiveButton(win.taskButton);
        activeWindow = win;
        Ext.fly( win.taskButton.el ).addClass( 'active-win' );
        win.minimized = false;
    }

    function markInactive( win ) {
        if ( win == activeWindow ) {
            activeWindow = null;
            Ext.fly( win.taskButton.el ).removeClass( 'active-win' );
        }
    }

    function removeWin( win ) {
    	taskbar.removeTaskButton( win.taskButton );
        layout();
    }

    function layout() {
        desktopEl.setHeight( Ext.lib.Dom.getViewHeight() - taskbarEl.getHeight() );
    }

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
                callback: function() {
                    this.setPosition( d.x, d.y );
                },
                scope: this
            });
        }

        // fix an IE6 display bug
        if ( Ext.isIE6 )
            this.setWidth( d.width );

        // remove the listener because we only want this effect on first show
        this.un( 'show', showWin, this );
    }

    Ext.EventManager.onWindowResize( layout );

    this.layout = layout;

    this.createWindow = function( config, cls ) {
    	var win = new ( cls || Ext.Window )(
            Ext.applyIf( config || {}, {
                manager: windows,
                minimizable: true,
                maximizable: true
            })
        );
        win.render( desktopEl );
        win.taskButton = taskbar.addTaskButton( win );

        win.cmenu = new Ext.menu.Menu({
            items: [

            ]
        });

        win.animateTarget = win.taskButton.el;

        win.on({
        	'activate': {
        		fn: markActive
        	},
        	'beforeshow': {
        		fn: markActive
        	},
        	'deactivate': {
        		fn: markInactive
        	},
        	'minimize': {
        		fn: minimizeWin
        	},
        	'close': {
        		fn: removeWin
        	},
            'show': {
                fn: showWin
            },
            scope: win
        });

        layout();
        return win;
    };

    this.getManager = function() {
        return windows;
    };

    this.getWindow = function( id ) {
        return windows.get( id );
    };

    this.getWinWidth = function() {
		var width = Ext.lib.Dom.getViewWidth();
		return width < 200 ? 200 : width;
	};

	this.getWinHeight = function() {
		var height = ( Ext.lib.Dom.getViewHeight() - taskbarEl.getHeight() );
		return height < 100 ? 100 : height;
	};

	this.getWinX = function( width ) {
		return ( Ext.lib.Dom.getViewWidth() - width ) / 2
	};

	this.getWinY = function( height ) {
		return ( Ext.lib.Dom.getViewHeight() - taskbarEl.getHeight() - height ) / 2;
	};

    layout();

    if ( shortcuts ) {
        shortcuts.on('click', function( e, t ) {
            if ( t = e.getTarget( 'dt', shortcuts ) ) {
                e.stopEvent();
                var module = app.getModule( t.id.replace( '-shortcut', '' ) );
                if ( module )
                    module.createWindow();
            }
        });
    }
};

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

		this.launcher = this.desktop.taskbar.startMenu;

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

    getStartConfig: function () {

    },

    startup: Ext.emptyFn,

    initModules: function( ms ) {
		for ( var i = 0, len = ms.length; i < len; i++ ) {
            var m = ms[ i ];
            this.launcher.add( m.launcher );
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

