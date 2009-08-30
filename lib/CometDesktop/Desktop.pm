package CometDesktop::Desktop;

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
        # append a slash on the end of the url
        if ( substr( $self->req->url->path, -1 ) ne '/' ) {
            return $self->redirect( 'desktop', '/' );
        }

        $self->render;
    } else {
        $self->redirect( 'root' );
    }
}

#$ctx->app->static->serve( $ctx, 'foo.json' );

1;
