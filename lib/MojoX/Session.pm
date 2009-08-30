package MojoX::Session;

use strict;
use warnings;

our $VERSION = '0.12';

use base 'Mojo::Base';

use Mojo::Transaction;
use Digest::SHA1;

__PACKAGE__->attr(tx => sub { Mojo::Transaction->new });
__PACKAGE__->attr([qw/ store transport /]);

__PACKAGE__->attr('ip_match' => 0);
__PACKAGE__->attr('expires_delta' => 3600);

__PACKAGE__->attr('_is_new' => 0);
__PACKAGE__->attr('_is_stored' => 0);
__PACKAGE__->attr('_is_flushed' => 1);

__PACKAGE__->attr('sid' => 1);
__PACKAGE__->attr('_expires' => 0);
__PACKAGE__->attr('_data' => sub { {} });

sub create {
    my $self = shift;

    $self->_expires(time + $self->expires_delta);

    $self->_is_new(1);

    if ($self->ip_match) {
        $self->data('__ip_match', $self->_remote_addr);
    }

    $self->_generate_sid;

    if ($self->transport) {
        $self->transport->tx($self->tx);
        $self->transport->set($self->sid, $self->expires);
    }

    $self->_is_flushed(0);

    return $self->sid;
}

sub load {
    my $self = shift;
    my ($sid) = @_;

    $self->sid(undef);
    $self->_expires(0);
    $self->_data({});

    if ($self->transport) {
        $self->transport->tx($self->tx);
    }

    unless ($sid) {
        $sid = $self->transport->get;
        return unless $sid;
    }

    my ($expires, $data) = $self->store->load($sid);
    unless (defined $expires && defined $data) {
        $self->transport->set($sid, time - 30 * 24 * 3600)
          if $self->transport;
        return;
    }

    $self->_expires($expires);
    $self->_data($data);

    if ($self->ip_match) {
        return unless $self->_remote_addr;

        return unless $self->data('__ip_match');

        return unless $self->_remote_addr eq $self->data('__ip_match');
    }

    $self->sid($sid);

    $self->_is_stored(1);

    return $self->sid;
}

sub flush {
    my $self = shift;

    return unless $self->sid && !$self->_is_flushed;

    if ($self->is_expired && $self->_is_stored) {
        $self->store->delete($self->sid) if $self->store;
        $self->_is_stored(0);
        $self->_is_flushed(1);
        return;
    }

    if ($self->_is_new) {
        $self->store->create($self->sid, $self->expires, $self->data)
          if $self->store;
        $self->_is_new(0);
    }
    else {
        $self->store->update($self->sid, $self->expires, $self->data)
          if $self->store;
    }

    $self->_is_stored(1);
    $self->_is_flushed(1);
}

sub data {
    my $self = shift;

    if (@_ == 0) {
        return $self->_data;
    }

    if (@_ == 1) {
        return $self->_data->{$_[0]};
    }

    my %params = @_;

    $self->_data({%{$self->_data}, %params});
    $self->_is_flushed(0);
}

sub flash {
    my $self = shift;
    my ($key) = @_;

    return unless $key;

    $self->_is_flushed(0);

    return delete $self->data->{$key};
}

sub clear {
    my $self = shift;
    my ($key) = @_;

    if ($key) {
        delete $self->_data->{$key};
    }
    else {
        $self->_data({});
    }

    $self->_is_flushed(0);
}

sub expire {
    my $self = shift;
    $self->expires(0);

    if ($self->transport) {
        $self->transport->tx($self->tx);
        $self->transport->set($self->sid, $self->expires);
    }

    return $self;
}

sub expires {
    my $self = shift;
    my ($val) = @_;

    if (defined $val) {
        $self->_expires($val);
        $self->_is_flushed(0);
    }

    return $self->_expires;
}

sub extend_expires {
    my $self = shift;

    $self->_expires(time + $self->expires_delta);

    if ($self->transport) {
        $self->transport->tx($self->tx);
        $self->transport->set($self->sid, $self->expires);
    }

    $self->_is_flushed(0);
}

sub is_expired {
    my ($self) = shift;

    return time > $self->expires ? 1 : 0;
}

sub _remote_addr {
    my $self = shift;

    return $self->tx->remote_address;
}

