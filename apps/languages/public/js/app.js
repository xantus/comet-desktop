
Ext.ns( 'CometDesktop.ux' );

CometDesktop.ux.LanguageSupport = Ext.extend( CometDesktop.Module, {

    appName: 'languages',
    appId: '16ae3b3c5fb011df802bcb8955b62d7f',
    appChannel: '/desktop/system/admin/locale',
    id: 'languages-win',

    title: 'Language Support',

    init: function() {
        this.subscribe( this.appChannel, this.eventReceived, this );
        var locale = Ext.util.Cookies.get( 'locale' );
        this.locale = ( locale ) ? locale : 'en_US';
    },

    /* the menu item triggers a pubsub event */
    eventReceived: function( ev ) {
        switch ( ev.action ) {
            case 'launch':
                this.start();
                break;

            case 'startup':
                this.startup();
                break;
        }
    },

    startup: function(){
        var win = app.getWindow( this.id );
        if ( !win )
            win = this.create();
        win.show();
    },

    create: function() {
        return app.createWindow({
            id: this.id,
            title: this.title,
            width: 400,
            height: 120,
            iconCls: 'cd-icon-system-admin-locale',
            layout: 'form',
            padding: 10,
            items: [{
                xtype: 'combo',
                anchor: '99%',
                fieldLabel: 'Language',
                emptyText: 'Select...',
                value: this.locale,
                store: CometDesktop.localeStore,
                tpl: '<tpl for="."><div class="x-combo-list-item">{english} ({lang})</div></tpl>',
                displayField: 'lang',
                valueField: 'locale',
                typeAhead: false,
                mode: 'local',
                triggerAction: 'all',
                forceSelection: true,
                selectOnFocus: true,
                listeners: {
                    select: function( combo, record ) {
                        this.locale = record.data.locale;
                    },
                    scope: this
                }
            }],
            buttonAlign: 'center',
            buttons: [{
                text: 'Cancel',
                handler: function() {
                    app.getWindow( this.id ).close();
                },
                scope: this
            }, {
                text: 'Ok',
                handler: function() {
                    // TBD - set using state manager
                    Ext.util.Cookies.set( 'locale', this.locale );
                    app.getWindow( this.id ).close();
                },
                scope: this
            }]
        });
    }

});

new CometDesktop.ux.LanguageSupport();
