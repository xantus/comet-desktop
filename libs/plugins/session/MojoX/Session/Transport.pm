package MojoX::Session::Transport;

use strict;
use warnings;

use base 'Mojo::Base';

require Carp;
use Mojo::Transaction;

__PACKAGE__->attr(tx => sub { Mojo::Transaction->new });

sub get { Carp::croak('Method "get" not implemented by subbclass') }

sub set { Carp::croak('Method "set" not implemented by subbclass') }

1;
__END__

=head1 NAME

MojoX::Session::Transport - Base class for transport

=head1 SYNOPSIS

    use base 'MojoX::Session::Transport';

    sub get {
        my ($self) = @_;
        ...
        return $sid;
    }

    sub set {
        my ($self, $sid, $expires) = @_;
        ...
        return 1;
    }

=head1 DESCRIPTION

L<MojoX::Session::Transport> is a base class for transport objects in
L<MojoX::Session>.

=head1 METHODS

=head2 C<get>

Get session id. Returns it.

=head2 C<set>

Set session id. Returns status.

=head2 C<load>

=head1 AUTHOR

vti, C<vti@cpan.org>.

=head1 COPYRIGHT

Copyright (C) 2008, Viacheslav Tikhanovskii.

This program is free software, you can redistribute it and/or modify it under
the same terms as Perl 5.10.

=cut
