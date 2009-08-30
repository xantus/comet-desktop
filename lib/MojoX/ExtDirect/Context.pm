package MojoX::ExtDirect::Context;

use strict;
use warnings;

use base 'Mojolicious::Context';

use JSON;
use Data::Dumper;

#__PACKAGE__->attr( [qw( clients )] );

# assigned via dispatch
__PACKAGE__->attr( [qw( rpc_config rpc_api_config mq_config mq_api_config )] );

sub redirect {
    my $self = shift;

    $self->res->code( 302 );

    $self->res->headers->header( Location => $self->url_for( @_ ) );

    return 1;
}

sub json_response {
    my ( $self, $data, $jsonp ) = @_;

    $self->res->code( 200 );

    # application/json?
    $self->res->headers->content_type( $jsonp ? 'text/javascript+json' : 'text/javascript' );

    my $out = to_json( $data );
    warn Data::Dumper->Dump([$out],['data_out']);

    $self->res->body( $jsonp ? $jsonp.'('.$out.');' : $out );

    return 1;
}

sub json_encode {
    return to_json( $_[1] );
}

sub json_decode {
    return from_json( $_[1] );
}

1;
