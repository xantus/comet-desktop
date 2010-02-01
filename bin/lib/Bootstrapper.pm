package Bootstrapper;

use FindBin;

BEGIN {
    my $p = "$FindBin::Bin/..";
    
    print "plugins: ";

    foreach my $d ( "$p/libs", "$p/libs/plugins" ) {
        opendir( my $dh, $d );
        my @dirs = grep {
            !/^\./ &&
            !/^plugins$/ &&
            ( -d "$d/$_" || -l "$d/$_" )
        } readdir( $dh );
        closedir( $dh );

        foreach ( sort { $a cmp $b } @dirs ) {
            print "$_ ";
            eval( "use lib \"$d/$_\";" );
            eval( "use lib \"$d/$_/lib\";" ) if ( -d "$d/$_/lib" )
        }
    }

    print "\n";
}

1;
