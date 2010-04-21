package Mojolicious::Plugin::StaticFallback;

use strict;
use warnings;

use base 'Mojolicious::Plugin';

my @dispatchers;

sub register {
    my ( $self, $app, $config ) = @_;

    foreach ( @{ $config->{static_fallback} || [] } ) {
        push( @dispatchers,
            MojoX::Dispatcher::Static->new(
                prefix => $_->{prefix},
                root   => $_->{static_dir}
            )
        );
    }

    my $default;

    $app->plugins->add_hook( before_dispatch => sub {
        my $c = $_[ 1 ];

        # pull the normal dispatcher
        $default = $c->app->static;

        my $e = $default->dispatch( $c );

        if ( $e ) {
            foreach ( @dispatchers ) {
                $e = $_->dispatch( $c );
                last unless $e;
            }
        }

        # fake dispatcher that returns our return val
        $c->app->static( Mojolicious::Plugin::StaticFallback::Fake->new( $e ) );
    });

    $app->plugins->add_hook( after_static_dispatch => sub {
        # replace dispatcher
        if ( defined $default ) {
            $_[ 1 ]->app->static( $default );
            undef $default;
        }
    });
 
    $app->renderer->add_helper(
        static_fallback => sub {
            push( @dispatchers,
                MojoX::Dispatcher::Static->new(
                    prefix => $_[0],
                    root   => $_[1]
                )
            );
            return;
        }
    );

    return $self;
}

sub add {
    my $self = shift;

    push( @dispatchers,
        MojoX::Dispatcher::Static->new(
            prefix => $_[0],
            root   => $_[1]
        )
    );

    return $self;
}

1;

package Mojolicious::Plugin::StaticFallback::Fake;

sub new {
    my $class = shift;
    bless( \ shift, $class );
}

sub dispatch {
    return ${$_[0]};
}

1;
