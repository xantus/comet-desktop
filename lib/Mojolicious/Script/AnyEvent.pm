package Mojolicious::Script::AnyEvent;

use strict;
use warnings;

use AnyEvent;
use AnyEvent::Mojo;

use base 'Mojo::Script';

__PACKAGE__->attr(description => (chained => 1, default => <<'EOF'));
* Start the any_event daemon. *
Takes a port as an option, by default 3000 will be used.
    any_event
    any_event 8080
EOF

sub run {
    my ( $self, $port ) = @_;

    my $server = AnyEvent::Mojo::Server->new;

    $server->port( $port || 3000 );
    $server->keep_alive_timeout( 300 );

    my $app_class = $ENV{MOJO_APP} or die "env var MOJO_APP must be defined";
    my $app = Mojo::Loader->load_build( $app_class );

    $server->handler_cb(sub {
        my ( $self, $tx ) = @_;

        $app->handler( $tx );

        $tx->res->headers->header( 'X-Request-Count' => $server->request_count );

        return $tx;
    });

    $server->run();

    return $self;
}

'mtfnpy';
__END__

=head1 NAME

Mojolicious::Script::AnyEvent - Mojolicious Startup Script for 
Mojo::Script::AnyEvent

=head1 SYNOPSIS

    use Mojolicious::Script::AnyEvent;

    my $server = Mojolicious::Script::AnyEvent->new;
    $server->run(@ARGV);

=head1 DESCRIPTION

L<Mojolicious::Script::AnyEvent> is a Mojolicious startup script for 
L<Mojo::Server::AnyEvent>.

=head1 ATTRIBUTES

L<Mojo::Script::AnyEvent> inherits all attributes from L<Mojo::Script>

=head1 METHODS

L<Mojolicious::Script::AnyEvent> inherits all methods from L<Mojo::Script>

=head2 C<run>

    $server = $server->run(@ARGV);

=head1 SEE ALSO

L<Mojo>, L<Mojolicious>, L<AnyEvent>, L<Mojo::Script::AnyEvent>

L<http://xant.us/>

=head1 AUTHOR

David Davis E<lt>xantus@cpan.orgE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright 2009 by David Davis

License: Same as Perl

=cut

