

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

        win.addEvents({
            /**
             * @event documentkeypress
             * Fires when a keypress on the document occurs and the window is active
             * @param {Ext.Window} this
             * @param {Object} event
             */
            documentkeypress: true
        });
        
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

