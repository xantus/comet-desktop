/* Ext Stackable Data Filter for mpd (music player daemon)
 * 
 * Copyright (c) 2009 - All Rights Reserved
 * David W Davis <xantus@xant.us>
 *
 * License: BSD v2 ( with Attribution )
 *
 * Requires: Extjs, Ext.ux.Sprocket.Filter
 */


(function(){

var log;
if ( window.console ) {
    log = function(m) { window.console.log(m); };
} else if ( Ext.log ) {
    log = window.Ext.log;
} else {
    log = Ext.emptyFn;
}

var ERRORS = {
    1:  'not list',
    2:  'arg',
    3:  'password',
    4:  'permission',
    5:  'unknown',
    50: 'no exist',
    51: 'playlist max',
    52: 'system',
    53: 'playlist load',
    54: 'update already',
    55: 'player sync',
    56: 'exist'
};

Ext.ux.Sprocket.Filter.MPD = function() {
    Ext.ux.Sprocket.Filter.MPD.superclass.constructor.apply(this,arguments);
};


Ext.extend( Ext.ux.Sprocket.Filter.MPD, Ext.ux.Sprocket.Filter, {


    version: '1.0',


    initialize: function( config ) {
        Ext.ux.Sprocket.Filter.MPD.superclass.initialize.apply(this,arguments);
        this.config = config;

        this.reset();
    },


    clone: function() {
        return new this.constructor( this.config );
    },


    getPending: function() {
        return this.buffer;
    },


    getOneStart: function( items ) {
        if ( !( items instanceof Array ) )
            items = [ items ];

        for ( var i = 0, len = items.length; i < len; i++ )
            this.buffer.push( items[ i ] );
    },


    getOne: function() {
        var obj = [];
        var item = this.buffer.shift();
        if ( !item )
            return obj;

        if ( this.valid ) {
            // ACK [50@1] {play} song doesn't exist: "10240"
            // ACK [5@0] {} unknown command "stat"
            if ( item.match( /^ACK \[(\d+@\d+)\] {(.*)}\s?(.*)?/ ) ) {
                Ext.apply( this.resultBuffer, {
                    event: 'error',
                    errorNum: RegExp.$1,
                    errorText: ERRORS[ RegExp.$1 ],
                    listPos: RegExp.$2,
                    cmd: RegExp.$3 || null,
                    text: RegExp.$4 || ''
                } );
                obj.push( this.resultBuffer );
                this.resultBuffer = {};
            } else if ( item == 'OK' ) {
                this.resultBuffer = {};
            } else {
                if ( item.match( /^([^:]+):\s?(.*)/ ) ) {
                    // hack..
                    if ( this.lastCmd == 'listall' ) {
                        this.resultBuffer[RegExp.$1] = RegExp.$2;
                        obj.push( this.resultBuffer );
                        this.resultBuffer = {};
                        continue;
                    }
                    if ( this.resultBuffer.hasOwnProperty( RegExp.$1 ) ) {
                        obj.push( this.resultBuffer );
                        this.resultBuffer = {};
                    }
                    this.resultBuffer[RegExp.$1] = RegExp.$2;
                } else {
                    if ( Ext.isArray( this.resultBuffer.result ) )
                        this.resultBuffer.result.push( item );
                    else
                        this.resultBuffer.result = [ item ];
                }
            }
        } else {
            if ( item.match( /^OK MPD (.*)/ ) ) {
                this.valid = true;
                obj.push( { event: 'connect', version: RegExp.$1 } );
            } else {
                obj.push( { event: 'error', text: 'invalid response' } );
            }
        }

        return obj;
    },


    reset: function() {
        this.value = false;
        this.lastCmd = '';
        this.resultBuffer = {};
        this.buffer = [];
    },


    put: function( items ) {
        if ( !items )
            return [];

        if ( !Ext.isArray( items ) )
            items = [ items ];

        var obj = [];
        for ( var i = 0, len = items.length; i < len; i++ ) {
            if ( typeof items[ i ] == 'object' ) {
                var cmd = items[ i ].cmd;
                this.lastCmd = cmd.toLowerCase();
                if ( Ext.isArray( items[ i ].args ) ) {
                    for ( var j = 0, l = items[ i ].args.length; j < l; j++ ) {
                        if ( items[ i ].args[ j ].match( /\s/ ) )
                            cmd += ' "' + items[ i ].args[ j ] + '"';
                        else
                            cmd += ' ' + items[ i ].args[ j ];
                    }
                }
                obj.push( cmd );
                air.trace('cmd out:'+cmd);
            } else {
                this.lastCmd = items[ i ].toLowerCase();
                obj.push( items[ i ] );
                air.trace('cmd out:'+items[ i ]);
            }
        }
        return obj;
    }

});

})();

