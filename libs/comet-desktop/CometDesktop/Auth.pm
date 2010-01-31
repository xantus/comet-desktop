package CometDesktop::Auth;

use strict;
use warnings;

use base 'CometDesktop::Controller';

sub root {
    my $self = shift;

    my $res = $self->res;
    $res->headers->header( Pragma => 'nocache' );
    $res->headers->header( 'Cache-Control' => 'no-cache' );
    $res->headers->header( Expires => 0 );
    
    if ( $self->user->logged_in ) {
        $self->redirect( 'desktop', '/' );
    } else {
        $self->render( action => 'login_redirect' );
    }
}

# renders auth/login.html.epl
sub login {}

sub login_post {
    my $self = shift;

    my $p = $self->req->params->to_hash;
    
    if ( defined $p->{username} && $p->{username} ne ''
        && defined $p->{password} && $p->{password} ne '' ) {
        # if already logged in, log out that user
        if ( $self->user->logged_in ) {
            $self->user->logout();
            $self->session->expire;
            $self->session->flush;
        }
        # verify user
        if ( my $user_id = $self->user->login( @{$p}{qw( username password )} ) ) {
            $self->user->session_id( $self->session->create );
            $self->session->data( user_id => $user_id );
            $self->session->extend_expires;
            $self->session->flush;
            return $self->redirect( 'desktop' );
        } else {
            $self->stash( error_code => 'INVALID' );
        }
    } else {
        $self->stash( error_code => 'REQUIRED' );
    }

    $self->render( action => 'login' );
}

sub auth {
    my $self = shift;
    
    if ( $self->session->load ) {
        if ( $self->session->is_expired ) {
            $self->app->log->debug('Session found, but expired... Deleting');
            $self->session->flush;
        } else {
            $self->app->log->debug('Session found!');

            my $user_id = $self->session->data( 'user_id' );
            if ( defined $user_id && $user_id ne '' ) {
                $self->app->log->debug('User found!');
                if ( $self->user->load_user( $user_id ) ) {
                    $self->session->extend_expires;
                } else {
                    $self->session->expire;
                }
                $self->session->flush;
            } else {
                $self->app->log->debug('User not found, deleting session...');
                $self->session->expire;
                $self->session->flush;
            }
        }
    } else {
        $self->app->log->debug('No session was found');
    }
    return 1;
}

sub logout {
    my $self = shift;

    if ( $self->user->logged_in ) {
        $self->user->logout();
        $self->session->expire;
        $self->session->flush;
    }

    return $self->redirect( 'root' );
}

sub deny {
    my $self = shift;

    $self->res->code( 500 );
    $self->render( text => 'go away' );
}

1;
