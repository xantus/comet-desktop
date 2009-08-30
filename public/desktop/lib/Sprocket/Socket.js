/* Web Socket library for Extjs and Sprocket.Gateway
 * Ext.ux.Sprocket.Socket
 * Version: 1.2
 *
 * Copyright (c) 2006-2009 - David Davis, All Rights Reserved
 * xantus@xant.us
 * http://xant.us/
 *
 * License: BSD v2 ( with Attribution )
 *
 * Please do not remove this header
 */

Ext.namespace( 'sprocket', 'sprocket.socket', 'sprocket.socketConfig', 'Ext.ux.Sprocket' );

(function(){

if ( window.defined === undefined )
    defined = function( o ) { return o !== undefined };

if ( !window.log )
    window.log = function() {};

Ext.ux.Sprocket.SocketManager = function( config ) {
    Ext.apply( this, config );
    this.initialize( config || {} );
};


Ext.extend( Ext.ux.Sprocket.SocketManager, Ext.util.Observable, {

    version: '1.2',
    url: '/sprocket.socket',
    timeout: 45000, // 45s
    backoff: 10000, // 10s
    xdomain: false, // cross domain ajax

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
            
        window.sprocket.socketConfig.origDomain = document.domain;
        window.sprocket.socketConfig.domain = document.domain;

        if ( this.xdomain ) {
            /* setup the document.domain for cross domain comms */
            log( 'setting document.domain to '+domain );
    
            window.sprocket.socketConfig.domain = domain;
            
            if ( !Ext.isIE ) {
                try { document.domain = domain; } catch(e) { log(e); };
            }
        }

        if ( this.url ) {
            this.url = this.url.replace( '__DOMAIN__', window.sprocket.socketConfig.domain );
            log('sprocket.socket url set to:'+this.url);
        }
          
        if ( this.xurl ) {
            this.xurl = this.xurl.replace( '__DOMAIN__', window.sprocket.socketConfig.domain );
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
        this.fireEvent( 'sent', this, bytes, this.bytesOut );
        this.bytesOut += bytes;
        this.checkQueue( 'onSend' );
    },


    onConnect: function( socket, host, port ) {
        this.queue.push({
            action: 'connect',
            id: socket.id,
            host: host,
            port: port
        });
        this.checkQueue( 'onConnect' );
    },


    onDisconnect: function( socket ) {
        if ( socket.state == 'disconnected' || socket.state == 'new' )
            return;
        // XXX set disconnected state here, or use a 'disconnecting' state
        //socket.state = 'disconnected';
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
                x: { sid: q.id }
            };

            if ( q.socket && q.socket.cid )
                data.conid = q.socket.cid;

            if ( channel > 1 )
                data['no_wait'] = 1;

            switch( q.action ) {

                case 'connect':
                    if ( q.socket ) {
                        q.socket.state = 'connecting';
                        /* remove the cid, because its invalid now */
                        delete q.socket.cid;
                        delete data.conid;
                        /* TODO check state, connect while connected */
                        data.action = 'connect';
                        data.host = q.socket.host;
                        data.port = q.socket.port;
                        out.push( data );
                    } else
                        log( 'connect without socket, ignored' );
                    break;

                case 'disconnect':
                    if ( q.socket )
                        q.socket.state = 'disconnected';

                    /* a socket can have a queued disconnect, and be gone */
                    if ( q.cid )
                        data.conid = q.cid;
                    
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
                    if ( socket.state == 'disconnected' || socket.state == 'new' )
                        continue;
//                    log('polling for data on socket:'+this.sids[ i ]+' state:'+socket.state);
                    out.push({
                        conid: socket.cid,
                        x: { sid: this.sids[ i ] }
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
                if ( !socket || !socket.state )
                    continue;
                if ( socket.state == 'disconnected' || socket.state == 'new' )
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
                s.state = 'disconnected';
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


    processResponseObj: function( o ) {
        if ( !o || !defined( o ) || !defined( o.items ) ) {
            log( 'no socket data from the server' );
            return this.checkQueue( 'response.noitems' );
        }
        var items = o.items;

        var socket;
        var backoff = false;
        for ( var i = 0, len = items.length; i < len; i++ ) {
//            log( items[ i ] );
            if ( !items[ i ].x ) {
                log( 'x data not returned', items[ i ] );
                backoff = true;
                continue;
            }

            socket = this.getSocket( items[ i ].x.sid );
            if ( !socket ) {
                log( 'event for old socket', items[ i ].x.sid );
//                backoff = true;
                continue;
            }

//            log( 'socket ' + items[ i ].x.sid + ' state:'+ items[ i ].state );
            
            var hasData = defined( items[ i ].data ) ? true : false;

            

            if ( hasData ) {
                var bytes = items[ i ].data.length;
                this.fireEvent( 'received', this, bytes, this.bytesIn );
                this.bytesIn += bytes;
            }

            switch ( items[ i ].state ) {

                case 'disconnected':
                    /* send data event before disconnect */
                    if ( hasData )
                        socket.onSocketData( items[ i ].data );

                    if ( socket.state != 'disconnected' ) {
                        socket.state = 'disconnected';
                        socket.onDisconnected();
                    }

                    if ( defined( items[ i ].error ) )
                        socket.error = items[ i ].error;

                    break;

                case 'connected':
                    socket.cid = items[ i ].conid;
                    if ( socket.state != 'connected' ) {
                        socket.state = 'connected';
                        /* send connect before data */
                        socket.onConnected();
                    }
                    
                    if ( hasData )
                        socket.onSocketData( items[ i ].data );

                    break;

                default:
                    if ( !socket.cid )
                        socket.cid = items[ i ].conid;
            
                    if ( hasData )
                        socket.onSocketData( items[ i ].data );

                    break;
            
            }
        }

/*
        if ( backoff ) {
            if ( this.deferId )
                clearTimeout( this.deferId );
            return this.deferId = this.checkQueue.defer( this.backoff, this, [ 'warn' ] );
        }
*/
        this.checkQueue( 'reponse' );
    },
    
                
    callbackFunc: function( chan, eventName, args, cbFunc ) {
        switch ( eventName ) {
            case 'success':
//                log( 'xdomain request success');
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
                        url: this.url,
                        timeout: this.timeout,
                        headers: {
                            'X-Sprocket-Timeout': this.timeout,
                            'X-Sprocket-Backoff': this.backoff,
                            'X-Sprocket-Client': 'Ext/' + this.version,
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

    processJSONPResponse: function( chan, obj ) {
        chan.busy = false;
        this.processResponseObj( obj );
    },

    ajaxRequest: function( out, channel ) {
        var json = Ext.encode( out );

        if ( this.xdomain ) {
            if ( window.sprocket.socketConfig.useJSONP || Ext.isIE || Ext.isOpera ) {
                var chan;
                if ( this.channels[ channel ] ) {
                    chan = this.channels[ channel ];
                } else {
                    chan = this.channels[ channel ] = {
                        busy: true,
                        channel: channel,
                        conn: new Ext.data.ScriptTagProxy({
                            url: this.url,
                            timeout: this.timeout
                        }),
                        reader: new Ext.ux.Sprocket.ObjectReader()
                    };
                    chan.response = this.processJSONPResponse.createDelegate( this, [ chan ], 0 );
                }

                chan.busy = true;
                chan.conn.load(
                    { data: json, ie: Ext.isIE },
                    chan.reader,
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
    
                    frame.setAttribute('src',this.xurl + '?domain='+encodeURIComponent(document.domain)+'&cb=sprocketSocketCB&id='+encodeURIComponent(chan.cbid)+'&r='+Math.random());
                    
                    return channel;
                }
                
//                log('sent['+channel+']:'+json);
                this.channels[ channel ].handler({
                    url: this.url,
                    timeout: this.timeout,
                    headers: {
                        'X-Sprocket-Timeout': this.timeout,
                        'X-Sprocket-Backoff': this.backoff,
                        'X-Sprocket-Client': 'Ext/' + this.version,
                        'X-Sprocket-Client-Time': new Date().dateFormat('U')
                    },
                    params: {
                        data: json
                    }
                });
                return channel;
            }
        } else {
        
            return Ext.Ajax.request({
                url: this.url,
                success: this.response.createDelegate( this ),
                failure: this.responseFail.createDelegate( this ),
                timeout: this.timeout,
                headers: {
                    'X-Sprocket-Timeout': this.timeout,
                    'X-Sprocket-Backoff': this.backoff,
                    'X-Sprocket-Client': 'Ext/' + this.version,
                    'X-Sprocket-Client-Time': new Date().dateFormat('U')
                },
                params: {
                    data: json
                }
            });
        }
    },


    isLoading:function( channel ) {
        if ( this.xdomain ) {
            return this.channels[ channel ] && this.channels[ channel ].busy;
        } else {
            return Ext.Ajax.isLoading( this.reqChannel[ channel ] );
        }
    }
    

} );



Ext.ux.Sprocket.Socket = function( config ) {
    Ext.apply( this, config );
    this.initialize( config );
};


Ext.extend( Ext.ux.Sprocket.Socket, Ext.util.Observable, {

    version: '1.2',


    initialize: function( config ) {
    
        /* fire up the manager on first use */
        if ( !defined( window.sprocket.SocketMan ) )
            window.sprocket.SocketMan = new Ext.ux.Sprocket.SocketManager( window.sprocket.socketConfig || config.manager || {} );
		
        this.addEvents({
			/**
			 * @event socketData
			 * Fires when a new color selected
			 * @param {Ext.ux.Sprocket.Socket} this
			 * @param {Array} chunks
			 */
			socketData: true,
			/**
			 * @event connect
			 * Fires when connected
			 * @param {Ext.ux.Sprocket.Socket} this
			 */
			connect: true,
			/**
			 * @event close
			 * Fires when disconnected
			 * @param {Ext.ux.Sprocket.Socket} this
			 */
		    close: true,
            /**
             * @event ioError
             * Fires when an input/output error occurs
             * @param {Ext.ux.Sprocket.Socket} this
             * @param {String} error
             */
            ioError: true,
            /**
             * @event securityError
             * Fires when a call to connect fails due to a security error
             * @param {Ext.ux.Sprocket.Socket} this
             * @param {String} error
             */
            securityError: true
		});

        /* default to a stream filter, or a stackable filter if an array */
        if ( this.filter === undefined )
            this.filter = new Ext.ux.Sprocket.Filter.Stream( {} );
        else if ( Ext.type( this.filter ) == 'array' )
            this.filter =  new Ext.ux.Sprocket.Filter.Stackable( { filters: this.filter } );
         
        //this.filter = defined( this.filter ) ? this.filter : ( new Ext.ux.Sprocket.Filter.Stackable() );
        this.state = 'new';

        sprocket.SocketMan.onCreate( this );
    },


    destroy: function() {
        this.disconnect();
        this.purgeListeners();
        sprocket.SocketMan.onDestroy( this );
    },


    /* methods  */
    connect: function( host, port ) {
        if ( defined( host ) )
            this.host = host;
        if ( defined( port ) )
            this.port = port;

        /* XXX error event */
        if ( defined( this.host ) && defined( this.port ) )
            sprocket.SocketMan.onConnect( this, this.host, this.port );
        else
            throw 'Ext.ux.Sprocket.Socket connect without host and port';
    },


    disconnect: function() {
        sprocket.SocketMan.onDisconnect( this );
    },


    send: function( data ) {
        var chunks = this.filter.put( data );
        if ( chunks.length > 0 )
            sprocket.SocketMan.onSend( this, chunks );
    },


    /* same as send */
    write: function() {
        this.send.apply( this, arguments );  
    },


    flush: function() {
        // TODO
    },


    onSocketData: function( data ) {
        var chunks;
        try {
            chunks = this.filter.get( data );
        } catch(e) { log('Error in filter get call: '+e.message); };
        try {
           if ( chunks.length > 0 )
               this.fireEvent( 'socketData', this, chunks );
        } catch(e) { log('Error in socketData event call: '+e.message); };
    },


    onConnected: function() {
        this.fireEvent( 'connect', this );
    },


    onDisconnected: function() {
        this.fireEvent( 'close', this );
    },


    onIOError: function( error ) {
        this.fireEvent( 'ioError', this, error );
    },


    onSecurityError: function( error ) {
        this.fireEvent( 'securityError', this, error );
    }


} );

/* dummy reader, that does nothing to the object */
Ext.ux.Sprocket.ObjectReader = function(meta, recordType){
    Ext.ux.Sprocket.ObjectReader.superclass.constructor.call(this, meta, recordType);
};

Ext.extend(Ext.ux.Sprocket.ObjectReader, Ext.data.DataReader, {

    readRecords : function(o) { return o; }

});

})();

function sprocketSocketCB( eventName, args, cb, id ) {
    try {
    if ( id && window[id] )
        window[id]( eventName, args, cb );
    } catch(e) { log(e.message); };
}
//    window.sprocket.SocketMan.onCallback( eventName, args, cb, id );


