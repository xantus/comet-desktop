package CometDesktop::AdminUsers;

use strict;
use warnings;

use base 'CometDesktop::Controller';


sub load_users {
    my $self = shift;

    $self->app->log->debug( "user admin is loading users" );

    $self->render_json({
        total => 0,
        items => []
    });

    return;
};

1;
