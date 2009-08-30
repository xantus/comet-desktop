package MojoX::ExtDirect::MQClient;

use strict;
use warnings;

use base 'Mojo::Base';

use AnyEvent;
use Data::Dumper;

use MojoX::ExtDirect::MQManager; # imports $mq_manager


# important accessors
__PACKAGE__->attr( [qw( resume_cb timer on_cleanup idle_timer id )] );
# stats
__PACKAGE__->attr( 'last_active', default => 0 );

__PACKAGE__->attr( 'available', default => 0 );

__PACKAGE__->attr( 'idle_timeout', default => 45 );

__PACKAGE__->attr( 'channels', default => sub { {} } );

# XXX
sub init {
    my $self = shift;

    $self->active;

    $self->idle_timer( AnyEvent->timer( after => 10, interval => 20, cb => sub {
        my $idle = AnyEvent->now - $self->last_active;
        warn "idle check, idle; ${idle}s\n";
        if ( $idle > $self->idle_timeout ) {
            $self->remove;
        }
    } ) );

    return;
}

sub subscribe {
    my $self = shift;
    
    return unless ( @_ );

    $self->active;
    $mq_manager->subscribe( $self->id, @_ );

    $self->channels->{ $_[0] } = undef;

    return;
}

sub unsubscribe {
    my $self = shift;
    
    return unless ( @_ );

    $self->active;
    $mq_manager->unsubscribe( $self->id, @_ );
    
    delete $self->channels->{ $_[0] };

    return;
}

sub publish {
    my $self = shift;

    return unless ( @_ );

    $self->active;
    $mq_manager->publish( @_, $self->id );

    return;
}

sub fetch {
    my $self = shift;
    
    $self->active;
    $self->available( 1 );

    return;
}

sub do_resume {
    my $self = shift;

    my $resume = $self->resume_cb;
    return unless ( $resume );
    
    $self->available( 0 );

    $resume->( $self->id, @_ );

    # XXX remove resume callback?

    return;
}

sub remove {
    my $self = shift;
    
    $mq_manager->remove_client( $self );
    my $cid = $self->id;

    foreach ( keys %{ $self->channels } ) {
        warn "unsub channel:".$_;
        my $ch = $mq_manager->get_channel( $_ ) || next;
        warn "unsub channel obj:".$ch;
        $ch->unsubscribe( $cid );
    }
    
    $self->do_resume;
    $self->resume_cb( undef );
    $self->timer( undef );
    $self->idle_timer( undef );
    
    warn "destroying client\n";
    my $cleanup = delete $self->{on_cleanup};
    $cleanup->( $self->id ) if $cleanup;

    warn Data::Dumper->Dump([$self],['client']);

    return;
}

sub active {
    my $self = shift;

    $self->last_active( AnyEvent->now );

    return;
}

sub pull {
    my $self = shift;

    my $cid = $self->id;
    my @events;
    foreach my $channel ( keys %{ $self->channels } ) {
        my $ch = $mq_manager->get_channel( $channel ) || next;
        my $e = $ch->pull( $cid );
        # [ data, cid ]
        push( @events, map { { channel => $channel, data => $_->[0], type => 'channel' } } @$e );
    }
    warn "Pulled Events: ".Data::Dumper->Dump([\@events])."\n";

    return \@events;
}

1;
