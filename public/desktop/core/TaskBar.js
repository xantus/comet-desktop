
Ext.ux.TaskBar = Ext.extend( Ext.util.Observable, {

    constructor: function( app ) {
        var width = 30;

        this.showDesktop = new Ext.Button({
            text: '',
            id: 'ux-startbutton',
            iconCls: 'cd-icon-show-desktop',
            renderTo: 'ux-show-desktop-button',
            //clickEvent: 'mousedown',
            handler: function() {
                this.publish( '/desktop/show' );
            },
            scope: this,
            template: new Ext.Template(
                '<table cellspacing="0" class="x-btn {3}"><tbody><tr>',
                '<td><button class="x-btn-text {2}" type="{1}" style="height:30px;width:'+width+'px;">{0}</button>',
                '</td></tr></tbody></table>'
            )
        });

        var sbBox = new Ext.BoxComponent({
            el: 'ux-taskbar-start',
            id: 'TaskBarStart',
            minWidth: width,
            region: 'west',
            split: true,
            width: width
        });

        this.tbPanel = new Ext.ux.TaskButtonsPanel({
            el: 'ux-taskbuttons-panel',
            id: 'TaskBarButtons',
            region: 'center'
        });

        this.container = new Ext.ux.TaskBarContainer({
            el: 'ux-taskbar',
            layout: 'border',
            items: [ sbBox, this.tbPanel ]
        });

        return this;
    },

    addTaskButton: function( win ) {
        return this.tbPanel.addButton( win, 'ux-taskbuttons-panel' );
    },

    removeTaskButton: function( btn ) {
        this.tbPanel.removeButton( btn );
    },

    setActiveButton: function( btn ) {
        this.tbPanel.setActiveButton( btn );
    }

});


Ext.ux.TaskBarContainer = Ext.extend( Ext.Container, {

    initComponent: function() {
        Ext.ux.TaskBarContainer.superclass.initComponent.call( this );

        this.el = Ext.get( this.el ) || Ext.getBody();

        this.el.setHeight = Ext.emptyFn;
        this.el.setWidth = Ext.emptyFn;
        this.el.setSize = Ext.emptyFn;
        this.el.setStyle({
            overflow: 'hidden',
            margin: '0',
            border: '0 none'
        });
        this.el.dom.scroll = 'no';
        this.allowDomMove = false;
        this.autoWidth = true;
        this.autoHeight = true;
        Ext.EventManager.onWindowResize( this.fireResize, this );
        this.renderTo = this.el;
    },

    fireResize: function( w, h ) {
        this.fireEvent( 'resize', this, w, h, w, h );
    }

});


