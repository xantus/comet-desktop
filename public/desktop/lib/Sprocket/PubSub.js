/* Hierarchical PubSub for Extjs
 * Ext.ux.Sprocket.PubSub
 * Version: 3.0
 * 
 * Copyright (c) 2008-2010 - David Davis, All Rights Reserved
 * xantus@xant.us
 * http://xant.us/
 *
 * License: BSD
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the <organization> nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY <copyright holder> ''AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL <copyright holder> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Please do not remove this header
 */

(function() {

Ext.namespace( 'Ext.ux.Sprocket' );

var singleton = null;

Ext.override( Ext.util.Observable, {

    subscribe: function( eventName, fn, scope, o ) {
        singleton.addEvents( eventName );
        singleton.on( eventName, fn, scope, o );

        if ( !this.events )
            this.events = {};

        this.on( 'destroy', singleton.un.createDelegate( singleton, [ eventName, fn, scope, o ], false ) );
    },

    publish: function( eventName, event ) {
        if ( singleton.eventsSuspended === true )
            return true;

        // a global event listener
        var glob = singleton.events[ '*' ];
        if ( glob )
            if ( glob.fire.call( glob, event, eventName ) === false )
                return true;

        if ( eventName.substr( 0, 1 ) == '/' && eventName.length > 1 ) {
            // Hierarchical
            var chans = eventName.substr( 1 ).split( '/' );
            var matched = false;
            for ( var i = 0, len = chans.length; i <= len; i++ ) {
                var fn = singleton.events[ '/' + chans.slice( 0, i ).join( '/' ).toLowerCase() ];
                if ( fn ) {
                    matched = true;
                    if ( fn.fire.call( fn, event, eventName ) === false )
                        return true;
                }
            }
            return matched;
        } else {
            // Normal
            var fn = singleton.events[ eventName.toLowerCase() ];
            if ( fn ) {
                fn.fire.call( fn, event, eventName );
                return true;
            }
        }
        return false;
    },

    // Removes subscribers, and the channel
    removeSubscribers: function( eventName ) {
        if ( eventName !== undefined ) {
            eventName = eventName.toLowerCase();
            var fn = singleton.events[ eventName ];
            if ( fn )
                fn.clearListeners();
            delete singleton.events[ eventName ];
        } else {
            Ext.iterate( singleton.events, function( k, v, o ) {
                v.clearListeners();
                delete o[ k ];
            });
        }
    }

});

singleton = Ext.ux.Sprocket.PubSub = new Ext.util.Observable();
singleton.events = {};

})();


/* Example: log all events

    Ext.onReady(function() {
        var app = new Ext.util.Observable();
        app.subscribe( '*', function(event, channel) {
            console.log('event:'+channel,event);
        });
    });

*/
