package MojoX::ExtDirect::Static;

use strict;
use warnings;

use base 'Mojolicious::Controller';

sub serve {
    my ( $self, $ctx ) = @_;

    my $file = $self->stash( 'file' ) || 'index.html';

    my $index = 0;
    if ( substr( $file, -1 ) eq '/' ) {
        $file .= 'index.html';
        $index = 1;
    }

    return if $ctx->app->static->serve( $ctx, $file );

    if ( $index ) {
        # TODO serve up directory index
    }

    return $ctx->app->static->serve_404( $ctx );
}

1;
