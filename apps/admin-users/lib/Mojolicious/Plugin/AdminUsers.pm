package Mojolicious::Plugin::AdminUsers;

use strict;
use warnings;

use base 'Mojolicious::Plugin';

sub register {
    my ( $self, $app, $conf ) = @_;

    $app->routes->route( '/desktop/apps/admin-users/api/load-users' )->to( 'admin_users#load_users' );
}

1;
