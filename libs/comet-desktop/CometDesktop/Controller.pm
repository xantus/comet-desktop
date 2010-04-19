package CometDesktop::Controller;

use strict;
use warnings;

use base 'Mojolicious::Controller';

use CometDesktop::User;

BEGIN {
    # install JSON and JSON::XS if you can!
    eval 'use JSON;';
    eval ( $@ ? 'sub HAS_JSON(){ 0 }' : 'sub HAS_JSON(){ 1 }' );
};

__PACKAGE__->attr( json => HAS_JSON ? sub { JSON->new } : sub { Mojo::JSON->new } );
__PACKAGE__->attr( false => HAS_JSON ? sub { JSON->false } : sub { Mojo::JSON->false } );
__PACKAGE__->attr( true => HAS_JSON ? sub { JSON->true } : sub { Mojo::JSON->true } );

__PACKAGE__->attr( session_secret => 'changeMe' );
__PACKAGE__->attr( user => sub { CometDesktop::User->new } );
__PACKAGE__->attr( version => $CometDesktop::VERSION );
__PACKAGE__->attr( session => sub { CometDesktop::Session->new } );
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

# never use a cookie directly, verify it's good first
sub session_cookie {
    my $self = shift;
    my $sid = $self->get_cookie( 'sessionId' );

    unless ( defined $sid && $sid =~ m/^[a-f0-9]{40}\/[a-f0-9]{40}$/ ) {
        warn "session id doesn't match sha1/sha1 sid[$sid]" if ( defined $sid );
        return undef;
    }

    my $check;
    ( $check, $sid ) = ( split( '/', $sid, 2 ) );

    my $code;
#    if ( $self->extra_security ) {
#        $code = sha1_hex( $sid.':'.$self->session_secret.':'.( $ENV{HTTP_USER_AGENT} || '' ) );
#    } else {
        $code = sha1_hex( $sid.':'.$self->session_secret );
#    }

    unless ( $code eq $check ) {
        warn "session $sid doesn't pass token check against $check";
        return undef;
    }

    return $sid;
}

1;
