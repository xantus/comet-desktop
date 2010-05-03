package CometDesktop::WebsocketProxy;

use Time::HiRes;
use Data::Dumper;

use base 'CometDesktop::Controller';

my $loop = Mojo::IOLoop->singleton;

my $connections = {};
my $waiting = {};

sub proxy {
    my $self = shift;

    my $sid = $self->session( 'psid' );

    if ( defined $sid ) {
        warn "returning session: $sid\n";
    } else {
        $sid = $self->sha1_hex( time() . ( $self->req->headers->user_agent || '' ) . rand( 1_000_000_000 ) );
        warn "new session $sid\n";
        $self->session( psid => $sid );
        $self->render_json({ sid => $sid });
        return;
    }

    if ( $self->param( 'wake' ) ) {
        if ( $connections->{ $sid } && $waiting->{ $sid } ) {
            $waiting->{ $sid }->();
            $self->render_json({ wake => 1 });
            return;
        }
        $self->render_json({ wake => 0 });
        return;
    }

    my $cl = $connections->{ $sid };
    if ( !$cl ) {
        $cl = $connections->{ $sid } = {};
    }

#    if ( $self->param( 'reset' ) ) {
#        foreach my $id ( keys %$cl ) {
#            $cl->{ $id }->{client}->finish() if ( $cl->{ $id }->{client} );
#            delete $cl->{ $id };
#        }
#        # XXX allow it to wake, or just remove it?
#        $waiting->{ $sid }->() if ( $waiting->{ $sid } );
#    }

    my @events;
    if ( my $ev_in = $self->param( 'ev' ) ) {
        @events = @{ $self->json_decode( $ev_in ) };
    }

    if ( @events ) {
        warn "events: ".Data::Dumper->Dump([\@events]);

        foreach ( @events ) {
            my ( $id, $data ) = @$_;

            foreach my $in ( @$data ) {
                my $action = shift @$in;
                warn "$id - action: $action\n";

                if ( $action eq 'open' ) {
                    # hard limit of 5 concurrent connections
                    if ( scalar( keys %$cl ) > 5 ) {
                        $cl->{ $id }->{events} = [ { id => $id, ev => 'close' } ];
                        next;
                    }

                    if ( $cl->{ $id } ) {
                        warn "closing already opened client\n";
                        $cl->{ $id }->{client}->finish()
                            if ( $cl->{ $id }->{client} );
                    } else {
                        $cl->{ $id } = {
                            events => [],
                            buffer => [],
                        };
                    }

                    Mojo::Client->singleton->async->websocket( $in->[ 0 ] => sub {
                        my $ws = shift;
                        warn "CLIENT CONNECTED ------------------------------- $id: ".$ws->tx->is_websocket."\n";
                        unless ( $ws->tx->is_websocket ) {
                            push( @{ $cl->{ $id }->{events} }, { ev => 'close' } );
                            delete $cl->{ $id }->{client};
                            $ws->finish;
                            $waiting->{ $sid }->() if ( $waiting->{ $sid } );
                            return;
                        }
                        $cl->{ $id }->{client} = $ws->tx;

                        push( @{ $cl->{ $id }->{events} }, { ev => 'open' } );
                        $ws->receive_message(sub {
                            warn "CLIENT RECEIVED =========================== $id\n";
                            warn "$id received $_[1]";
                            push( @{ $cl->{ $id }->{events} }, { ev => 'message', msg => $_[1] } );
                            $waiting->{ $sid }->() if ( $waiting->{ $sid } );
                            return;
                        });
                        $ws->finished(sub {
                            warn "CLIENT FINSHED !!!!!!!!!!!!!!!!!!!!!!!!!!!! $id\n";
                            $cl->{ $id }->{closed} = 1;
                            push( @{ $cl->{ $id }->{events} }, { ev => 'close' } );
                            delete $cl->{ $id }->{client};
                            $waiting->{ $sid }->() if ( $waiting->{ $sid } );
                            return;
                        });
                        if ( @{ $cl->{ $id }->{buffer} } ) {
                            warn "sending buffered msgs $id\n";
                            foreach ( @{ $cl->{ $id }->{buffer} } ) {
                                $ws->send_message( $_ );
                            }
                            $cl->{ $id }->{buffer} = [];
                        }
                        $waiting->{ $sid }->() if ( $waiting->{ $sid } );
                    })->process;

                    next;
                }

                if ( $action eq 'send' ) {
                    unless ( $cl->{ $id } ) {
                        $cl->{ $id } = {
                            events => [],
                            buffer => [],
                        };
                    }
                    if ( $cl->{ $id }->{client} && $cl->{ $id }->{client}->is_websocket ) {
                        $cl->{ $id }->{client}->send_message( $in->[ 0 ] || '' );
                    } else {
                        push( @{ $cl->{ $id }->{buffer} }, $in->[ 0 ] || '' );
                    }
                    # XXX
                    next;
                }

                if ( $action eq 'close' ) {
                    if ( $cl->{ $id } && $cl->{ $id }->{client} ) {
                        $cl->{ $id }->{client}->finish();
                    }
                    delete $cl->{ $id };
                    next;
                }
            }
        }
    }

#    $waiting->{ $sid }->() if ( $waiting->{ $sid } );

    if ( keys %$cl ) {
        my @out = get_events( $sid );
        if ( @out ) {
            $self->render_json({ ws => \@out });
            return;
        }
    }

    # (connections could have been cleaned up above)
    unless ( keys %$cl ) {
        warn "no connections\n";
        # no connections active, send them away
        $self->render_json({ bye => 1 });
        return;
    }

    if ( !$waiting->{ $sid } ) {
        # wait for something to happen
        $self->pause();
        $loop->connection_timeout( $self->tx->connection => 45 );

        $waiting->{ $sid } = sub {
            warn "waking session: $sid\n";
            delete $waiting->{ $sid };
            my $id = $self->stash( 'timer_id' );
            delete $loop->{_ts}->{ $id } if $id;
            $self->resume();
            my @out = get_events( $sid );
            if ( @out ) {
                $self->render_json({ ws => \@out });
            } else {
                $self->render_json({});
            }
            return;
        };

        my $id = $loop->timer( 30 => sub {
            warn "timer fired, resuming $sid";
            $waiting->{ $sid }->() if ( $waiting->{ $sid } );
        });
        warn "starting wait using timer: $id\n";
        $self->stash( timer_id => $id );

        return;
    }

    $self->render_json({ wait => 0 });
    return;
}


sub get_events {
    my $sid = shift;
    my @out;

    my $cl = $connections->{ $sid };
    return @out unless ( defined $cl );

    foreach my $id ( keys %$cl ) {
        next unless ( @{ $cl->{ $id }->{events} } );

        push( @out, { id => $id, el => delete $cl->{ $id }->{events} } );

        if ( $cl->{ $id }->{closed} ) {
            delete $cl->{ $id };
            next;
        }

        $cl->{ $id }->{events} = [];
    }

    warn "get events: ".Data::Dumper->Dump([ \@out ],[ 'out' ]);
    return @out;
}

1;
