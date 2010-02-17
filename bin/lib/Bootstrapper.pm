package Bootstrapper;

use strict;
use warnings;

use FindBin;
use File::Spec;

sub catfile {
    return File::Spec->catfile( @_ );
}

my @configs;

BEGIN {
    my $p = "$FindBin::Bin/..";

    foreach my $d ( "/libs", "/libs/plugins" ) {
        my $path = catfile( $p, $d );
        opendir( my $dh, $path ) or die "could not opendir $path: $!";
        my @dirs = grep {
            local $_ = catfile( $path, $_ );
            !/^\./ &&
            !/^plugins$/ &&
            ( -d || -l )
        } readdir( $dh ) or die "could not readdir $path: $!";
        closedir( $dh );

        foreach ( sort { $a cmp $b } @dirs ) {
            local $_ = catfile( $path, $_ );
            my $lib = catfile( $_, 'lib' );
            eval( qq|use lib "$_";| );
            eval( qq|use lib "$lib";| ) if ( -d $lib );
            push( @configs, $_ ) if ( -e catfile( $_, 'config.json' ) );
        }
    }
    foreach ( @configs ) {
        # TODO
    }
}

1;