Ext.ux.TaskButtonsPanel = Ext.extend( Ext.BoxComponent, {

    activeButton: null,
    enableScroll: true,
    scrollIncrement: 0,
    scrollRepeatInterval: 400,
    scrollDuration: .35,
    animScroll: true,
    resizeButtons: true,
    buttonWidth: 168,
    minButtonWidth: 118,
    buttonMargin: 2,
    buttonWidthSet: false,

    initComponent: function() {
        Ext.ux.TaskButtonsPanel.superclass.initComponent.call( this );

        this.on('resize', this.delegateUpdates );
        this.items = [];

        var el = Ext.fly( this.el );
        this.stripWrap = el.createChild({
            cls: 'ux-taskbuttons-strip-wrap',
            cn: {
                tag: 'ul',
                cls: 'ux-taskbuttons-strip'
            }
        });
        this.stripSpacer = el.createChild({
            cls: 'ux-taskbuttons-strip-spacer'
        });
        this.strip = new Ext.Element( this.stripWrap.dom.firstChild );

        this.edge = this.strip.createChild({
            tag: 'li',
            cls: 'ux-taskbuttons-edge'
        });
        this.strip.createChild({
            cls: 'x-clear'
        });
    },

    addButton: function( win ) {
        var li = this.strip.createChild( { tag:'li' }, this.edge ); // insert before the edge
        var btn = new Ext.ux.TaskBar.TaskButton( win, li );

        this.items.push( btn );

        if ( !this.buttonWidthSet )
            this.lastButtonWidth = btn.container.getWidth();

        this.setActiveButton( btn );
        return btn;
    },

    removeButton: function( btn ) {
        var li = document.getElementById( btn.container.id );
        btn.destroy();
        li.parentNode.removeChild( li );

        var s = [];
        for ( var i = 0, len = this.items.length; i < len; i++ )
            if ( this.items[ i ] != btn )
                s.push( this.items[ i ] );

        this.items = s;

        this.delegateUpdates();
    },

    setActiveButton: function( btn ) {
        this.activeButton = btn;
        this.delegateUpdates();
    },

    delegateUpdates: function() {
        /*
        if ( this.suspendUpdates )
            return;
        }*/

        if ( this.resizeButtons && this.rendered )
            this.autoSize();

        if ( this.enableScroll && this.rendered )
            this.autoScroll();
    },

    autoSize: function(){
        var count = this.items.length;
        var ow = this.el.dom.offsetWidth;
        var aw = this.el.dom.clientWidth;

        // !aw for display:none
        if ( !this.resizeButtons || count < 1 || !aw )
            return;

        var each = Math.max( Math.min( Math.floor( ( aw - 4 ) / count ) - this.buttonMargin,
            this.buttonWidth ), this.minButtonWidth ); // -4 for float errors in IE
        var btns = this.stripWrap.dom.getElementsByTagName('button');

        this.lastButtonWidth = Ext.get(btns[0].id).findParent('li').offsetWidth;

        for(var i = 0, len = btns.length; i < len; i++) {
            var btn = btns[i];

            var tw = Ext.get(btns[i].id).findParent('li').offsetWidth;
            var iw = btn.offsetWidth;

            btn.style.width = (each - (tw-iw)) + 'px';
        }
    },

    autoScroll: function() {
        var count = this.items.length;
        var ow = this.el.dom.offsetWidth;
        var tw = this.el.dom.clientWidth;

        var wrap = this.stripWrap;
        var cw = wrap.dom.offsetWidth;
        var pos = this.getScrollPos();
        var l = this.edge.getOffsetsTo( this.stripWrap )[ 0 ] + pos;

        // 20 to prevent display:none issues
        if ( !this.enableScroll || count < 1 || cw < 20 )
            return;

        wrap.setWidth( tw ); // moved to here because of problem in Safari

        if ( l <= tw ) {
            wrap.dom.scrollLeft = 0;
            //wrap.setWidth(tw); moved from here because of problem in Safari
            if ( this.scrolling ) {
                this.scrolling = false;
                this.el.removeClass( 'x-taskbuttons-scrolling' );
                this.scrollLeft.hide();
                this.scrollRight.hide();
            }
        } else {
            if ( !this.scrolling )
                this.el.addClass( 'x-taskbuttons-scrolling' );

            tw -= wrap.getMargins( 'lr' );
            wrap.setWidth( tw > 20 ? tw : 20 );

            if ( !this.scrolling ) {
                if ( !this.scrollLeft ) {
                    this.createScrollers();
                } else {
                    this.scrollLeft.show();
                    this.scrollRight.show();
                }
            }
            this.scrolling = true;
            // ensure it stays within bounds
            // otherwise, make sure the active button is still visible
            if ( pos > ( l - tw ) )
                wrap.dom.scrollLeft = l-tw;
            else
                this.scrollToButton( this.activeButton, true );
            this.updateScrollButtons();
        }
    },

    createScrollers: function(){
        var h = this.el.dom.offsetHeight; //var h = this.stripWrap.dom.offsetHeight;

        // left
        var sl = this.el.insertFirst({
            cls: 'ux-taskbuttons-scroller-left'
        });
        sl.setHeight( h );
        sl.addClassOnOver( 'ux-taskbuttons-scroller-left-over' );
        this.leftRepeater = new Ext.util.ClickRepeater( sl, {
            interval: this.scrollRepeatInterval,
            handler: this.onScrollLeft,
            scope: this
        });
        this.scrollLeft = sl;

        // right
        var sr = this.el.insertFirst({
            cls: 'ux-taskbuttons-scroller-right'
        });
        sr.setHeight( h );
        sr.addClassOnOver( 'ux-taskbuttons-scroller-right-over' );
        this.rightRepeater = new Ext.util.ClickRepeater( sr, {
            interval: this.scrollRepeatInterval,
            handler: this.onScrollRight,
            scope: this
        });
        this.scrollRight = sr;
    },

    getScrollWidth: function() {
        return this.edge.getOffsetsTo( this.stripWrap )[ 0 ] + this.getScrollPos();
    },

    getScrollPos: function() {
        return parseInt( this.stripWrap.dom.scrollLeft, 10 ) || 0;
    },

    getScrollArea: function() {
        return parseInt( this.stripWrap.dom.clientWidth, 10 ) || 0;
    },

    getScrollAnim: function() {
        return {
            duration: this.scrollDuration,
            callback: this.updateScrollButtons,
            scope: this
        };
    },

    getScrollIncrement: function() {
        return ( this.scrollIncrement || this.lastButtonWidth + 2 );
    },

    scrollToButton: function( item, animate ) {
        el = item.el.dom.parentNode; // li
        if ( !el )
            return;
        var pos = this.getScrollPos(), area = this.getScrollArea();
        var left = Ext.fly( el ).getOffsetsTo( this.stripWrap )[ 0 ] + pos;
        var right = left + el.offsetWidth;
        if ( left < pos )
            this.scrollTo( left, animate );
        else if ( right > ( pos + area ) )
            this.scrollTo( right - area, animate );
    },

    scrollTo: function( pos, animate ) {
        this.stripWrap.scrollTo( 'left', pos, animate ? this.getScrollAnim() : false );
        if ( !animate )
            this.updateScrollButtons();
    },

    onScrollRight: function() {
        var sw = this.getScrollWidth() - this.getScrollArea();
        var pos = this.getScrollPos();
        var s = Math.min( sw, pos + this.getScrollIncrement() );
        if ( s != pos )
            this.scrollTo( s, this.animScroll );
    },

    onScrollLeft: function() {
        var pos = this.getScrollPos();
        var s = Math.max( 0, pos - this.getScrollIncrement() );
        if ( s != pos )
            this.scrollTo( s, this.animScroll );
    },

    updateScrollButtons: function() {
        var pos = this.getScrollPos();
        this.scrollLeft[ pos == 0 ? 'addClass' : 'removeClass' ]( 'ux-taskbuttons-scroller-left-disabled' );
        this.scrollRight[ pos >= (this.getScrollWidth() - this.getScrollArea() ) ? 'addClass' : 'removeClass' ]( 'ux-taskbuttons-scroller-right-disabled' );
    }

});


