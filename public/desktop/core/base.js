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

CometDesktop.Desktop = function( app ) {
	this.taskbar = new Ext.ux.TaskBar( app );
	var taskbar = this.taskbar;
	
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

        this.addEvents({
            'ready': true,
            'beforeunload': true
        });

        Ext.onReady( this.initApp, this );
    },

    initApp: function() {
    	this.startConfig = this.startConfig || this.getStartConfig();

        this.desktop = new CometDesktop.Desktop( this );

		this.launcher = this.desktop.taskbar.startMenu;

		this.modules = this.getModules();
        if ( this.modules )
            this.initModules( this.modules );

        this.startup();

        Ext.EventManager.on( window, 'beforeunload', this.onUnload, this );
		this.fireEvent( 'ready', this );
        this.isReady = true;
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
    }

});

/* -------------------------------------------------------------------------*/

new CometDesktop.App({

	startup: function() {
		Ext.QuickTips.init();

        Ext.fly('loading').remove();
        Ext.fly('loading-mask').fadeOut({ remove: true, duration: 2 });
	},

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

