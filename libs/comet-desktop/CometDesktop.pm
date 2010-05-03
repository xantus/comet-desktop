package CometDesktop;

use strict;
use warnings;

use CometDesktop::Session;
use CometDesktop::Controller;
use DBI;
use DBIx::Simple;
use Scalar::Util 'weaken';

use base 'Mojolicious';

our $VERSION = '2.01';
our $config = {};

# This method will run for each request
sub process {
    my ( $self, $c ) = @_;

    $c->config( $config );

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
    $c->session_store->tx( $c->tx )->store->dbh( $dbh );

    # dbix
    my $db = DBIx::Simple->connect( $dbh )
        or die DBIx::Simple->error;

    # user class, weak ref to dbix
    $c->user->db( $db );

    weaken $db;

    $c->db( $db );

    $self->dispatch( $c );
}

sub production_mode {
    shift->log->level( 'error' );
}

sub development_mode {
    # default mode
    shift->log->level( 'debug' );
}

# This method will run once at server start
sub startup {
    my $self = shift;

    $config = $self->plugin( multi_config => {
        files => [
            'etc/comet-desktop.conf',
            @Bootstrapper::configs
        ],
        config => {
            mojo_plugins => [],
            mojo_types => {},
            cometdesktop_plugins => [],
        },
        stash_key => 'config'
    });

    my $static = $self->plugin( static_fallback => $config );

    foreach( @{$config->{mojo_plugins}} ) {
        s/-/_/g;
        next if ( $_ eq 'static_fallback' );
        warn "loading plugin:$_\n" if ( $self->mode eq 'development' );
        $self->plugin( $_, $config );
    }

    foreach( @{$config->{cometdesktop_apps}} ) {
        warn "configuring app $_\n";
        my $dir = $self->home->rel_dir( "apps/$_/public" );
        if ( -d $dir ) {
            warn "adding static fallback for /apps/$_/ to $dir\n";
            $static->add( "/apps/$_/" => $dir );
        }
        s/-/_/g;
        $self->plugin( $_, $config );
    }

    if ( $self->mode eq 'development' ) {
        require Data::Dumper;
        warn Data::Dumper->Dump([$config],['config']);
    }

    # use our json encoder
    $self->renderer->add_handler(
        json => sub {
            my ( $r, $c, $output, $options ) = @_;
            # uses the faster JSON/JSON::XS encoder if available
            $$output = $c->json_encode( $options->{json} );
        }
    );

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

    $self->secret( $config->{mojo_session_secret} )
        if ( $config->{mojo_session_secret} );

    # Use our own controller
    $self->controller_class( 'CometDesktop::Controller' );

    # Auth Bridge
    #my $auth = $self->routes->bridge->to( 'auth#auth' );

    # TBD use method check in auth#login
    #$auth->route( '/login' )->via( 'get' )->to( 'auth#login' )->name( 'login' );
    #$auth->route( '/login' )->via( 'post' )->to( 'auth#login_post' );
    #$auth->route( '/logout' )->via( 'get' )->to( 'auth#logout' )->name( 'logout' );

    $self->routes->route( '/' )->via( 'get' )->to({ callback => sub { shift->redirect_to( '/desktop/' ) } });
    $self->routes->route( '/desktop' )->via( 'get' )->to( 'desktop#root' )->name( 'desktop' );
    $self->routes->route( '/desktop/login' )->via( 'post' )->to( 'desktop#login' );
    $self->routes->route( '/desktop/logout' )->via( 'post' )->to( 'desktop#logout' );

    return;
}

1;