Ext.ux.TaskBar.TaskButton = Ext.extend( Ext.Button, {

    constructor: function( win, el ) {
        this.win = win;
        Ext.ux.TaskBar.TaskButton.superclass.constructor.call(this, {
            iconCls: win.iconCls,
            text: Ext.util.Format.ellipsis( win.title, 20 ),
            renderTo: el,
            handler: function() {
                if ( win.minimized || win.hidden )
                    win.show();
                else if ( win == win.manager.getActive() )
                    win.minimize();
                else
                    win.toFront();
            },
            clickEvent: 'mousedown',
            template: new Ext.Template(
                '<table cellspacing="0" class="x-btn {3}"><tbody><tr>',
                '<td class="ux-taskbutton-left"><i>&#160;</i></td>',
                '<td class="ux-taskbutton-center"><em class="{5} unselectable="on">',
                    '<button class="x-btn-text {2}" type="{1}" style="height:28px;">{0}</button>',
                '</em></td>',
                '<td class="ux-taskbutton-right"><i>&#160;</i></td>',
                "</tr></tbody></table>"
            )
        });
    },

    onRender: function() {
        Ext.ux.TaskBar.TaskButton.superclass.onRender.apply( this, arguments );

        this.cmenu = new Ext.menu.Menu({
            items: [{
                text: 'Restore',
                handler: function(){
                    if ( !this.isVisible() )
                        this.show();
                    else
                        this.restore();
                },
                scope: this.win
            },{
                text: 'Minimize',
                handler: this.win.minimize,
                scope: this.win
            },{
                text: 'Maximize',
                handler: function() {
                    if ( !this.isVisible() )
                        this.show();
                    else
                        this.restore();
                    this.maximize()
                },
                scope: this.win
            }, '-', {
                text: 'Close',
                iconCls: 'cd-icon-window-close',
                handler: this.closeWin.createDelegate(this, this.win, true),
                scope: this.win
            }]
        });

        // bug: This NEVER fires!
        this.cmenu.on('beforeshow', function(){
            log('before show');
        }, this);

        this.el.on( 'contextmenu', this.contextMenu, this );
    },

    contextMenu: function( e, el ) {
        e.stopEvent();
        if ( !this.cmenu.el )
            this.cmenu.render();

        var items = this.cmenu.items.items;
        var w = this.win;
        // restore
        items[0].setDisabled( w.maximized !== true && w.hidden !== true );

        // minimize
        items[1].setDisabled(w.minimized === true);
        if ( Ext.isBoolean( w.minimizable ) && w.minimizable === false )
            items[1].setDisabled( true );

        // maximize
        items[2].setDisabled( w.maximized === true || w.hidden === true );
        if ( Ext.isBoolean( w.maximizable ) && w.maximizable === false )
            items[2].setDisabled( true );

        // close
        if ( Ext.isBoolean( w.closable ) && w.closable !== true )
            items[3].setDisabled( true );
        else
            items[3].setDisabled( false );

        var xy = e.getXY();

        var el = Ext.fly( el );
        if ( el.hasClass( 'x-window-header' ) || el.hasClass( 'x-window-header-text' ) ) {
            // left clicks on the header
            if ( e.button == 0 ) {
                var x = w.getPosition()[ 0 ];
                // but only over the leftmost area above the icon
                if ( xy[ 0 ] - x < 21 )
                    xy = [ x + 3, w.header.getBottom() ];
                else
                    return;
            }
        }

        // open the menu upwards if it will fall below the viewable area
        var mHeight = this.cmenu.el.getHeight();
        if ( mHeight + xy[ 1 ] > Ext.lib.Dom.getViewHeight() )
            xy[ 1 ] -= mHeight;

        // open the menu to the left if it will fall outside the viewable area
        var mWidth = this.cmenu.el.getWidth();
        if ( mWidth + xy[ 0 ] > Ext.lib.Dom.getViewWidth() )
            xy[ 0 ] -= mWidth;

        this.cmenu.showAt( xy );
    },

    closeWin: function( cMenu, e, win ) {
        if ( !win.isVisible() )
            win.show();
        else
            win.restore();
        win.close();
    }

});
