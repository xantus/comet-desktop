package CometDesktop::IrcExample;

use strict;
use warnings;

use base 'CometDesktop::Controller';

use Mojo::IOLoop;
use bytes;

# The loop
my $loop = Mojo::IOLoop->singleton;

# Connection list
my $c = {};

sub irc_proxy {
    my $client = shift;

    my ( $irc_server, $irc_port ) = @{$client->config->{plugin_irc_example}}{qw( irc_server irc_port )};

    app->log->debug( "client connected, connecting to $irc_server" );

#    $client->send_message( "Connecting to $irc_server" );

    $c->{$client}->{buffer} = '';

    $client->finished(sub {
        app->log->debug( "client finished, dropping conneciton to irc server" );
        $loop->drop( $c->{$client}->{outbound_conn} )
            if $c->{$client}->{outbound_conn};

        delete $c->{$client};
        return;
    });

    $client->receive_message(sub {
        $c->{$client}->{buffer} ||= '';
        $c->{$client}->{buffer} .= $_[1]; # chunk

        $loop->writing( $c->{$client}->{outbound_conn} )
            if $c->{$client}->{outbound_conn} && length $c->{$client}->{buffer};
    });

    my $server = $c->{$client}->{irc} = $loop->connect(
        address => $irc_server,
        port    => $irc_port,
        cb      => sub {
            app->log->debug( "Connected to $irc_server" );
#            $client->send_message( "Connected to $irc_server" );

            $c->{$client}->{outbound_conn} = $_[1]; # servecr
            $loop->writing( $_[1] ) if length $c->{$client}->{buffer};
        }
    );

    $loop->read_cb($server => sub {
        $client->send_message( $_[2] ); # chunk
    });

    $loop->write_cb($server => sub {
        $loop->not_writing( $server );
        return delete $c->{$client}->{buffer};
    });

    $loop->connection_timeout( $server => 600 );

    $loop->error_cb($server => sub {
        app->log->debug( "Disconnected from $irc_server (connection error)" );
        $loop->drop( $client->tx->connection );
        delete $c->{$client};
        return;
    });

    $loop->hup_cb($server => sub {
        app->log->debug( "Disconnected from $irc_server (hangup)" );
        $loop->drop( $client->tx->connection );
        delete $c->{$client};
        return;
    });

    return;
};

1;
