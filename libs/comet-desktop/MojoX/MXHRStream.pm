package MojoX::MXHRStream;

# Copyright (c) 2009 - David Davis <xantus@xantus.org>
# License: Same as Mojo (Artistic)

use strict;
use warnings;

use Mojo::ByteStream 'b';

use base 'Mojo::Base';

use overload '""' => sub { shift->to_string }, fallback => 1;
use bytes;

__PACKAGE__->attr( boundary => '_' . time() . '-' . b( rand( 2 ** 32 ) )->md5_sum );
__PACKAGE__->attr( content_type => sub {
    return 'multipart/mixed; boundary="'.shift->boundary.'"';
} );
__PACKAGE__->attr( bytestream => sub {
    my $self = shift;
    my $boundary = $self->boundary;
    my $stream = '';
    foreach ( @{$self->{items}} ) {
        $stream .= "--$boundary\nContent-Type: $_->[1]\n$_->[0]";
    }
    return $stream . "--$boundary--\n";
} );

# Your face can take a lot of punishment. That’s good to know.
# There’s a lot about my face you don’t know.
sub import {
    my ( $class, $name ) = @_;

    return unless $name;

    my $caller = caller;
    no strict 'refs';
    *{"${caller}::$name"} = sub { MojoX::MXHRStream->new( @_ ) };
}

sub new {
    my $self = shift->SUPER::new( items => [] );
    $self->add_payload( @_ ) if ( @_ % 2 );
    return $self;
}

sub size { length shift->bytestream }

sub to_string { shift->bytestream }

sub add_payload {
    my $self = shift;
    push( @{$self->{items}}, [ @_ ] );
    return $self;
}

sub add_image {
    return shift->add_payload( b( shift )->b64_encode, shift );
}

sub add_html {
    return shift->add_payload( shift, 'text/html' );
}

sub add_js {
    return shift->add_payload( shift, 'text/javascript' );
}

sub stream {
    my ( $self, $res ) = @_;

    $res->body( $self );

    # set the headers AFTER the body so we don't trigger mojo's multipart handling 
    $res->headers->header( 'MIME-Version' => '1.0' );
    $res->headers->content_type( $self->content_type );

    return $self;
}

1;

__END__

# docs: TODO

# Example usage

my $mxhr = MojoX::MXHRStream->new();

my $home = Mojo::Home->new->detect( __PACKAGE__ );

my $image = '';
open FH, "$home/public/32x32-digg-guy.gif" or die $!." $home/public/32x32-digg-guy.gif";
binmode FH;
while (<FH>) { $image .= $_; }
close FH;

for ( 1 .. 300 ) {
    $mxhr->add_image( $image, 'image/gif' );
}

my $script = "console.log('test');/* fake data */\n";
for ( 1 .. 10 ) {
    $mxhr->add_js( $script );
}

$mxhr->stream( $self->res );

