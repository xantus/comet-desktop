package CometDesktop::Controller;

use strict;
use warnings;

use base 'Mojolicious::Controller';

use CometDesktop::User;
use Digest::SHA1();

BEGIN {
    # install JSON and JSON::XS if you can!
    eval 'use JSON();';
    eval ( $@ ? 'sub HAS_JSON(){ 0 }' : 'sub HAS_JSON(){ 1 }' );
};

__PACKAGE__->attr( json => HAS_JSON ? sub { JSON->new } : sub { Mojo::JSON->new } );
__PACKAGE__->attr( false => HAS_JSON ? sub { JSON->false } : sub { Mojo::JSON->false } );
__PACKAGE__->attr( true => HAS_JSON ? sub { JSON->true } : sub { Mojo::JSON->true } );

__PACKAGE__->attr( user => sub { CometDesktop::User->new } );
__PACKAGE__->attr( version => sub { $CometDesktop::VERSION } );
__PACKAGE__->attr( session_store => sub { CometDesktop::Session->new } );
__PACKAGE__->attr([qw/ db config /]);

sub new {
    shift->SUPER::new( @_ );
}

sub redirect {
    my ( $self, $target, $extra ) = @_;

    $self->res->code( 302 );
    $self->res->headers->header(
        Location => $self->url_for( $target ) . ( defined $extra ? $extra : '' )
    );

    return;
}

sub get_cookie {
    my ( $self, $name ) = @_;

    return unless defined $name;

    my $cookie = $self->req->cookie( $name );
    return unless defined $cookie;

    return $cookie->value->url_unescape->to_string;
}

sub json_encode {
    shift->json->encode( @_ );
}

sub json_decode {
    shift->json->decode( @_ );
}

sub sha1_hex {
    shift;
    return Digest::SHA1::sha1_hex( @_ );
}


1;
