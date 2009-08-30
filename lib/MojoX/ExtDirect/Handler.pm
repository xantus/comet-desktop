package MojoX::ExtDirect::Handler;

use strict;
use warnings;

use base 'Mojolicious::Controller';

use Data::UUID;
use JSON;
use MojoX::ExtDirect::MQClient;
use MojoX::ExtDirect::MQManager;

# uuid used to generate ids
__PACKAGE__->attr( 'uuid', default => sub { new Data::UUID } );

__PACKAGE__->attr( 'poll_time', default => 20 );
#__PACKAGE__->attr( [qw( foo )] );

sub mq_request {
    my $self = shift;
    my $c = $self->ctx;

    my ( $is_form, $is_upload, $data );

    if ( $c->req->method eq 'POST' ) {
        $data = $c->json_decode( $self->req->body );
#        warn "decoding json:".$self->req->body;
#    } elsif ( my $act = $self->req->param('extAction') ) {
#        # form post
#        $is_form = 1;
#        $data = {
#            action => $act,
#            method => $self->req->param('extMethod'),
#            tid => $self->req->param('extTID'),
#    #        data => [ $_POST, $_FILES ],
#        };
    } else {
        return $c->app->static->serve_500( $c );
    }

    my $response;
    if ( ref( $data ) eq 'ARRAY' ) {
        $response = [ map { $self->do_queue( $_, 1 ) } @$data ];
    } else {
        $response = $self->do_queue( $data );
    }
    return unless $response; # will long poll

    $self->stash( response_type => 'textarea' ) if ( $is_form && $is_upload );
    $self->send_response( $response );

    return 1;
}

sub send_response {
    my ( $self, $r ) = @_;

    my $c = $self->ctx;

    $r = $self->stash( 'response' ) unless ( $r );

#    $r = [ $r ] if ( ref( $r ) ne 'ARRAY' );

    my $rt = $self->stash( 'response_type' );
    if ( $rt && $rt eq 'textarea' ) {
        my $res = $self->res;
        $res->code( 200 );
        $res->headers->content_type( 'text/html' );
        $res->body( '<html><body><textarea>'.$c->json_encode( $r ).'</textarea></body></html>' );
    } elsif ( $rt && $rt eq 'jsonp' ) {
        my $res = $self->res;
        $res->code( 200 );
        $res->headers->content_type( 'text/javascript' );
        $res->body( ( $self->stash( 'jsonp_callback' ) || 'jsonpCB' ).'('.$c->json_encode( $r ).');' );
    } elsif ( $rt && $rt eq 'iframe' ) {
        my $res = $self->res;
        $res->code( 200 );
        $res->headers->content_type( 'text/html' );
        $res->body( '<script type="text/javascript">'.( $self->stash( 'iframe_callback' ) || 'parent.iframeCB' ).'('.$c->json_encode( $r ).');</script>' );
    } else {
        $c->json_response( $r );
    }

    return;
}

sub do_queue {
    my ( $self, $data, $arr ) = @_;
    my $c = $self->ctx;

    my $method = $data->{method};

    my $r = [];
    unless ( $method && (
        $c->mq_config->{'MessageQueue'}->{methods}->{ $method }
        || $c->rpc_config->{'MessageQueue'}->{methods}->{ $method } ) ) {
        return { reconnect => JSON::false, type => 'exception', message => 'Invalid method' };
    }

    if ( $method eq 'init' ) {
        my $cid = lc( substr( $self->uuid->create_hex, 2 ) );
        my $pt = $self->poll_time;
        return { clientId => $cid, advice => { reconnect => JSON::true, pollTime => $pt, timeout => $pt + 10 } };
    }

    unless ( $data->{clientId} && $data->{clientId} =~ m/^[a-f0-9]{32}$/ ) {
        return { reconnect => JSON::false, type => 'exception', message => 'invalid clientId' };
    }

    my $cli = $mq_manager->get_client( $data->{clientId} );

    if ( $method eq 'sub' ) {
        $cli->subscribe( $data->{channel} );
        return {
            type => 'rpc',
            tid => $data->{tid},
            action => 'MessageQueue',
            method => $method
        };
    }
    
    if ( $method eq 'unsub' ) {
        $cli->unsubscribe( $data->{channel} );
        return {
            type => 'rpc',
            tid => $data->{tid},
            action => 'MessageQueue',
            method => $method
        };
    }
    
    if ( $method eq 'pub' ) {
        $cli->publish( $data->{channel}, $data->{data} );
        return {
            type => 'rpc',
            tid => $data->{tid},
            action => 'MessageQueue',
            method => $method
        };
    }
   
    if ( $method eq 'fetch' ) {
        if ( $arr ) {
            return { reconnect => JSON::false, type => 'exception', message => 'Malformed request, array based request on a longpoll' };
        }

        # set the resume callback on all the client, while the connection is here
        $cli->resume_cb( $self->create_cb( $data->{clientId} ) );

        $cli->subscribe( '/foo/bar' );
#        $cli->publish( '/foo/bar', 'time:'.localtime() );

        $cli->fetch;

        $c->app->log->debug("LONG POLLING");
        return;
    }

    return { reconnect => JSON::false, type => 'exception', message => 'Malformed request' };
}

