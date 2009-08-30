/* Sprocket Socket library for Extjs
 * Ext.ux.Sprocket.Socket
 * Version: 0.1
 *
 * Copyright (c) 2009 - David Davis, All Rights Reserved
 * xantus@xant.us
 * http://xant.us/
 *
 * License: BSD v2 ( with Attribution )
 *
 * Please do not remove this header
 */

Ext.namespace( 'sprocket', 'Ext.ux.Sprocket' );

(function(){

if ( window.defined === undefined )
    defined = function( o ) { return o !== undefined };

var log;
if ( window.log ) {
    log = window.log;
//} else if ( Ext.log ) {
//    log = Ext.log;
} else if ( window.console ) {
    if ( window.controllers ) {
        log = function() { window.console.log.apply( window.console, arguments ); };
    } else {
        log = function(m) { window.console.log(m); };
    }
} else {
    log = Ext.emptyFn;
}

var VERSION = '0.2';
var STATE_CONNECTING = 0;
var STATE_OPEN = 1;
var STATE_CLOSED = 2;

Ext.ux.Sprocket.Socket = function( config ) {
    Ext.apply( this, config );
    this.initialize( config || {} );
};


Ext.extend( Ext.ux.Sprocket.Socket, Ext.util.Observable, {

    initialize: function( config ) {

        this.version = VERSION;
        this.CONNECTING = STATE_CONNECTING;
        this.OPEN = STATE_OPEN;
        this.CLOSED = STATE_CLOSED;

        this.parseWSURL();

        this.addEvents({
            /* undoc */
			message: true,
			/**
			 * @event data
			 * Fires when data has arrived
			 * @param {Obj} socket: @param {Ext.ux.Sprocket.Socket}, data: {data}
			 */
            data:    true,
			/**
			 * @event open
			 * Fires when the socket has connected
			 * @param {Obj} socket: @param {Ext.ux.Sprocket.Socket}
			 */
			open:    true,
			/**
			 * @event open
			 * Fires when the socket has disconnected
			 * @param {Obj} socket: @param {Ext.ux.Sprocket.Socket}
			 */
		    close:   true
		});
        
        //this.readyState = STATE_CONNECTING;
        this.readyState = STATE_CLOSED;

        if ( Ext.air ) {
            this.socket = new air.Socket();
            this.socket.addEventListener( air.Event.CONNECT, this.onConnected.createDelegate( this ) );
            this.socket.addEventListener( air.IOErrorEvent.IO_ERROR, this.onDisconnected.createDelegate( this ) );
            this.socket.addEventListener( air.SecurityErrorEvent.SECURITY_ERROR, this.onDisconnected.createDelegate( this ) );
            this.socket.addEventListener( air.Event.CLOSE, this.onDisconnected.createDelegate( this ) );
            this.socket.addEventListener( air.ProgressEvent.SOCKET_DATA, this.onData.createDelegate( this ) );
        } else {
            if ( !defined( Ext.ux.Sprocket.socketMan ) )
                Ext.ux.Sprocket.socketMan = new Ext.ux.Sprocket.SocketManager( config.manager || {} );
        
            Ext.ux.Sprocket.socketMan.onCreate( this );
        }
    },


    parseWSURL: function() {
        if ( !defined( this.url ) || !this.url.match( /^(wss?|s?tcp|pubsub):\/\/([^:|\/]+)(?::(\d+))?(\/.*)?/ ) )
            throw new Error("SYNTAX_ERR");

        // RegExp.$1: ws/wss/tcp/stcp/bayeux
        // RegExp.$2: host
        // RegExp.$3: port or null
        // RegExp.$4: path
        this.proto = RegExp.$1;
        this.secure = false;
        if ( this.proto == 'wss' ) {
            this.secure = true;
        } else if ( this.proto == 'stcp' ) {
            this.secure = true;
        }
        this.host = RegExp.$2;
        if ( RegExp.$3 == null ) {
            this.port = this.secure ? 815 : 81;
        } else {
            this.port = RegExp.$3;
        }
        this.resource = RegExp.$4 || '/';
    },


    destroy: function() {
        this.disconnect();
        if ( this.socket ) {
            this.socket.removeEventListener( air.Event.CONNECT, this.onConnected.createDelegate( this ) );
            this.socket.removeEventListener( air.IOErrorEvent.IO_ERROR, this.onDisconnected.createDelegate( this ) );
            this.socket.removeEventListener( air.SecurityErrorEvent.SECURITY_ERROR, this.onDisconnected.createDelegate( this ) );
            this.socket.removeEventListener( air.Event.CLOSE, this.onDisconnected.createDelegate( this ) );
            this.socket.removeEventListener( air.ProgressEvent.SOCKET_DATA, this.onData.createDelegate( this ) );
            this.socket.disconnect();
        }
        if ( Ext.ux.Sprocket.socketMan )
            Ext.ux.Sprocket.socketMan.onDestroy( this );
    },


    /* methods  */
    connect: function( host, port ) {
        if ( this.readyState == STATE_OPEN )
            return;

        if ( !Ext.isEmpty( host ) )
            this.host = host;
        if ( !Ext.isEmpty( port ) )
            this.port = port;

        // XXX experimental
        this.filter.reset();

        if ( this.socket ) {
            this.readyState = STATE_CONNECTING;
            this.socket.connect( this.host, this.port );
        } else
            Ext.ux.Sprocket.socketMan.onConnect( this, this.url );
    },


    disconnect: function() {
        if ( this.readyState != STATE_CLOSED ) {
            if ( this.socket ) {
                this.readyState = STATE_CLOSED;
                this.socket.close();
            } else
                Ext.ux.Sprocket.socketMan.onDisconnect( this );
        }
    },


    postMessage: function( data ) {
        if ( this.readyState != STATE_OPEN )
            throw new Error("INVALID_STATE_ERR");
        if ( this.filter ) {
            var chunks = this.filter.put( data );
            if ( chunks.length > 0 ) {
                if ( this.socket ) {
                    this.socket.writeUTFBytes( chunks );
                    this.socket.flush();
                } else
                    Ext.ux.Sprocket.socketMan.onSend( this, chunks );
            }
        } else {
            if ( this.socket ) {
                this.socket.writeUTFBytes( data );
                this.socket.flush();
            } else
                Ext.ux.Sprocket.socketMan.onSend( this, data );
        }
    },


    send: function() {
        this.postMessage.apply( this, arguments );
    },


    /* events called by the manager */
    onData: function( data ) {
        var evt = { socket: this };
        if ( this.socket ) {
            var ev = data;
            data = this.socket.readUTFBytes( this.socket.bytesAvailable );
            this.bytesLoaded = ev.bytesLoaded;
            this.bytesTotal = ev.bytesTotal;
        }
        if ( this.filter ) {
            var chunks;
            try {
                chunks = this.filter.get( data );
            } catch(e) {
                // TODO error event
                log('Error in filter get call: '+e.message);
            };
            try {
                if ( chunks.length > 0 )
                    evt.data = chunks;
                else
                    return;
            } catch(e) {
                log('Error in socket data event call: '+e.message);
                return;
            };
        } else {
            evt.data = data;
        }

        //setTimeout( this.fireEvent.createDelegate( this, [ 'data', evt ] ), 1 );
        this.fireEvent( 'data', evt );
        if ( this.onmessage )
            this.onmessage( evt );
    },


    onConnected: function() {
        if ( this.socket )
            this.readyState = STATE_OPEN;

        var evt = { socket: this };
        //setTimeout( this.fireEvent.createDelegate( this, [ 'open', evt ] ), 1 );
        this.fireEvent( 'open', evt );
        if ( this.onopen )
            this.onopen( evt );
    },


    onDisconnected: function( ev ) {
        var evt = { socket: this };

        if ( this.socket ) {
            this.readyState = STATE_CLOSED;
            if ( ev ) {
                evt.errorEvent = ev;
                evt.error = ev.text;
                if ( ev.errorID )
                    evt.errorID = ev.errorID;
            }
        }

        //setTimeout( this.fireEvent.createDelegate( this, [ 'close', evt ] ), 1 );
        this.fireEvent( 'close', evt );
        if ( this.onclose )
            this.onclose( evt );
    }


} );

if ( !Ext.air ) {

Ext.ux.Sprocket.SocketManager = function( config ) {
    Ext.apply( this, config );
    this.initialize( config || {} );
};

Ext.extend( Ext.ux.Sprocket.SocketManager, Ext.util.Observable, {

    version: '0.1',
    endpointURL: '/sprocket.gateway',
    timeout: 45000, // 45s
    backoff: 10000, // 10s
    xdomain: false, // cross domain ajax
    useJSONP: false,
    useCSS: false,

    initialize: function( config ) {
        this.sockets = {};
        this.sids = [];
        this.reqChannel = [ undefined, undefined ];
        this.queue = [];
        this.channels = [];
        this.bytesIn = 0;
        this.bytesOut = 0;
        this.socketInstances = 0;
        this.reqFailures = 0;
        this.failureLimit = 5; // failed requests in a row to trigger a mass disconnect
        this.addEvents({
			/**
			 * @event sent
			 * Fires when data is sent
			 * @param {Ext.ux.Sprocket.SocketManager} this
			 * @param {Int} bytes
			 * @param {Int} bytes total
			 */
			sent: true,
			/**
			 * @event received
			 * Fires when data is received
			 * @param {Ext.ux.Sprocket.SocketManager} this
			 * @param {Int} bytes
			 * @param {Int} bytes total
			 */
            received: true
        });
        var l = document.location.hostname.split('.').reverse();
        var domain = l[ 0 ];
        if ( l[ 1 ] )
            domain = l[ 1 ] + '.' + domain;
            
        config.origDomain = document.domain;
        config.domain = document.domain;

        if ( this.xdomain && ( Ext.isIE || Ext.isOpera ) && !this.useCSS ) {
            // xdomain xhr not supported by ie and opera, so force JSONP if
            // useCSS is not on
            this.useJSONP = true;
        }

        if ( this.xdomain && !this.useJSONP ) {
            /* setup the document.domain for cross domain comms */
            log( 'setting document.domain to '+domain );
    
            config.domain = domain;
            
            if ( !Ext.isIE ) {
                try { document.domain = domain; } catch(e) { log(e); };
            }
        }

        if ( this.endpointURL ) {
            this.endpointURL = this.endpointURL.replace( '__DOMAIN__', config.domain );
            log('sprocket.socket url set to:'+this.endpointURL);
        }
          
        if ( this.xurl ) {
            this.xurl = this.xurl.replace( '__DOMAIN__', config.domain );
            log('sprocket.socket xdomain url set to:'+this.xurl);
        }
    },


    destroy: function(e) {
        this.sockets = null;
        this.queue.length = 0;
        this.sids.length = 0;
        this.reqChannel.length = 0;
    },


    getAllConnectionIds: function() {
        var cids = [];
        for ( var i = 0, len = this.sids.length; i < len; i++ ) {
            var s = this.sockets[ this.sids[ i ] ];
            if ( s && s.cid )
                cids.push( s.cid );
        }
        return cids;
    },


    onCreate: function( socket ) {
        this.socketInstances++;
        var id = socket.id = Ext.id( socket, 'sock' );
        this.sids.push( id );
        this.sockets[ id ] = socket;
    },


    onDestroy: function( socket ) {
        this.socketInstances--;
        this.sids.remove( socket.id );
        delete this.sockets[ socket.id ];
    },


    onSend: function( socket, data ) {
        this.queue.push({
            action: 'send',
            id: socket.id,
            data: data
        });
        // XXX 
        var bytes = data.length;
        //setTimeout( this.fireEvent.createDelegate( this, [ 'sent', this, bytes, this.bytesOut ] ), 1 );
        this.fireEvent( 'sent', this, bytes, this.bytesOut );
        this.bytesOut += bytes;
        this.checkQueue( 'onSend' );
    },


    onConnect: function( socket, url ) {
        this.queue.push({
            action: 'connect',
            id: socket.id,
            url: url
        });
        this.checkQueue( 'onConnect' );
    },


    onDisconnect: function( socket ) {
        socket.readyState = STATE_CLOSED;
        var data = {
            action: 'disconnect',
            id: socket.id
        };
        /* if connected, store the connection id in the queue */
        if ( socket.cid )
            data.cid = socket.cid;
        this.queue.push( data );
        this.checkQueue( 'onDisconnect' );
    },


    getSocket: function( id ) {
        return this.sockets[ id ];
    },


    deferCheck: function( delay, reason ) {
        if ( this.deferId )
            clearTimeout( this.deferId );
        
        return this.deferId = this.checkQueue.defer( delay || 2000, this, [ reason ] );
    },


    checkQueue: function( from ) {
//        log('check queue ('+from+')');
        if ( this.deferId )
            clearTimeout( this.deferId );
/*        
        var time = new Date().dateFormat("U");
        if ( this.lastCheck ) {
            if ( ( this.lastCheck + 2 ) > time ) {
                this.deferId = this.checkQueue.defer( 3000, this, [ 'throttle' ] );
                return log( 'request too fast, throttling' );
            }
        }
        this.lastCheck = time;
*/
//        log('checkQueue ('+from+')');
        
        var channel = 1;

        if ( defined( this.reqChannel[ channel ] ) && this.isLoading( channel ) )
            channel = 2;
        
        if ( defined( this.reqChannel[ channel ] ) && this.isLoading( channel ) )
            return this.deferCheck( 2000, 'both channels were busy' );

//        log('checkQueue chan['+channel+'] ', this.queue );

        var out = [];
        var ids = {};
        var splicer = [];
        
        var q, socket;
        while ( this.queue.length > 0 ) {
            q = this.queue.shift();
            q.socket = this.getSocket( q.id );

            if ( !defined( q.socket ) )
                continue;

            ids[ q.id ] = 1;
            var data = {
                sid: q.id
            };

            if ( q.socket && q.socket.cid )
                data.cid = q.socket.cid;

            if ( channel > 1 )
                data['nowait'] = 1;

            switch( q.action ) {

                case 'connect':
                    if ( q.socket ) {
                        q.socket.readyState = STATE_CONNECTING;
                        /* remove the cid, because its invalid now */
                        delete q.socket.cid;
                        delete data.cid;
                        /* TODO check readyState, connect while connected */
                        data.action = 'connect';
                        data.url = q.url;
                        out.push( data );
                    } else
                        log( 'connect without socket, ignored' );
                    break;

                case 'disconnect':
                    if ( q.socket )
                        q.socket.readyState = STATE_CLOSED;

                    /* a socket can have a queued disconnect, and be gone */
                    if ( q.cid )
                        data.cid = q.cid;
                    
                    if ( q.cid ) {
                        data.action = 'disconnect';
                        out.push( data );
                    }

                    break;

                case 'send':
                    if ( q.socket.cid ) {
                        data.send = q.data;
                        out.push( data );
                    } else
                        log( 'send while not connected on '+q.id );

                    break;

                default:
                    log('undefined action: '+q.action);
                    
                    break;
            }
        }

        // not sure if the logic here is appropriate
        var polling = ( channel == 1 && this.queue.length == 0 && out.length == 0 ) ? true : false;
        
//        if ( channel == 2 )
//            polling = true;

        if ( polling ) {
            var socket;
            for ( var i = 0, len = this.sids.length; i < len; i++ ) {
                if ( !ids[ this.sids[ i ] ] ) {
//                    log('nothing to do for sid:'+this.sids[ i ]+', going to poll for data');
                    socket = this.getSocket( this.sids[ i ] );
                    if ( socket.readyState == STATE_CLOSED )
                        continue;
//                    log('polling for data on socket:'+this.sids[ i ]+' state:'+socket.readyState);
                    out.push({
                        cid: socket.cid,
                        sid: this.sids[ i ]
                    });
                }
            }
        }

        if ( out.length > 0 )
            this.reqChannel[ channel ] = this.ajaxRequest( out, channel );
        else {
            var defer = false;
            var socket;
            for ( var i = 0, len = this.sids.length; i < len; i++ ) {
                socket = this.getSocket( this.sids[ i ] );
                if ( !socket )
                    continue;
                if ( socket.readyState == STATE_CLOSED )
                    continue;
                // valid socket
                defer = true;
            }
            if ( defer ) {
                if ( defined( this.reqChannel[ 1 ] ) && this.isLoading( 1 ) ) {
//                    log( 'pending request, forgoing defer' );
                    return
                }
                this.deferCheck( 2000, 'no data' );
            }
        }
    },


    responseFail: function( res ) {
        log('response failed');
        
        log( res );

        this.reqFailures++;

        if ( this.reqFailures >= this.failureLimit )
            this.massDisconnect();
        else
            this.deferCheck( this.backoff, 'response failed' );
    },
    

    massDisconnect: function() {
        for ( var i = 0, len = this.sids.length; i < len; i++ ) {
            var s = this.sockets[ this.sids[ i ] ];
            if ( s && s.cid ) {
                s.readyState = STATE_CLOSED;
                s.onDisconnected();
            }
        }
    },

    
    response: function( res ) {
        this.reqFailures = 0;
        
        var obj;
        if ( res.responseText )
            obj = Ext.decode( res.responseText );
        
        return this.processResponseObj( obj );
    },
    

    ajaxResponse: function( res, c, chan ) {
        log(arguments);
        chan.busy = false;
        return this.response( res );
    },
    

    ajaxResponseFail: function( res, c, chan ) {
        chan.busy = false;
        return this.responseFail( res );
    },


    processResponseObj: function( o ) {
        if ( !o || !defined( o ) || !defined( o.items ) ) {
            log( 'no socket data from the server' );
            return this.checkQueue( 'response.noitems' );
        }
        var backoff = false;

        if ( o.advice && typeof o.advice == 'object' ) {
            log( 'advice present' );
            if ( o.advice.wait ) {
                this.backoff = o.advice.wait;
                backoff = true;
            }
        }
        var items = o.items;

        var socket;
        for ( var i = 0, len = items.length; i < len; i++ ) {
//            log( items[ i ] );
            if ( !items[ i ].sid ) {
                log( 'socket id not returned', items[ i ] );
                //backoff = true;
                continue;
            }

            socket = this.getSocket( items[ i ].sid );
            if ( !socket ) {
                log( 'ignoring event for old socket', items[ i ].sid );
//                backoff = true;
                continue;
            }

//            log( 'socket ' + items[ i ].sid + ' state:'+ items[ i ].readyState );

            var hasData = defined( items[ i ].data ) ? true : false;

            if ( hasData ) {
                var bytes = items[ i ].data.length;
                //setTimeout( this.fireEvent.createDelegate( this, [ 'received', this, bytes, this.bytesIn ] ), 1 );
                this.fireEvent( 'received', this, bytes, this.bytesIn );
                this.bytesIn += bytes;
            }

            switch ( items[ i ].state ) {

                case STATE_CLOSED:
                    /* send data event before disconnect */
                    if ( hasData )
                        socket.onData( items[ i ].data );

                    if ( socket.readyState != STATE_CLOSED ) {
                        socket.readyState = STATE_CLOSED;
                        socket.onDisconnected();
                    }

                    if ( defined( items[ i ].error ) )
                        socket.error = items[ i ].error;

                    break;

                case STATE_OPEN:
                    socket.cid = items[ i ].cid;
                    if ( socket.readyState != STATE_OPEN ) {
                        socket.readyState = STATE_OPEN;
                        /* send connect before data */
                        socket.onConnected();
                    }
                    
                    if ( hasData )
                        socket.onData( items[ i ].data );

                    break;

                default:
                    if ( !socket.cid )
                        socket.cid = items[ i ].cid;

                    if ( hasData )
                        socket.onData( items[ i ].data );

                    break;
            
            }
        }

        if ( backoff )
            return this.deferCheck( this.backoff, 'advised to backoff: '+this.backoff+'ms' );

        this.checkQueue( 'response' );
    },
    
                
    callbackFunc: function( chan, eventName, args, cbFunc ) {
        switch ( eventName ) {
            case 'success':
                chan.busy = false;
                this.response.apply( this, args );
                break;
            case 'failure':
                log( 'xdomain request failure');
                chan.busy = false;
                this.responseFail.apply( this, args );
                break;
            case 'load':
                log( 'loaded iframe for channel:'+chan.channel+' cb_id:'+chan.cbid);
                chan.handler = function(o) {
                    chan.busy = true;
                    cbFunc(o);
                };
                if ( chan.pendingRequest ) {
                    var data = chan.pendingRequest;
                    delete chan.pendingRequest;
                    chan.handler({
                        url: this.endpointURL,
                        timeout: this.timeout,
                        headers: {
                            'X-Sprocket-Client': 'Ext/' + Ext.version + '/' + VERSION,
                            'X-Sprocket-Client-Time': new Date().dateFormat('U')
                        },
                        params: {
                            data: data
                        }
                    });
                } else {
                    chan.busy = false;
                }
                break;
            default:
                log( 'event not handled in xdomain sprocket.socket:'+eventName);
                break;
        }
        
        return chan.channel;
    },

    processCSSJSONPResponse: function( chan, obj ) {
        chan.busy = false;
        this.processResponseObj( obj );
    },

    ajaxRequest: function( out, channel ) {
        var json = Ext.encode( out );

        if ( this.xdomain || this.useJSONP || this.useCSS ) {
            if ( this.useJSONP || this.useCSS ) {
                var chan;
                if ( this.channels[ channel ] ) {
                    chan = this.channels[ channel ];
                } else {
                    chan = this.channels[ channel ] = {
                        busy: true,
                        channel: channel
                    };
                    if ( this.useCSS )
                        chan.conn = new Ext.data.CSSProxy({
                            url: this.endpointURL,
                            timeout: this.timeout
                        });
                    else
                        chan.conn = new Ext.data.ScriptTagProxy({
                            url: this.endpointURL,
                            timeout: this.timeout
                        });

                    chan.response = this.processCSSJSONPResponse.createDelegate( this, [ chan ], 0 );
                }

                chan.busy = true;
                if ( !this.reader )
                    this.reader = new Ext.ux.Sprocket.ObjectReader();
                var params = { data: json };
                if ( this.useJSONP )
                    params.json = 1;
                chan.conn.load(
                    Ext.apply(params, this.extraParams ),
                    this.reader,
                    chan.response
                );

                return channel;
            } else {

                if ( !this.channels[ channel ] ) {
                    var id = 'sprocket-socket-iframe-'+channel;
                    var frame = document.getElementById( id );
                    if ( frame ) {
                        // shoudln't happen
                        frame.parentNode.removeChild( frame );
                    }
                                
                    var chan = this.channels[ channel ] = {};
                    chan.cbid = 'sprocketSocket-'+Ext.id();
                    chan.channel = channel;
                    chan.busy = true;
    
                    window[chan.cbid] = this.callbackFunc.createDelegate( this, [ chan ], 0 );
    
                    chan.pendingRequest = json;
    
                    frame = document.createElement('iframe');
                    //chan.frame = frame;
                    frame.className = 'x-hidden';
                    frame.name = id;
                    frame.setAttribute('id', id);
    //              if (Ext.isIE)
    //                  document.frames[id].name = id;
                    document.body.appendChild(frame);
                
                    //if (Ext.isIE)
                    //    frame.setAttribute('src',Ext.SSL_SECURE_URL);
                    var params = {
                        domain: document.domain,
                        cb: 'sprocketSocketCB',
                        id: chan.cbid
                    };
                    var p = Ext.urlEncode(Ext.apply(params, this.extraParams));
                    var url = this.xurl;
                    url += (url.indexOf('?') != -1 ? '&' : '?') + p;
                    url += '&_dc=' + (new Date().getTime());
    
                    frame.setAttribute('src', url);
                    
                    return channel;
                }
                
//                log('sent['+channel+']:'+json);
                this.channels[ channel ].handler({
                    url: this.endpointURL,
                    timeout: this.timeout,
                    headers: {
                        'X-Sprocket-Client': 'Ext/' + Ext.version + '/' + VERSION,
                        'X-Sprocket-Client-Time': new Date().dateFormat('U')
                    },
                    params: Ext.apply({
                        data: json
                    }, this.extraParams)
                });
                return channel;
            }
        } else {
            var chan;
            if ( this.channels[ channel ] ) {
                chan = this.channels[ channel ];
                chan.busy = true;
            } else {
                chan = this.channels[ channel ] = {
                    busy: true,
                    channel: channel
                };
            }
            var txId = Ext.Ajax.request({
                url: this.endpointURL,
                success: this.ajaxResponse.createDelegate( this, [ chan ], true ),
                failure: this.ajaxResponseFail.createDelegate( this, [ chan ], true ),
                timeout: this.timeout,
                headers: {
                    'X-Sprocket-Client': 'Ext/' + Ext.version + '/' + VERSION,
                    'X-Sprocket-Client-Time': new Date().dateFormat('U')
                },
                params: {
                    data: json
                }
            });
//            return txId;
//            log(txId);
            return channel;
        }
    },


    isLoading:function( channel ) {
//        if ( this.xdomain ) {
            return this.channels[ channel ] && this.channels[ channel ].busy;
//        } else {
//            return Ext.Ajax.isLoading( this.reqChannel[ channel ] );
//        }
    }
    

} );


/* dummy reader, that does nothing to the object */
Ext.ux.Sprocket.ObjectReader = function() {
    Ext.ux.Sprocket.ObjectReader.superclass.constructor.apply(this, arguments);
};

Ext.extend(Ext.ux.Sprocket.ObjectReader, Ext.data.DataReader, {
    readRecords : function(o) { return o; }
});


window.sprocketSocketCB = function( eventName, args, cb, id ) {
    try {
        if ( id && window[id] )
            window[id]( eventName, args, cb );
    } catch(e) { log(e.message); };
}
//    Ext.ux.Sprocket.socketMan.onCallback( eventName, args, cb, id );

}


})();
