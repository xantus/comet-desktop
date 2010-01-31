package MojoX::Session::Store::DBI;

use strict;
use warnings;

use base 'MojoX::Session::Store';

use MIME::Base64;
use Storable qw/nfreeze thaw/;

__PACKAGE__->attr('dbh');
__PACKAGE__->attr('table' => 'session');
__PACKAGE__->attr('sid_column' => 'sid');
__PACKAGE__->attr('expires_column' => 'expires');
__PACKAGE__->attr('data_column' => 'data');

sub create {
    my ($self, $sid, $expires, $data) = @_;

    $data = encode_base64(nfreeze($data)) if $data;

    my $table          = $self->table;
    my $sid_column     = $self->sid_column;
    my $expires_column = $self->expires_column;
    my $data_column    = $self->data_column;

    my $sth = $self->dbh->prepare(<<"");
    INSERT INTO $table ($sid_column,$expires_column,$data_column) VALUES (?,?,?)

    return unless $sth;

    return $sth->execute($sid, $expires, $data);
}

sub update {
    my ($self, $sid, $expires, $data) = @_;

    $data = encode_base64(nfreeze($data)) if $data;

    my $table          = $self->table;
    my $sid_column     = $self->sid_column;
    my $expires_column = $self->expires_column;
    my $data_column    = $self->data_column;

    my $sth = $self->dbh->prepare(<<"");
    UPDATE $table SET $expires_column=?,$data_column=? WHERE $sid_column=?

    return unless $sth;

    return $sth->execute($expires, $data, $sid);
}

sub load {
    my ($self, $sid) = @_;

    my $table          = $self->table;
    my $sid_column     = $self->sid_column;
    my $expires_column = $self->expires_column;
    my $data_column    = $self->data_column;

    my $sth = $self->dbh->prepare("SELECT * FROM $table WHERE $sid_column=?");
    return unless $sth;

    my $rv = $sth->execute($sid);
    return unless $rv;

    my $result = $sth->fetchrow_hashref;
    return unless $result;

    $result->{$data_column} = thaw(decode_base64($result->{$data_column}))
      if $result->{$data_column};

    return ($result->{$expires_column}, $result->{$data_column});
}

sub delete {
    my ($self, $sid) = @_;

    my $table          = $self->table;
    my $sid_column     = $self->sid_column;

    my $sth = $self->dbh->prepare("DELETE FROM $table WHERE $sid_column=?");
    return unless $sth;

    return $sth->execute($sid);
}

1;
__END__

=head1 NAME

MojoX::Session::Store::DBI - DBI Store for MojoX::Session

=head1 SYNOPSIS

    CREATE TABLE session (
        sid          VARCHAR(40) PRIMARY KEY,
        data         TEXT,
        expires      INTEGER UNSIGNED NOT NULL,
        UNIQUE(sid)
    );

    my $session = MojoX::Session->new(
        store => MojoX::Session::Store::DBI->new(dbh  => $dbh),
        ...
    );

=head1 DESCRIPTION

L<MojoX::Session::Store::DBI> is a store for L<MojoX::Session> that stores a
session in a database.

=head1 ATTRIBUTES

L<MojoX::Session::Store::DBI> implements the following attributes.

=head2 C<dbh>
    
    my $dbh = $store->dbh;
    $store  = $store->dbh($dbh);

Get and set dbh handler.

=head2 C<table>

Table name. Default is 'session'.

=head2 C<sid_column>

Session id column name. Default is 'sid'.

=head2 C<expires_column>

Expires column name. Default is 'expires'.

=head2 C<data_column>

Data column name. Default is 'data'.

=head1 METHODS

L<MojoX::Session::Store::DBI> inherits all methods from
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

vti, C<vti@cpan.org>.

=head1 COPYRIGHT

Copyright (C) 2008, Viacheslav Tikhanovskii.

This program is free software, you can redistribute it and/or modify it under
the same terms as Perl 5.10.

=cut
