package MojoX::ExtDirect::MQChannel;

use strict;
use warnings;

use base 'Mojo::Base';

#use Data::Dumper;
use MojoX::ExtDirect::MQManager;

__PACKAGE__->attr( [ qw( channel ) ] );
__PACKAGE__->attr( 'events', default => sub { [] } );
__PACKAGE__->attr( 'clients', default => sub { {} } );
__PACKAGE__->attr( 'len', default => 0 );

sub subscribe {
    my ( $self, $cid ) = @_;

    my $clients = $self->clients;
    if ( !exists( $clients->{ $cid } ) ) {
        $clients->{ $cid } = $self->len - 1;
    }
    
    return;
}

sub unsubscribe {
    my ( $self, $cid ) = @_;
    
    delete $self->clients->{ $cid };

    return;
}

sub publish {
    my ( $self, $data, $cid ) = @_;
    # $cid could be optional
    
    my $ev = $self->events;

    push( @$ev, [ $data, $cid ] );

    my $lcd = $self->len( $self->len + 1 );
    my $len = $lcd + 0;

    my $clients = $self->clients;
    foreach ( keys %$clients ) {
        $lcd = $clients->{ $_ } if ( $clients->{ $_ } < $lcd );
        my $cli = $mq_manager->fetch_client( $_ ) || next;
        $cli->do_resume();
    }
    if ( $len > 50 && $lcd > 50 ) {
        warn "cleaning out queue, len:$len lcd:$lcd, new len:".($len-$lcd)."\n";
        foreach ( keys %$clients ) {
            $clients->{ $_ } = $lcd;
        }
        splice( @$ev, 0, $lcd );
        $self->len( $len - $lcd );
    }

    return;
}

sub pull {
    my ( $self, $cid ) = @_;

    my $clients = $self->clients;
    return unless exists $clients->{ $cid };

#    warn Data::Dumper->Dump([$clients],['clients']);

    my $idx = $clients->{ $cid } + 1 || 0;
    my $len = $self->len - 1;

    # set the client's subscription fetch point to the bottom
    $clients->{ $cid } = $len;

    warn "$cid : $idx : $len";

    return ( $idx == $len ) ? [ $self->events->[ $idx ] ] : [ @{ $self->events}[ $idx, $len ] ];
}


1;
