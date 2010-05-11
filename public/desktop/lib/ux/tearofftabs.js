
Ext.ux.TearOffTabs = Ext.extend( Object, {

    init: function( panel ) {
        panel.initTab = panel.initTab.createSequence( this.initTab, panel );
    },

    initTab: function( item, index ) {
        if ( !this.tearTabsID ) {
            this.tearTabsID = Ext.id();
        }

        new Ext.ux.DDTearTabs( this.getTemplateArgs( item ), this.tearTabsID, {
            tabpanel: this // Pass a reference to the tabpanel for each dragObject
        });

        this.addEvents({
            startDrag : true,
            endDrag   : true
        });
    }

});

Ext.preg( 'tearofftabs', Ext.ux.TearOffTabs );

Ext.ux.DDTearTabs = Ext.extend( Ext.dd.DDProxy, {

    // Constructor
    constructor: function() {
        Ext.ux.DDSlidingTabs.superclass.constructor.apply( this, arguments );
        this.setYConstraint( 0, 0, 0 ); // Lock the proxy to its initial Y coordinate

        // Move the reference to the tab's tabpanel
        this.tabpanel = this.config.tabpanel;
        delete this.config.tabpanel;

        // Set the slide duration
        this.slideDuration = Ext.num( this.tabpanel.slideDuration, .1 );
    },

    // Pseudo Private Methods
    handleMouseDown: function( e, oDD ) {
        if ( ( this.primaryButtonOnly && e.button != 0 ) || this.isLocked() ) {
            return;
        }
        this.DDM.refreshCache( this.groups );
        var pt = new Ext.lib.Point( Ext.lib.Event.getPageX( e ), Ext.lib.Event.getPageY( e ) );
        if ( !this.hasOuterHandles && !this.DDM.isOverTarget( pt, this ) )  {
        } else {
            if ( this.clickValidator( e ) ) {
                this.setStartPosition(); // Set the initial element position
                this.b4MouseDown( e );
                this.onMouseDown( e );
                this.DDM.handleMouseDown( e, this );
                // this.DDM.stopEvent(e); // Must remove this event swallower for the tabpanel to work
            }
        }
    },

    startDrag: function( x, y ) {
        this.tabpanel.fireEvent( 'startDrag', this.tabpanel, this.tabpanel.getActiveTab() );
        Ext.dd.DDM.useCache = false; // Disable caching of element location
        Ext.dd.DDM.mode = 1; // Point mode

        this.proxyWrapper = Ext.get( this.getDragEl() ); // Grab a reference to the proxy element we are creating
        this.proxyWrapper.update(); // Clear out the proxy's nodes
        this.proxyWrapper.applyStyles( 'z-index:1001;border:0 none;' );
        this.proxyWrapper.addClass( 'tab-proxy' );

        // Use 2 nested divs to mimic the default tab styling
        // You may need to customize the proxy to get it to look like your custom tabpanel if you use a bunch of custom css classes and styles
        this.stripWrap = this.proxyWrapper.insertHtml( 'afterBegin', '<div class="x-tab-strip x-tab-strip-top"></div>', true );
        this.dragEl = this.stripWrap.insertHtml( 'afterBegin','<div></div>', true );

        this.tab = Ext.get( this.getEl() ); // Grab a reference to the tab being dragged
        this.tab.applyStyles( 'visibility:hidden;' ); // Hide the tab being dragged

        // Insert the html and css classes for the dragged tab into the proxy
        this.dragEl.insertHtml( 'afterBegin', this.tab.dom.innerHTML, false );
        this.dragEl.dom.className = this.tab.dom.className;

        // Constrain the proxy drag in the X coordinate to the tabpanel
        var panelWidth = this.tabpanel.el.getWidth(),
            panelY = this.tabpanel.el.getY(),
            panelX = this.tabpanel.el.getX(),
            tabX = this.tab.getX(),
            tabY = this.tab.getY(),
            tabWidth = this.tab.getWidth(),
            tabHeight = this.tab.getHeight(),
            left = tabX - panelX,
            right = panelX + panelWidth - tabX - tabWidth;
        this.lastL = left;
        this.lastR = right;
        this.resetConstraints();
        this.setXConstraint( left, right );
        Ext.apply( this, {
            constraintLeft: panelX,
            constraintRight: panelX + panelWidth,
            constraintTop: tabY - 10,
            constraintBottom: tabY + tabHeight + 10
        });
    },

    onDrag: function(e) {
        var x = e.getPageX(), y = e.getPageY();
        if ( x < this.constraintLeft || x > this.constraintRight
            || y < this.constraintTop || y > this.constraintBottom ) {
            // dragged the tab out of the panel, create a ghost window
            this.clearConstraints();
            if ( !this.ghost ) {
                // swap the dragEl with a ghost
                this.ghost = this.dragEl;
                this.ghostId = this.dragElId;
                this.ghost.hide();
                this.tab.applyStyles( 'visibility:visible;display:none;' );
                // cache this?
                var win = Ext.create({
                    xtype: 'window',
                    title: this.tabpanel.getActiveTab().title,
                    renderTo: Ext.getBody(),
                    width: 300,
                    height: 200,
                    x: x,
                    y: y
                });
                this.dragEl = win.createGhost();
                win.destroy();
                this.dragElId = this.dragEl.id;
                this.proxyWrapper.hide();
            }
        } else {
            if ( this.ghost ) {
                this.tab.applyStyles( 'visibility:hidden;display:block;' );
                this.dragEl.remove();
                this.dragEl = this.ghost;
                this.dragElId = this.ghostId;
                this.proxyWrapper.show();
                this.dragEl.show();
                delete this.ghost;
            }
            this.resetConstraints();
            this.setYConstraint( 0, 0, 0 );
            this.setXConstraint( this.lastL, this.lastR );
        }
    },


    endDrag: function( e ) {
        this.proxyWrapper.applyStyles( 'visibility:visible;' );

        if ( this.ghost ) {
            this.tab.applyStyles( 'visibility:hidden;display:block;' );
            var dragTab = this.tabpanel.getActiveTab();

            var items;
            if ( dragTab.windowConfig && dragTab.windowConfig.items ) {
                items = dragTab.windowConfig.items;
                delete dragTab.windowConfig.items;
            }
            var tools;
            if ( dragTab.windowConfig && dragTab.windowConfig.tools ) {
                tools = dragTab.windowConfig.tools;
                delete dragTab.windowConfig.tools;
            }

            var win = Ext.create(Ext.apply({
                xtype: 'window',
                title: dragTab.title,
                renderTo: Ext.getBody(),
                layout: 'fit',
                x: this.dragEl.getX(),
                y: this.dragEl.getY(),
                width: this.tabpanel.getWidth(),
                height: this.tabpanel.getHeight(),
                _orignalPanelId: this.tabpanel.id,
                tools:[{
                    id: 'up',
                    handler: function( ev, t, w, tc ) {
                        var orignal = Ext.getCmp( w._orignalPanelId );
                        w.hide( orignal.el, function() {
                            orignal.setActiveTab( orignal.add( this.items.items[ 0 ] ) );
                            orignal.doLayout();
                            this.destroy();
                        }, w );
                    },
/*                }, {
                    id: 'gear',
                    handler: function( ev, t, w, tc ) {
                        var nw = window.open ('javascript:false',w.id,'menubar=1,resizable=1,width='+w.getWidth()+',height='+w.getHeight());
                        if ( !nw )
                            return;
                        foobar = nw;
                        // relatively close if full screen
                        nw.screenX = w.getPosition()[0];
                        nw.screenY = w.getPosition()[1] + 100;
                        w.hide();
                    }
*/
                }],
                items: dragTab
            }, dragTab.windowConfig ));

            if ( tools ) {
                if ( Ext.isArray( tools ) )
                    Ext.each(tools, win.addTool);
                else 
                    win.addTool( tools );
                win.doLayout();
            }

            if ( items ) {
                win.add( items );
                win.doLayout();
            }

            win.show();

            this.ghost.remove();
            this.dragElId = this.ghostId;
            this.proxyWrapper.applyStyles( 'visibility:hidden;' );

            // Cleanup
            this.stripWrap.remove();
            this.dragEl.remove();

            delete this.dragEl;
            delete this.ghost;
            delete this.ghostId;

            if ( this.targetProxy ) {
                this.targetProxy.stripWrapper.remove();
                this.targetProxy.dragEl.remove();
            }
        } else {
            // Animate the dragProxy to the proper position
            this.proxyWrapper.shift({
                x: this.tab.getX(),
                easing: 'easeOut',
                duration: this.slideDuration,
                callback: function() {
                    this.proxyWrapper.applyStyles( 'visibility:hidden;' );
                    this.tab.applyStyles( 'visibility:visible;' );

                    // Cleanup
                    this.stripWrap.remove();
                    this.dragEl.remove();
                    if ( this.targetProxy ) {
                        this.targetProxy.stripWrapper.remove();
                        this.targetProxy.dragEl.remove();
                    }
                },
                scope:this
            });
        }

        Ext.dd.DDM.useCache = true;
        Ext.dd.DDM.mode = 0;

        this.tabpanel.fireEvent('endDrag', this.tabpanel, this.tabpanel.getActiveTab());
    },
    // credit: Ytorres http://www.extjs.com/forum/showthread.php?p=430305#post430305
    onDragOver: function( e, targetArr ) {
        e.stopEvent();

        // Grab the tab the user has dragged the proxy over
        var target = Ext.get( targetArr[ 0 ].id );
        var targetWidth = target.getWidth();
        var targetX = target.getX();
        var targetMiddle = targetX + ( targetWidth / 2 );
        var elX = this.tab.getX();
        var dragX = this.proxyWrapper.getX();
        var dragW = this.proxyWrapper.getWidth();
        if ( dragX < targetX && ( ( dragX + dragW ) > targetMiddle ) ) {
            if ( target.next() != this.tab ) {
                target.applyStyles( 'visibility:hidden;' );
                this.tab.insertAfter( target );
                this.targetProxy = this.createSliderProxy( targetX, target );
                if ( !this.targetProxy.hasActiveFx() ) {
                    this.animateSliderProxy( target, this.targetProxy, elX );
                }
            }
        }
        if ( dragX > targetX && ( dragX < targetMiddle )  ) {
            if ( this.tab.next() != target ) {
                target.applyStyles( 'visibility:hidden;' );
                this.tab.insertBefore( target );
                this.targetProxy = this.createSliderProxy( targetX, target );
                if ( !this.targetProxy.hasActiveFx() ) {
                    this.animateSliderProxy( target, this.targetProxy, elX );
                }
            }
        }
    },

    animateSliderProxy: function( target, targetProxy, elX ) {
        targetProxy.shift({
            x: elX,
            easing: 'easeOut',
            duration: this.slideDuration,
            callback: function() {
                targetProxy.remove();
                target.applyStyles( 'visibility:visible;' );
            },
            scope:this
        });
    },

    createSliderProxy: function( targetX, target ) {
        var sliderWrapperEl = Ext.getBody().insertHtml( 'afterBegin', '<div class="tab-proxy" style="position:absolute;visibility:visible;z-index:999;left:' + targetX + 'px;"></div>', true);
        sliderWrapperEl.stripWrapper = sliderWrapperEl.insertHtml( 'afterBegin', '<div class="x-tab-strip x-tab-strip-top"></div>', true );
        sliderWrapperEl.dragEl = sliderWrapperEl.stripWrapper.insertHtml( 'afterBegin', '<div></div>', true );
        sliderWrapperEl.dragEl.update( target.dom.innerHTML );
        sliderWrapperEl.dragEl.dom.className = target.dom.className;
        sliderWrapperEl.setTop( parseInt( target.getTop( false ) ) );
        return sliderWrapperEl;
    },

    onDragDrop: function( e, targetId ) {
        e.stopEvent();
    },


});
