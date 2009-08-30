package MojoX::Session::Store::DBIC;

use strict;
use warnings;

use base 'MojoX::Session::Store';

use MIME::Base64;
use Storable qw/nfreeze thaw/;

__PACKAGE__->attr('resultset');
__PACKAGE__->attr('sid_column' => 'sid');
__PACKAGE__->attr('expires_column' => 'expires');
__PACKAGE__->attr('data_column' => 'data');

sub create {
    my ($self, $sid, $expires, $data) = @_;

    $data = encode_base64(nfreeze($data)) if $data;

    my $resultset      = $self->resultset;
    my $sid_column     = $self->sid_column;
    my $expires_column = $self->expires_column;
    my $data_column    = $self->data_column;

    return $resultset->create(
        {   $sid_column     => $sid,
            $expires_column => $expires,
            $data_column    => $data,
        }
    ) ? 1 : 0;
}

sub update {
    my ($self, $sid, $expires, $data) = @_;

    $data = encode_base64(nfreeze($data)) if $data;

    my $resultset      = $self->resultset;
    my $sid_column     = $self->sid_column;
    my $expires_column = $self->expires_column;
    my $data_column    = $self->data_column;

    my $set = $resultset->search({$sid_column => $sid});
    return $set->update(
        {   $expires_column => $expires,
            $data_column    => $data,
        }
    ) ? 1 : 0;
}

sub load {
    my ($self, $sid) = @_;

    my $resultset      = $self->resultset;
    my $sid_column     = $self->sid_column;
    my $expires_column = $self->expires_column;
    my $data_column    = $self->data_column;

    my $row = $resultset->find({$sid_column => $sid});
    return unless $row;

    my $expires = $row->get_column($expires_column);
    my $data    = $row->get_column($data_column);

    $data = thaw(decode_base64($data)) if $data;

    return ($expires, $data);
}

sub delete {
    my ($self, $sid) = @_;

    my $resultset  = $self->resultset;
    my $sid_column = $self->sid_column;

    return $resultset->search({$sid_column => $sid})->delete;
}

1;
__END__

=head1 NAME

MojoX::Session::Store::DBIC - DBIx::Class Store for MojoX::Session

=head1 SYNOPSIS

    CREATE TABLE session (
        sid          VARCHAR(40) PRIMARY KEY,
        data         TEXT,
        expires      INTEGER UNSIGNED NOT NULL,
        UNIQUE(sid)
    );

    my $schema = DB->connect($dsn, $user, $pass, \%attr);
    my $rs = $schema->resultset('Session');
    my $session = MojoX::Session->new(
        store => MojoX::Session::Store::DBI->new(resultset => $rs),
        ...
    );

=head1 DESCRIPTION

L<MojoX::Session::Store::DBIC> is a store for L<MojoX::Session> that stores a
session in a database using DBIx::Class.

=head1 ATTRIBUTES

L<MojoX::Session::Store::DBIC> implements the following attributes.

=head2 C<resultset>

    my $resultset = $store->resultset;
    $resultset    = $store->resultset(resultset);

Get and set DBIx::Class::ResultSet object.

=head2 C<sid_column>

Session id column name. Default is 'sid'.

=head2 C<expires_column>

Expires column name. Default is 'expires'.

=head2 C<data_column>

Data column name. Default is 'data'.

=head1 METHODS

L<MojoX::Session::Store::DBIC> inherits all methods from
L<MojoX::Session::Store>.

=head2 C<create>

Insert session to database.

=head2 C<update>

Update session in database.

=head2 C<load>

Load session from database.

=head2 C<delete>

Delete session from database.

=head1 AUTHOR

William Ono

=head1 COPYRIGHT

Copyright (C) 2008, Viacheslav Tikhanovskii.

This program is free software, you can redistribute it and/or modify it under
the same terms as Perl 5.10.

=cut
