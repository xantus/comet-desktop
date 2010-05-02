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

    my $tk = $self->param( 'token' );
    my $user = $self->param( 'username' );
    my $pass = $self->param( 'password' );
    my $ua = $self->req->headers->user_agent || 'Anon';
    my $token = $self->sha1_hex( join( '|', $self->app->secret, $ua ) );

    my $error;

    # $self->user->logged_in ...

    if ( defined $user && defined $pass ) {
        # TBD db check
        if ( defined $tk && $tk eq $token && $self->sha1_hex( $token .':'. 'foobar' ) eq $pass ) {
            $self->session( uid => time() );
            $self->session( username => $user );
        } else {
            if ( defined $tk && $tk ne $token ) {
                warn "token passed does not exist, or does not match real token\n";
            }
            $error = 'Username or Password Incorrect';
        }
    }

    my $uid = $self->session( 'id' );

    if ( $uid && !$error ) {
        # temporary
        $self->render_json({
            success => $self->true,
            data => {
                nickname => 'Xantus',
                load => [
                    'js/samples.js'
                ]
            }
        });
    } else {
        $self->render_json({
            success => $self->false,
            token => $token,
            username => $self->session( 'username' ) || '',
            error => $error
        });
    }
}

sub logout {
    my $self = shift;

    $self->session( uid => '' );

    $self->render_json({
        success => $self->true
    });
}

#$self->app->static->serve( $ctx, 'foo.json' );

1;
