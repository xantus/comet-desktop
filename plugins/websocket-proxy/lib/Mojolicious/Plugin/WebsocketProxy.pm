package Mojolicious::Plugin::WebsocketProxy;

use strict;
use warnings;

use base 'Mojolicious::Plugin';
sub register {
    my ($self, $app, $opts) = @_;

    warn "longpoll websocket proxy loaded\n";

    $app->routes->route( $opts->{websocket_proxy_uri} || '/longpoll' )->via( 'post' )->to( 'Websocket_Proxy#proxy' );
}

1;
