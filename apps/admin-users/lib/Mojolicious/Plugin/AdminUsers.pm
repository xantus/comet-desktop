package Mojolicious::Plugin::AdminUsers;

use strict;
use warnings;

use base 'Mojolicious::Plugin';

sub register {
    my ( $self, $app, $conf ) = @_;

    $app->routes->route( '/desktop/apps/admin-users/api/users' )->via( 'post' )->to( 'admin_users#users' );
    $app->routes->route( '/desktop/apps/admin-users/api/groups' )->via( 'post' )->to( 'admin_users#groups' );
}

1;
