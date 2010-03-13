package Bootstrapper;

use strict;
use warnings;

use FindBin;
use File::Spec;

sub catfile {
    return File::Spec->catfile( @_ );
}

# config files will be loaded during CometDesktop::startup()
our @configs;

BEGIN {
    my $p = "$FindBin::Bin/..";

    foreach my $d ( "/libs", "/libs/plugins" ) {
        my $path = catfile( $p, $d );
        opendir( my $dh, $path ) or die "could not opendir $path: $!";
        my @dirs = grep {
            my $t = catfile( $path, $_ );
            !/^\./ &&
            !/^plugins$/ &&
            !/^mojo-origin$/ &&
            ( -d $t || -l $t )
        } readdir( $dh ) or die "could not readdir $path: $!";
        closedir( $dh );

        foreach ( "mojo-origin", sort { $a cmp $b } @dirs ) {
            local $_ = catfile( $path, $_ );
            my $lib = catfile( $_, 'lib' );
            my $conf = catfile( $_, 'plugin.conf' );
            push( @configs, $conf ) if ( -e $conf );
            eval( qq|use lib '$_';| );
            eval( qq|use lib '$lib';| ) if ( -d $lib );
        }
    }
}

1;
