package CometDesktop;

use strict;
use warnings;

use CometDesktopX::Session;
use CometDesktop::Controller;
use DBI;
use DBIx::Simple;
use File::Spec;

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

    $self->_load_config;
    $self->_add_hooks;
    $self->_set_routes;
    $self->_configure_apps;

    return;
}

sub _add_hooks {
    my $self = shift;

    $self->plugins->add_hook(
        after_static_dispatch => sub {
            my $c = $_[ 1 ];

            # a file is about to be served, skip db and user obj setup
            return if $c->res->code;

            # database
            my $dbh = DBI->connect( @{$config}{qw( db_interface db_user db_pass )} )
                or die 'DBI connect failed';

            # session
            $c->session_store->store->dbh( $dbh );

            # dbix
            my $db = DBIx::Simple->connect( $dbh )
                or die DBIx::Simple->error;

            $c->db( $db );

            # user class, holds weak ref to ctx
            $c->user->init( $c );
        }
    )->add_hook(
        after_dispatch => sub {
            my $c = $_[ 1 ];

            if ( $c->db ) {
                warn "disconnecting from db\n";
                $c->db->disconnect;

                $c->db( undef );
                $c->user( undef );
            }
        }
    );

    return;
}

sub _load_config {
    my $self = shift;

    # Use our own controller
    $self->controller_class( 'CometDesktop::Controller' );

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

    foreach( @{$config->{mojo_plugins}} ) {
        s/-/_/g;
        next if ( $_ eq 'static_fallback' );
        warn "loading plugin:$_\n" if ( $self->mode eq 'development' );
        $self->plugin( $_, $config );
    }

    if ( $config->{enable_stderr_log_redirect} ) {
        my $log = $self->log;
        # see EOF
        tie *STDERR, 'Tie::Callback', sub {
            my $line = "STDERR: ----------- $_[1]"; chomp( $line );
            # TODO, use goto so the call stack is jumped a level
            $log->debug( $line );
        } unless tied *STDERR;
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

    # sessions
    $self->secret( $config->{mojo_session_secret} )
        if ( $config->{mojo_session_secret} );
    $self->session->cookie_name( $config->{mojo_session_cookie_name} )
        if ( $config->{mojo_session_cookie_name} );
    $self->session->cookie_path( $config->{mojo_session_cookie_path} )
        if ( $config->{mojo_session_cookie_path} );
    $self->session->cookie_domain( $config->{mojo_session_cookie_domain} )
        if ( $config->{mojo_session_cookie_domain} );
    $self->session->default_expiration( $config->{mojo_session_default_expiration} )
        if ( defined $config->{mojo_session_default_expiration} );

    return;
}

sub _configure_apps {
    my $self = shift;

    my $db = DBIx::Simple->connect( @{$config}{qw( db_interface db_user db_pass )} )
        or die DBIx::Simple->error;

    $config->{cometdesktop_apps} = $db->query( 'SELECT * FROM apps' )->hashes;

    $db->disconnect;

    my $static = $self->plugin( static_fallback => $config );

    foreach( @{$config->{cometdesktop_apps}} ) {
        warn "configuring app $_->{app_id} : $_->{app_name} : $_->{app_desc}\n";
        my $dir = $self->home->rel_dir( File::Spec->catfile( 'apps', $_->{app_name} ) );
        my $public = File::Spec->catfile( $dir, 'public' );
        my $routes = File::Spec->catfile( $dir, 'routes.conf' );
        if ( -d $public ) {
            warn "adding static fallback for apps/$_->{app_name}/ to $public\n";
            $static->add( "/desktop/apps/$_->{app_name}/" => $public );
        }
#        if ( -e File::Spec->catfile( $dir, 'plugin.conf' ) ) {
#            my $plug = $_->{app_name}; $plug =~ s/-/_/g;
#            $self->plugin( $plug, $config );
#        }
        $self->_set_app_routes( $_, $routes ) if ( -e $routes );
    }

    if ( $self->mode eq 'development' ) {
        require Data::Dumper;
        warn Data::Dumper->Dump([$config],['config']);
    }

    return;
}

sub _set_app_routes {
    my ( $self, $app_info, $file ) = @_;

    $app_info->{app_path} = "/desktop/apps/$app_info->{app_name}/";

    warn "route for $app_info->{app_path}\n";

#    my $base = $self->routes->route( $app_info->{app_path} );
    my $base = $self->routes;

    my $cfg = $self->_json_config( $file, { %$app_info, routes => $base } );
    $cfg = [$cfg] if defined $cfg && ref $cfg eq 'HASH';

    $app_info->{routes} = $cfg;

    if ( $self->mode eq 'development' ) {
        warn Data::Dumper->Dump([$cfg],[$app_info->{app_name}.'_routes']);
    }

    return unless defined $cfg && ref $cfg eq 'ARRAY';

    foreach ( @$cfg ) {
        $_->{route} ||= '';
        $_->{route} =~ s/^\///g if $_->{route} =~ m/^\//;
        my $r = $base->route( $app_info->{app_path}.$_->{route} );
        $r->parse( $_->{parse} ) if $_->{parse};
        $r->pattern( $_->{pattern} ) if $_->{pattern};
        $r->conditions( $_->{conditions} ) if $_->{conditions};
        $r->over( $_->{over} ) if $_->{over};
        $r->to( $_->{to} ) if $_->{to};
        my $defaults ||= {};
        $defaults->{controller} = $_->{controller} if $_->{controller};
        $defaults->{action} = $_->{action} if $_->{action};
        $r->to( $defaults ) if keys %$defaults;
        $r->via( $_->{via} ) if $_->{via};
        $r->name( $_->{name} ) if $_->{name};
        $r->inline( 1 ) if $_->{inline};
        $r->websocket( 1 ) if $_->{websocket};
    }

    return;
}

sub _set_routes {
    my $self = shift;

    $self->routes->route( '/' )->via( 'get' )->to({ callback => sub { shift->redirect_to( '/desktop/' ) } });
    $self->routes->route( '/desktop' )->via( 'get' )->to( 'desktop#root' )->name( 'desktop' );
    $self->routes->route( '/desktop/login' )->via( 'post' )->to( 'desktop#login' );
    $self->routes->route( '/desktop/logout' )->via( 'post' )->to( 'desktop#logout' );

    return;
}

sub _json_config {
    my ( $self, $file, $template ) = @_;

    # Slurp UTF-8 file
    open FILE, "<:encoding(UTF-8)", $file
      or die qq/Couldn't open config file "$file": $!/;
    my $encoded = do { local $/; <FILE> };
    close FILE;

    # Instance
    my $prepend = 'my $app = shift;';

    # Be less strict
    $prepend .= q/no strict 'refs'; no warnings 'redefine';/;

    # Helper
    $prepend .= "sub app; *app = sub { \$app };";

    # Be strict again
    $prepend .= q/use strict; use warnings;/;

    # Render
    my $mt = Mojo::Template->new($template || {});
    $mt->prepend($prepend);
    $encoded = $mt->render($encoded, $self);

    # Parse
    my $json   = Mojo::JSON->new;
    my $config = $json->decode($encoded);
    my $error  = $json->error;
    die qq/Couldn't parse config file "$file": $error/ if !$config && $error;

    return $config;
}

1;

package Tie::Callback;

use strict;
use warnings;

sub PRINT {
    shift->( @_ );
}

sub TIEHANDLE {
    bless pop, shift;
}

sub BINMODE {}

1;
