package CometDesktop;

use strict;
use warnings;

use CometDesktop::Session;
use CometDesktop::Controller;
use DBI;
use DBIx::Simple;
use Scalar::Util 'weaken';

use base 'Mojolicious';

our $VERSION = '0.01';
our $config = {};

# This method will run for each request
sub process {
    my ( $self, $c ) = @_;

    # set the mojo version
    $c->res->headers->header( 'X-Powered-By' => 'Mojo/'.$Mojo::VERSION );

    if ( $self->mode eq 'development' ) {
        # set the connection id, useful for debugging
        $c->res->headers->header( 'X-Mojo-Connection' => $1 )
            if ( $c->tx->connection =~ m/\(0x([^\)]+)\)$/ );
    }

    # database
    my $dbh = DBI->connect( @{$config}{qw( db_interface db_user db_pass )} )
        or die 'DBI connect failed';

    # session
    $c->session->tx( $c->tx )->store->dbh( $dbh );

    # dbix
    my $db = DBIx::Simple->connect( $dbh )
        or die DBIx::Simple->error;

    # user class, weak ref to dbix
    $c->user->db( $db );

    weaken $db;

    $c->db( $db );

    $c->stash( config => $config );

    $self->dispatch( $c );
}

sub production_mode {
    shift->log->level( 'error' );
}

sub development_mode {
    shift->log->level( 'debug' );
}

# This method will run once at server start
sub startup {
    my $self = shift;

    $config = {};

    # merge config from plugins, and main one last
    foreach (
        $self->home.'/etc/comet-desktop.conf',
        @Bootstrapper::configs
    ) {
        my $conf = $self->plugin( json_config => { file => $_ } );
        while( my ( $k, $v ) = each( %$conf ) ) {
            # merge 1st level
            if ( ref( $v ) eq 'ARRAY' ) {
                $config->{$k} = [] unless  $config->{$k};
                push( @{$config->{$k}}, @$v );
            } elsif ( ref( $v ) eq 'HASH' ) {
                $config->{$k} = {} unless $config->{$k};
                @{ $config->{$k} }{ keys %$v } = values %$v;
            } else {
                $config->{$k} = $v;
            }
        }
    }

    if ( $config->{mojo_plugins} ) {
        foreach( @{$config->{mojo_plugins}} ) {
            $self->plugin( $_, $config );
        }
    }

    require Data::Dumper;
    warn Data::Dumper->Dump([$config],['config']);

    # template helper <%= ext_path %>
    # TBD get this from a config file
    $self->renderer->add_helper(
        ext_version => sub { $config->{ext_version} }
    );

    if ( $config->{mojo_types} ) {
        while( my ( $k, $v ) = each %{$config->{mojo_types}} ) {
            $self->types->type( $k => $v );
        }
    }

    # Use our own controller
    $self->controller_class( 'CometDesktop::Controller' );

    # Auth Bridge
    my $auth = $self->routes->bridge->to( 'auth#auth' );

    # TBD use method check in auth#login
    $auth->route( '/login' )->via( 'get' )->to( 'auth#login' )->name( 'login' );
    $auth->route( '/login' )->via( 'post' )->to( 'auth#login_post' );

    $auth->route( '/logout' )->via( 'get' )->to( 'auth#logout' )->name( 'logout' );

    $auth->route( '/desktop' )->via( 'get' )->to( 'desktop#root' )->name( 'desktop' );

    $auth->route( '/' )->via('get')->to( 'auth#root' )->name( 'root' );

    return;
}

1;