sub create_cb {
    my ( $self, $cid, $r ) = @_;
    my $c = $self->ctx;
    $r ||= [];

    my $resume_con = $c->tx->connection->pause;

    # set timer to wait for data
    my ( $timer, $cb );
    $cb = sub {
        my $cid = shift;

        $c->app->log->debug("resume called from:@{[ $cid || '(inactive timeout)' ]}");
        undef $timer;

        # XXX method call
        my $cli;
        $cli = $mq_manager->{clients}->{ $cid } if ( $cid );
        if ( $cli ) {
            $cli->resume_cb( undef );
            $cli->active;
            my $events = $cli->pull;
            push( @$r, @$events ) if ( @$events );
        }
        #push( @$r, { type => 'event', advice => { reconnect => JSON::true } } );
        $self->send_response( $r );
        undef $r;
        
        # resume http connection
        $resume_con->() if $resume_con;
        
        # ok?
        undef $resume_con;
        undef $cb;
    };

    # XXX pass $cb directly to the timer?
    $timer = AnyEvent->timer( after => $self->poll_time, cb => sub { $cb->() if $cb; } );

    return $cb;
}


sub router_request {
    my $self = shift;
    my $c = $self->ctx;

    my ( $is_form, $is_upload, $data );

    if ( $c->req->method eq 'POST' ) {
        $data = $c->json_decode( $self->req->body );
#        warn "decoding json:".$self->req->body;
    } elsif ( my $act = $self->req->param('extAction') ) {
        # form post
        $is_form = 1;
        $is_upload = $self->req->param('extUpload') eq 'true' ? 1 : undef;
        $data = {
            action => $act,
            method => $self->req->param('extMethod'),
            tid => $self->req->param('extTID'),
    #        data => [ $_POST, $_FILES ],
        };
    } else {
        return $c->app->static->serve_500( $c );
    }

    my $response = ( ref( $data ) eq 'ARRAY' ) ? [ map { $self->do_rpc( $_ ); } @$data ] : $self->do_rpc( $data );
    $self->stash( response_type => 'textarea' ) if ( $is_form && $is_upload );
    $self->send_response( $response );

    return 1;
}

sub do_rpc {
    my ( $self, $cdata ) = @_;
    my $c = $self->ctx;

    my $type = $self->stash( 'route_type' );
    # XXX
    my $config = ( $type eq 'rpc' ) ? $c->rpc_config : {};

    my $r;
    eval {
        unless ( $cdata->{action} ) {
            die 'Action is undefined';
        }
        
        unless( exists( $config->{$cdata->{action}} ) ) {
            die 'Call to undefined action: '.$cdata->{action};
        }

        my $action = $cdata->{action};
        my $a = $config->{$action};

        $self->do_calls( $a->{before}, $cdata );

        my $method = $cdata->{method};
        my $mdef = $a->{methods}->{$method};
        unless ( $mdef ) {
            die "Call to undefined method: $method on action $action";
        }
        $self->do_calls( $mdef->{before}, $cdata );

        $r = {
            type => $type,
            tid => $cdata->{tid},
            action => $action,
            method => $method
        };

        my $o;
        # XXX hack
        if ( $action eq 'MessageQueue' ) {
            $o = $self;
            $method = 'do_queue';
        } else {
#            warn "action: $action\n";

            eval "use $action;";
            die $@ if $@;
            my $o = $action->new();
        }
        my $params = ( defined( $cdata->{data} ) && ref( $cdata->{data} ) eq 'ARRAY' ) ? $cdata->{data} : [];

        $r->{result} = $o->$method( @$params );

        $self->do_calls( $mdef->{after}, $cdata, $r );
        $self->do_calls( $a->{after}, $cdata, $r );
    };
    if ( $@ ) {
        warn "exception: $@\n";
        $r->{type} = 'exception';
        $r->{message} = $@;
#        my @caller = caller(0);
#        $r->{where} = 'Pkg: '.$caller[0].' Line: '.$caller[2].' File:'.$caller[1];
    }

    return $r;
}

sub do_calls {
    my ( $self, $fns, $cdata, $returnData ) = @_;
    return unless ( $fns );
    
    if ( ref( $fns ) eq 'ARRAY' ){
        foreach my $f ( @$fns ) {
            $f->( $cdata, $returnData );
        }
    } else {
        $fns->( $cdata, $returnData );
    }
}


sub api_request {
    my $self = shift;
    my $c = $self->ctx;
    my $res = $self->res;

    $res->code( 200 );

    $res->headers->content_type( 'text/javascript' );

    $res->body( 'Ext.app.REMOTING_API = '.$c->json_encode( $c->rpc_api_config )
        .";\nExt.app.LONGPOLLING_API = ".$c->json_encode( $c->mq_api_config ).';' );

    return 1;
}

# XXX remove XXX
sub poll_request {
    my $self = shift;

    $self->ctx->json_response({
        'type' => 'event',
        'name' => 'message',
        'data' => 'Successfully polled at: '.localtime(),
    });

    return 1;
}

1;
