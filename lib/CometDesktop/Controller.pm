package CometDesktop::Controller;

use strict;
use warnings;

use base 'Mojolicious::Controller';

use CometDesktop::User;
use JSON::Any;

__PACKAGE__->attr( json => sub { JSON::Any->new } );

__PACKAGE__->attr( session_secret => 'changeMe' );

__PACKAGE__->attr( user => sub { CometDesktop::User->new } );

__PACKAGE__->attr( desktop_version => '1234' );

__PACKAGE__->attr( session => sub { CometDesktop::Session->new } );

__PACKAGE__->attr([qw/ db google_analytics_acct /]);

sub new {
    my $class = shift;
    $class->SUPER::new( @_ );
}

sub redirect {
    my ( $self, $target, $extra ) = @_;

    $self->res->code( 302 );
    $self->res->headers->header(
        Location => $self->url_for( $target ) . ( defined $extra ? $extra : '' )
    );

    return;
}

sub json_response {
    my ( $self, $data, $jsonp ) = @_;

    $self->res->code( 200 );

    # or application/json?
    $self->res->headers->content_type( $jsonp ? 'text/javascript+json' : 'text/javascript' );

    my $out = $self->json->objToJson( $data );
    warn Data::Dumper->Dump([$out],['data_out']);

    $self->res->body( $jsonp ? $jsonp.'('.$out.');' : $out );

    return 1;
}

sub get_cookie {
    my ( $self, $name ) = @_;

    return unless defined $name;

    my $cookie = $self->req->cookie( $name );
    return unless defined $cookie;

    return $cookie->value->url_unescape->to_string;
}

sub json_encode {
    my $self = shift;
    return eval { $self->json->objToJson( @_ ); };
}

sub json_decode {
    my $self = shift;
    return eval { $self->json->jsonToObj( @_ ); };
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
