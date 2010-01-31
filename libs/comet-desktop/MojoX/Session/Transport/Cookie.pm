package MojoX::Session::Transport::Cookie;

use strict;
use warnings;

use base 'MojoX::Session::Transport';

use Mojo::Cookie::Request;
use Mojo::Cookie::Response;

__PACKAGE__->attr('name' => 'sid');
__PACKAGE__->attr('path' => '/');
__PACKAGE__->attr([qw/ domain secure /]);

sub get {
    my ($self) = @_;

    my $cookies = $self->tx->req->cookies;
    return unless $cookies;

    my $sid;
    foreach my $cookie (@$cookies) {
        if ($cookie->name eq $self->name) {
            return $cookie->value->to_string;
        }
    }

    return;
}

sub set {
    my ($self, $sid, $expires) = @_;

    my $cookie = Mojo::Cookie::Response->new();

    $cookie->name($self->name)->value($sid);
    $cookie->path($self->path);
    $cookie->domain($self->domain);
    $cookie->secure($self->secure);
    $cookie->expires($expires);

    $cookie->max_age(0) if $expires < time;

    $self->tx->res->cookies($cookie);
}

1;
__END__

=head1 NAME

MojoX::Session::Transport::Cookie - Cookie Transport for MojoX::Session

=head1 SYNOPSIS

    my $session = MojoX::Session->new(
        transport => MojoX::Session::Transport::Cookie->new(tx => $tx),
        ...
    );

=head1 DESCRIPTION

L<MojoX::Session::Transport::Cookie> is a transport for L<MojoX::Session> that
gets and sets session id to and from cookies.

=head1 ATTRIBUTES

L<MojoX::Session::Transport::Cookie> implements the following attributes.

=head2 C<tx>

    my $tx = $transport->tx;
    $transport = $transport->tx($tx);

Get and set L<Mojo::Transaction> object.

=head2 C<path>

    my $path = $transport->path;
    $transport->path('/');

Get and set cookie path.

=head2 C<domain>

    my $domain = $transport->domain;
    $transport->domain('example.com');

Get and set cookie domain.

=head2 C<secure>

    my $secure = $transport->secure;
    $transport->secure(1);

Get and set cookie secure flag.

=head1 METHODS

L<MojoX::Session::Transport::Cookie> inherits all methods from
L<MojoX::Session::Transport>.

=head2 C<get>

Get session id from request cookie.

=head2 C<set>

Set session id to the response cookie.

=head1 AUTHOR

vti, C<vti@cpan.org>.

=head1 COPYRIGHT

Copyright (C) 2008, Viacheslav Tikhanovskii.

This program is free software, you can redistribute it and/or modify it under
the same terms as Perl 5.10.

=cut
