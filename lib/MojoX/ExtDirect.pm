package MojoX::ExtDirect;

use strict;
use warnings;

use JSON;

use base 'Mojolicious';

__PACKAGE__->attr(
    'rpc_config' => (
        default => sub {
            return {
                TestAction => {
                    methods => {
                        doEcho => {
                            len => 1
                        },
                        multiply => {
                            len => 1
                        }
                    }
                },
                MessageQueue => {
                    methods => {
                        pub => {
                            len => 2,
                        },
                        'sub' => {
                            len => 1,
                        },
                        unsub => {
                            len => 1,
                        },
                    }
                }
            };
        }
    )
);

__PACKAGE__->attr(
    'mq_config' => (
        default => sub {
            return {
                MessageQueue => {
                    methods => {
                        init => {
                        },
                        fetch => {
                        },
                    }
                }
            };
        }
    )
);


__PACKAGE__->attr(
    'rpc_api_config' => (
        default => \&_build_rpc_api_config
    )
);
__PACKAGE__->attr(
    'mq_api_config' => (
        default => \&_build_mq_api_config
    )
);


# This method will run once at server start
sub startup {
    my $self = shift;

    # Use our own context class
    $self->ctx_class('MojoX::ExtDirect::Context');

    # Routes
    my $routes = $self->routes;

    $routes->route('/api'   )->to( controller => 'handler', action => 'api_request' );
    $routes->route('/router')->to( controller => 'handler', action => 'router_request', route_type => 'rpc' );
    $routes->route('/mq'    )->to( controller => 'handler', action => 'mq_request' );
    
    # XXX remove XXX
    $routes->route('/poll'  )->to( controller => 'handler', action => 'poll_request' );

    # Static file handling
    $routes->route('/*file' )->to( controller => 'static', action => 'serve' );
    
    return;
}

# This method will run for each request
sub dispatch {
    my ( $self, $c ) = @_;

    $c->rpc_config( $self->rpc_config );
    $c->rpc_api_config( $self->rpc_api_config );
    
    $c->mq_config( $self->mq_config );
    $c->mq_api_config( $self->mq_api_config );

    # Try to find a static file
    my $done = $self->static->dispatch( $c );

    # Use routes if we don't have a response code
    $done ||= $self->routes->dispatch( $c );

    # Nothing found, serve static file "public/404.html"
    $self->static->serve_404( $c ) unless $done;
}

sub _build_rpc_api_config {
    my $self = shift;
    warn "building rpc api config\n";

    my $actions = {};

    # convert API config to Ext.Direct spec
    while ( my ( $aname, $a ) = each( %{$self->rpc_config} ) ) {
        my $methods = [];
        while ( my ( $mname, $m ) = each( %{$a->{methods}} ) ) {
            push(@$methods, {
                name => $mname,
                ( defined $m->{len} && $m->{len} > 0 ? ( len => $m->{len} ) : () ),
                ( defined $m->{formHandler} && $m->{formHandler} ) ? ( formHandler => JSON::true ) : (),
            });
        }
        $actions->{$aname} = $methods;
    }

    return {
        url => '/router',
        type => 'remoting',
        actions => $actions,
    };
}

sub _build_mq_api_config {
    my $self = shift;
    warn "building mq api config\n";

    my $actions = {};

    # convert API config to Ext.Direct spec
    while ( my ( $aname, $a ) = each( %{$self->mq_config} ) ) {
        my $methods = [];
        while ( my ( $mname, $m ) = each( %{$a->{methods}} ) ) {
            push(@$methods, {
                name => $mname,
                ( defined $m->{len} && $m->{len} > 0 ? ( len => $m->{len} ) : () ),
                ( defined $m->{formHandler} && $m->{formHandler} ) ? ( formHandler => JSON::true ) : (),
            });
        }
        $actions->{$aname} = $methods;
    }
    
    return {
        url => '/mq',
        type => 'longpolling',
        actions => $actions,
    };
}

1;
