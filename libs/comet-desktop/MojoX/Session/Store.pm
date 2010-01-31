package MojoX::Session::Store;

use strict;
use warnings;

use base 'Mojo::Base';

require Carp;

sub create { Carp::croak('Method "create" not implemented by subbclass') }

sub update { Carp::croak('Method "update" not implemented by subbclass') }

sub load { Carp::croak('Method "load" not implemented by subbclass') }

sub delete { Carp::croak('Method "delete" not implemented by subbclass') }

1;
__END__

=head1 NAME

MojoX::Session::Store - Base class for store

=head1 SYNOPSIS

    use base 'MojoX::Session::Store';

    sub create {
        my ($self, $sid, $expires, $data) = @_;
        ...
        return 1;
    }

    sub update {
        my ($self, $sid, $expires, $data) = @_;
        ...
        return 1;
    }

    sub load {
        my ($self, $sid) = @_;
        ...
        return ($expires, $data);
    }

    sub delete {
        my ($self, $sid) = @_;
        ...
        return 1;
    }

=head1 DESCRIPTION

L<MojoX::Session::Store> is a base class for store objects in L<MojoX::Session>.

=head1 METHODS

=head2 C<create>

Store session. Returns status.

=head2 C<update>

Update session. Returns status.

=head2 C<load>

Load session. Returns $expire and $data values.

=head2 C<delete>

Delete session. Returns status.

=head1 AUTHOR

vti, C<vti@cpan.org>.

=head1 COPYRIGHT

Copyright (C) 2008, Viacheslav Tikhanovskii.

This program is free software, you can redistribute it and/or modify it under
the same terms as Perl 5.10.

=cut
