package MojoX::ExtDirect::MQManager;

use strict;
use warnings;

use base 'Mojo::Base';

use Carp qw( croak );

our $mq_manager;

sub import {
    my ( $class, $args ) = @_;
    my $package = caller();
    
    croak __PACKAGE__." expects its arguments in a hash ref"
       if ( $args && ref( $args ) ne 'HASH' );

    __PACKAGE__->new( %$args );

    unless ( delete $args->{no_auto_export} ) {
        {
            no strict 'refs';
            *{ $package . '::mq_manager' } = \$mq_manager;
        }
    }

    return;
}

sub new {
    my $class = shift;
    return $mq_manager if ( $mq_manager );

    my $self = $mq_manager = bless({
        clients => {},
        channels => {},
        @_,
    }, ref $class || $class );

    eval "use MojoX::ExtDirect::MQChannel;";

    return $self;
}


sub add_client {
    my $self = shift;

    $self->{clients}->{ $_[0]->id } = $_[0];

    return;
}

sub remove_client {
    my $self = shift;

    my $id = ( ref $_[0] ) ? $_[0]->id : $_[0];

    # XXX channels
    warn "removing client $id\n";
    delete $self->{clients}->{ $id };

    return;
}

sub get_client {
    my ( $self, $cid ) = @_;

    die "no client id" unless ( $cid );

    if ( $self->{clients}->{ $cid } ) {
        return $self->{clients}->{ $cid };
    }

    my $cli = MojoX::ExtDirect::MQClient->new(
        id => $cid,
    );
    $self->add_client( $cli );

    $cli->init();

    return $cli;
}

sub fetch_client {
    my ( $self, $cid ) = @_;

    return undef unless $cid;

    return ( $self->{clients}->{ $cid } ) ? $self->{clients}->{ $cid } : undef;
}

sub get_channel {
    my ( $self, $ch ) = @_;

    return undef unless $ch;

    my $channels = $self->{channels};

    unless ( $channels->{ $ch } ) {
        $channels->{ $ch } = MojoX::ExtDirect::MQChannel->new(
            channel => $ch,
        );
    }

    return $channels->{ $ch };
}

sub publish {
    my ( $self, $channel, $data, $cid ) = @_;
    
    my $ch = $self->get_channel( $channel );
    return unless $ch;

    $ch->publish( @_[ 2, 3 ] );
    
    return;
}

sub subscribe {
    my ( $self, $cid, $channel ) = @_;

    my $ch = $self->get_channel( $channel );
    return unless $ch;

    $ch->subscribe( $cid );
    
    return;
}

sub unsubscribe {
    my ( $self, $cid, $channel ) = @_;

    my $ch = $self->get_channel( $channel );
    return unless $ch;

    $ch->unsubscribe( $cid );

    return;
}


1;