sub _generate_sid {
    my $self = shift;

    # based on CGI::Session::ID
    my $sha1 = Digest::SHA1->new;
    $sha1->add($$, time, rand(time));
    $self->sid($sha1->hexdigest);
}

1;
__END__

=head1 NAME

MojoX::Session - Session management for Mojo

=head1 SYNOPSIS

    my $session = MojoX::Session->new(
        tx        => $tx,
        store     => MojoX::Session::Store::DBI->new(dbh  => $dbh),
        transport => MojoX::Session::Transport::Cookie->new,
        ip_match  => 1
    );

    $session->create; # creates new session
    $session->load;   # tries to find session

    $session->sid; # session id

    $session->data('foo' => 'bar'); # set foo to bar
    $session->data('foo'); # get foo value

    $session->data('foo' => undef); # works
    $session->clear('foo'); # delete foo from data

    $session->flush; # writes session to the store

=head1 DESCRIPTION

L<MojoX::Session> is a session management for L<Mojo>. Based on L<CGI::Session>
and L<HTTP::Session> but without any dependencies except the core ones.

=head1 ATTRIBUTES

L<MojoX::Session> implements the following attributes.

=head2 C<tx>

    Mojo::Transaction object

    my $tx = $session->tx;
    $tx    = $session->tx(Mojo::Transaction->new);

=head2 C<store>
    
    Store object

    my $store = $session->store;
    $session  = $session->store(MojoX::Session::Store::DBI->new(dbh => $dbh));

=head2 C<transport>

    Transport to find and store session id

    my $transport = $session->transport;
    $session
        = $session->transport(MojoX::Session::Transport::Cookie->new);

=head2 C<ip_match>

    Check if ip matches, default is 0

    my $ip_match = $session->ip_match;
    $ip_match    = $session->ip_match(0);

=head2 C<expires_delta>

    Seconds until session is considered expired

    my $expires_delta = $session->expires_delta;
    $expires_delta    = $session->expires_delta(3600);

=head1 METHODS

L<MojoX::Session> inherits all methods from L<Mojo::Base> and implements the
following new ones.

=head2 C<new>
    
    my $session = MojoX::Session->new(...);

    Returns new L<MojoX::Session> object.

=head2 C<create>

    my $sid = $session->create;
    $session->flush;

Creates new session. Puts sid into the transport. Call flush if you want to
store it.

=head2 C<load>

    $session->load;
    $session->load($sid);

Tries to load session from the store, gets sid from transport unless it is
provided. If sesssion is expired it will loaded also.

=head2 C<flush>

    $session->flush;

Flush actually writes to the store in these situations:
- new session was created (inserts it);
- any value was changed (updates it)
- session is expired (deletes it)

=head2 C<sid>

    my $sid = $session->sid;

Returns session id.

=head2 C<data>
    
    my $foo = $session->data('foo');
    $session->data('foo' => 'bar');
    $session->data('foo' => 'bar', 'bar' => 'foo');
    $session->data('foo' => undef);
    # or
    my $foo = $session->data->{foo};
    $session->data->{foo} = 'bar';

Get and set values to the session.

=head2 C<flash>

    my $foo = $session->data('foo');
    $session->data('foo' => 'bar');
    $session->flash('foo'); # get foo and delete it from data
    $session->data('foo');  # undef

Get value and delete it from data. Usefull when you want to store error messages
etc.

=head2 C<clear>

    $session->clear('bar');
    $session->clear;
    $session->flush;

Clear session values. Delete only one value if argument is provided.  Call flush
if you want to clear it in the store.

=head2 C<expires>

    $session->expires;
    $session->expires(123456789);

Get/set session expire time.

=head2 C<expire>

    $session->expire;
    $session->flush;

Force session to expire. Call flush if you want to remove it from the store.

=head2 C<is_expired>

Check if session is expired.

=head2 C<extend_expires>

Entend session expires time. Set it to current_time + expires_delta.

=head1 SEE ALSO

L<CGI::Session>, L<HTTP::Session>

=head1 AUTHOR

vti, C<vti@cpan.org>.

=head1 CREDITS

William Ono

=head1 COPYRIGHT

Copyright (C) 2008, Viacheslav Tikhanovskii.

This program is free software, you can redistribute it and/or modify it under
the same terms as Perl 5.10.

=cut
