package Mojolicious::Plugin::IrcExample;

use strict;
use warnings;

use base 'Mojolicious::Plugin';

sub register {
    my ( $self, $app, $conf ) = @_;

    my $auth = $app->routes->bridge->to( 'auth#auth' );

    $auth->route( '/irc-websocket' )->to( 'irc_example#irc_proxy' );
}

1;
