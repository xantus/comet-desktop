package CometDesktop::AdminUsers;

use strict;
use warnings;

use base 'CometDesktop::Controller';

# /desktop/apps/admin-users/api/users
sub users {
    my $self = shift;

    $self->app->log->debug( "user admin is loading users" );

    # TBD - admin group check

    if ( $self->user->logged_in ) {
        my $users = $self->db->query(qq|
            SELECT user_id, user_name as vch_user_name, user_email as vch_email FROM users
        |)->hashes;
        $self->render_json({
            total => scalar( @$users ),
            data => $users
        });
        return;
    }

    $self->render_json({
        total => 0,
        data => []
    });

    return;
};

# /desktop/apps/admin-users/api/groups
sub groups {
    my $self = shift;

    $self->app->log->debug( "user admin is loading groups" );

    # TBD - admin group check
    if ( $self->user->logged_in ) {
        my $groups = $self->db->query(qq|
            SELECT group_id, group_name FROM groups
        |)->hashes;
        $self->render_json({
            total => scalar( @$groups ),
            data => $groups
        });
        return;
    }

    $self->render_json({
        total => 0,
        data => []
    });

    return;
};


1;
