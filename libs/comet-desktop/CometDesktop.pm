package CometDesktop;

use strict;
use warnings;

use CometDesktop::Session;
use CometDesktop::Controller;
use DBI;
use DBIx::Simple;

use base 'Mojolicious';

our $VERSION = '0.01';

#__PACKAGE__->attr(
#    'session' => (
#        chained => 1,
#        default => sub { CometDesktop::Session->new }
#    )
#);

# This method will run for each request
sub process {
    my ( $self, $c ) = @_;

    # set the mojo version
    $c->res->headers->header( 'X-Powered-By' => 'Mojo/'.$Mojo::VERSION );

    # set the connection id
    if ( my $sock = UNIVERSAL::can( $c->tx->connection, 'sock' ) ) {
        # anyevent specific
        $c->res->headers->header( 'X-Mojo-Connection' => $1 )
            if ( "$sock" =~ m/\(0x([^\)]+)\)$/ );
    }
    
    my $home = Mojo::Home->new->detect( __PACKAGE__ );

    # database
    # TBD, move this
    my $dbh = DBI->connect( "dbi:SQLite2:dbname=$home/db/main.db" )
        or die 'DBI connect failed';

    # session
    $c->session->tx( $c->tx )->store->dbh( $dbh );

    # dbix
    my $db = DBIx::Simple->connect( $dbh )
        or die DBIx::Simple->error;

    # user class, weak ref to dbix
    $c->user->db( $db );

    $c->db( $db );

    $self->dispatch( $c );
}

sub prod_mode {
    my $self = shift;

    $self->log->level( 'info' );
}

sub development_mode {
    my $self = shift;

    $self->log->level( 'debug' );
}

# This method will run once at server start
sub startup {
    my $self = shift;

    # Use our own controller
    $self->controller_class( 'CometDesktop::Controller' );
    
    # Auth Bridge
    my $auth = $self->routes->bridge->to(
        controller => 'auth',
        action => 'auth'
    );

    $auth->route( '/login' )->via( 'get' )->to(
        controller => 'auth',
        action => 'login'
    )->name( 'login' );

    $auth->route( '/login' )->via( 'post' )->to(
        controller => 'auth',
        action => 'login_post'
    );

    $auth->route( '/logout' )->via( 'get' )->to(
        controller => 'auth',
        action => 'logout'
    )->name( 'logout' );
    
    $auth->route( '/desktop' )->via( 'get' )->to(
        controller => 'desktop',
        action => 'root'
    )->name( 'desktop' );
    
    $auth->route( '/' )->via('get')->to(
        controller => 'auth',
        action => 'root'
    )->name( 'root' );
    
    return;
}

1;
