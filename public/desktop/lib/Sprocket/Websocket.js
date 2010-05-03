/*
 * Ext WebSocket manager and pseudo Websocket fallback to longpolling
 * Copyright (c) 2010 - David Davis - http://xant.us/
 */
(function() {

    var log = function() {};
    if ( 'console' in window ) {
        log = function() { console.log.apply( console, arguments ); };
    }

    var WS_OPEN = 0,
        WS_CONNECTING = 1,
        WS_CLOSED = 2,
        seedId = 0,
        socketId = function() { return 'ext-ws-' + seedId++ };

    /**
     * @class Ext.ux.WebSocketMgr
     * @extends Ext.util.MixedCollection
     * A global manager for WebSockets.
     * Handles fallback using xhr longpolling.
     * @singleton
     */
    var mgr =
    Ext.ux.WebSocketMgr = Ext.apply( new Ext.util.MixedCollection(), {

        /**
         * @cfg {Object} listeners @hide
         */

        failures: 0,
        maxFailures: 10,
        backoff: 1000,
        backoffBy: 2,
        backoffMax: 1000 * 60 * 2,
        pending: false,
        pendingWake: false,
        pendingBackoff: false,

        // list of unique socket ids with activity
        q: [],

        url: '/longpoll',

        setUrl: function( url ) {
            this.url = url;
        },

        setOptions: function( opts ) {
            Ext.apply( this, opts );
        },

        exec: function( socket, action, data ) {
            if ( this.q.indexOf( socket.id ) == -1 )
                this.q.push( socket.id );
            // queue data is stored with the socket, not in the mgr
            socket.q.push( ( data !== undefined ) ? [ action, data ] : [ action ] );
            this.process();
        },

        process: function() {
            log('process sockets:', this.getCount());
            if ( !this.q.length ) {
                log( 'no sockets to handle, skipping...' );
                return;
            }

            // TBD use 2nd request and keep the longpoll waiting
            // for now just wake the longpoll
            if ( this.pending ) {
                if ( this.pendingWake ) {
                    log( 'pending wake, skipping...' );
                } else if ( this.pendingBackoff ) {
                    log( 'pending backoff, skipping...' );
                } else {
                    log( 'pending connection, sending wake' );
                    // send while poll is active
                    // use another quick request to wake the longpoll
                    this.pendingWake = true;

                    var params = { wake: true };
                    if ( this.sid )
                        params.sid = this.sid;

                    Ext.Ajax.request({
                        method: 'POST',
                        url: this.url,
                        success: function() {
                            this.pendingWake = false;
                        },
                        failure: function() {
                            this.pendingWake = false;
                        },
                        headers: {
                            'X-Origin': document.domain
                        },
                        params: params,
                        scope: this
                    });
                }
                return;
            }

            var out = [];
            for ( var i = 0, len = this.q.length; i < len; i++ ) {
                log( 'socket:'+this.q[ i ] );
                var sock = this.get( this.q[ i ] );
                if ( !sock ) {
                    console.warn('socket not found:'+this.q[ i ]);
                    continue;
                }
                log(sock.id + ' readystate:' + sock.readyState);

                if ( sock.q.length ) {
                    out.push( [ sock.id, sock.q ] );

                    delete sock.q; sock.q = [];
                    sock.bufferedAmount = 0;
                }
            }

            var params = {};
            if ( !this.sid )
                params.reset = true;

            if ( out.length )
                params.ev = Ext.encode( out );

            this.request( params );
        },

        request: function( params ) {
            this.pending = true;

            Ext.Ajax.request({
                method: 'POST',
                url: this.url,
                success: this.onSuccess,
                failure: this.onFailure,
                headers: {
                    'X-Origin': document.domain
                },
                params: params,
                scope: this
            });
        },

        onSuccess: function( res ) {
            this.pending = false;
            this.pendingBackoff = false;
            this.pendingWake = false; // XXX

            var o = Ext.decode( res.responseText || 'null' );
            if ( Ext.isObject( o ) ) {
                if ( o.sid ) {
                    log( 'session id:'+o.sid );
                    this.sid = o.sid;
                }
                if ( o.bye ) {
                    console.warn( 'server said bye' );
                    // XXX server thinks there are no connections
                } else {
                    this.process.defer( 1, this );
                }
                if ( Ext.isArray( o.ws ) ) {
                    for ( var i = 0, len = o.ws.length; i < len; i++ ) {
                        var sock = this.get( o.ws[ i ].id );
                        if ( !sock ) {
                            console.warn( 'socket not found for '+o.ws[ i ].id, o.ws[ i ] );
                            continue;
                        }
                        for( var j = 0, len2 = o.ws[ i ].el.length; j < len2; j++ ) {
                            switch( o.ws[ i ].el[ j ].ev ) {
                                case 'open':
                                    this.onOpen( sock );
                                    break;
                                case 'message':
                                    this.onMessage( sock, o.ws[ i ].el[ j ].msg );
                                    break;
                                case 'close':
                                    this.onClose( sock, true );
                                    break;
                                case 'error':
                                    // XXX not handled yet
                                    this.onClose( sock, false );
                                    break;
                                default:
                                    console.warn( 'unhandled socket event: '+ o.ws[ i ].el[ j ].ev );
                                    break;
                            }
                        }
                    }
                }
            } else {
                throw new Error( 'bad data received ' + o );
            }
        },

        onFailure: function( res, obj ) {
            this.failures++;

            if ( this.failures > this.maxFailures ) {
                return this.closeAllPseudoSockets();
            }

            this.request.defer( this.backoff, this, [ obj.params ] );
            this.backoff *= this.backoffBy;
            if ( this.backoff > this.backoffMax )
                this.backoff = this.backoffMax;
        },

        closeAllPseudoSockets: function() {
            this.each(function( sock ) {
                if ( sock.pseudo )
                    this.onClose( sock, false );
            }, this);
        },

        onOpen: function( sock ) {
            sock.readyState = WS_OPEN;
            var ev = new WebSocketEvent({ type: 'open', target: sock });
            sock.fireEvent( 'open', ev );
            if ( sock.onopen )
                sock.onopen.call( sock, ev );
            ev.destroy();
        },

        onMessage: function( sock, data ) {
            var ev = new WebSocketEvent({ type: 'message', target: sock, data: data });
            sock.fireEvent( 'message', ev );
            if ( sock.onmessage )
                sock.onmessage.call( sock, ev );
            ev.destroy();
        },

        onClose: function( sock, clean ) {
            sock.readyState = WS_CLOSED;
            var ev = new WebSocketEvent({ type: 'close', target: sock, wasClean: clean });
            sock.fireEvent( 'close', ev );
            if ( sock.onclose )
                sock.onclose.call( sock, ev );
            ev.destroy();
        },

        /**
         * Registers one or more WebSockets with the WebSocketMgr. You do not normally need to register sockets
         * manually.  Any WebSocket initialized with a {@link Ext.ux.WebSocket#id} will be auto-registered. 
         * @param {Ext.ux.WebSocket} socket1 A WebSocket instance
         * @param {Ext.ux.WebSocket} socket2 (optional)
         * @param {Ext.ux.WebSocket} etc     (optional)
         */
        register: function() {
            for ( var i = 0, len = arguments.length; i < len; i++ ) {
                this.add( arguments[ i ] );
            }
        },

        /**
         * Unregisters one or more WebSockets with the WebSocketMgr
         * @param {String/Object} id1 The id of the WebSocket, or a WebSocket instance
         * @param {String/Object} id2 (optional)
         * @param {String/Object} etc (optional)
         */
        unregister: function() {
            for ( var i = 0, len = arguments.length; i < len; i++ ) {
                this.remove( this.lookup( arguments[ i ] ) );
            }
        },

        /**
         * Gets a registered WebSocket by id
         * @param {String/Object} id The id of the WebSocket, or a WebSocket instance
         * @return {Ext.data.WebSocket}
         */
        lookup: function( id ) {
            return Ext.isObject( id ) ? id : this.get( id );
        },

        getKey: function( obj ) {
             return obj.id;
        }

    });

    var PseudoSocket = Ext.extend( Ext.util.Observable, {

        q: [],

        constructor: function( url, protocol ) {
            if ( !url )
                throw new SyntaxError( 'Not enough arguments' );

            Ext.apply( this, {
                URL: url,
                readyState: WS_CONNECTING,
                bufferedAmount: 0,
                pseudo: true
            });

            if ( protocol )
                this.protocol = protocol;

            if ( !this.id )
                this.id = socketId();

            this.addEvents({
                open: true,
                message: true,
                close: true
            });

            mgr.register( this );

            if ( !mgr.enableLongpoll ) {
                this.close.defer( 1, this );
                return;
            }

            // defer connect until after this context is done
            mgr.exec.defer( 1, mgr, [ this, 'open', url, protocol ] );
        },

        send: function( data ) {
            if ( this.readyState == WS_CONNECTING )
                throw new Error( 'INVALID_STATE_ERR' );

            if ( this.readyState != WS_OPEN ) {
                this.bufferedAmount += data.length;
                mgr.exec( this, 'send', data );
                return false;
            }

            mgr.exec( this, 'send', data );

            return true;
        },

        close: function() {
            if ( this.readyState == WS_CLOSED )
                return;
            this.readyState = WS_CLOSED;
            mgr.exec( this, 'close' );
        }

    });

    Ext.apply( PseudoSocket, {
        __pseudo: true,
        CONNECTING: WS_CONNECTING,
        OPEN:       WS_OPEN,
        CLOSED:     WS_CLOSED
    });

    var WebSocketEvent = Ext.extend( Object, {

        cancelable: true,
        canBubble: false,

        constructor: function( config ) {
            Ext.apply( this, config );
            if ( this.target )
                this.currentTarget = this.target;
            this.timeStamp = new Date();
        },

        stopPropagation: function() {
            this.cancelBubble = true;
        },

        preventDefault: function() {
            if ( this.cancelable )
                this.returnValue = false;
        },

        destroy: function() {
            Ext.iterate( this, function( k, v, o ) {
                delete o[ k ];
            });
        }

    });

    if ( 'WebSocket' in window ) {
        if ( !WebSocket._attached ) {
            // a normal intercepter or subclass won't work, but this does
            var WS = WebSocket;
            WebSocket = function( url, proto ) {
                var ws = proto ? new WS( url, proto ) : new WS( url );

                Ext.apply( ws, {
                    id: socketId(),
                    pseudo: false
                });

                log('registering new native websocket', ws);
                mgr.register( ws );

                return ws;
            };
            Ext.apply( WebSocket, {
                _attached: true,
                CONNECTING: WS_CONNECTING,
                OPEN:       WS_OPEN,
                CLOSED:     WS_CLOSED
            });
        }
    } else {
        if ( mgr.enableFlashSocket ) {
            document.write([
                '<scr'+'ipt type="text/javascript" src="' + mgr.script_swfobject + '"></scr'+'ipt>',
                '<scr'+'ipt type="text/javascript" src="' + mgr.script_fabridge  + '"></scr'+'ipt>',
                '<scr'+'ipt type="text/javascript" src="' + mgr.script_websocket + '"></scr'+'ipt>'
            ].join(''));

            (function() {
                WebSocket.__swfLocation = mgr.swf_websocket;
            }).defer( 1 );
        } else {
            // the longpoll check is later
            WebSocket = PseudoSocket;
        }
    }

})();

