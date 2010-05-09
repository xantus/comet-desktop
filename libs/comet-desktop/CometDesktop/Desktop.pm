package CometDesktop::Desktop;

use strict;
use warnings;

use base 'CometDesktop::Controller';

sub root {
    my $self = shift;

    if ( substr( $self->req->url->path, -1 ) ne '/' ) {
        return $self->redirect( 'desktop', '/' );
    }

    $self->render;
}

sub login {
    my $self = shift;

    my $user_in = $self->param( 'username' );
    my $pw_hash_in = $self->param( 'password' );
    my $error;

    my $token = $self->sha1_hex(
        join( '|', $self->app->secret, $self->req->headers->user_agent || 'Anon' )
    );

    if ( defined $user_in && defined $pw_hash_in ) {
        unless ( $self->user->load_user( $user_in, $pw_hash_in, $token ) ) {
            $error = 'Username or Password Incorrect';
        }
    }

    if ( $self->user->logged_in ) {
        $self->render_json({
            success => $self->true,
            data => {
                nickname => $self->user->user_name,
                # temporary
                load => [
                    'js/samples.js'
                ]
            }
        });
    } else {
        $self->render_json({
            success => $self->false,
            $error ? ( error => $error ) : (),
            token => $token,
            # default username for login app
            username => $self->session( 'username' ) || '',
        });
    }
}

sub logout {
    my $self = shift;

    $self->user->logout;

    $self->render_json({
        success => $self->true
    });
}

#$self->app->static->serve( $ctx, 'foo.json' );

1;
