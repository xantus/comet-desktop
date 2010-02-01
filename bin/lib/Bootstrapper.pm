package Bootstrapper;

use FindBin;

BEGIN {
    my $p = "$FindBin::Bin/..";
    
    foreach my $d ( "$p/libs", "$p/libs/plugins" ) {
        opendir( my $dh, $d );
        my @dirs = grep {
            !/^\./ &&
            !/^plugins$/ &&
            ( -d "$d/$_" || -l "$d/$_" )
        } readdir( $dh );
        closedir( $dh );

        foreach ( sort { $a cmp $b } @dirs ) {
            eval( "use lib \"$d/$_\";" );
            eval( "use lib \"$d/$_/lib\";" ) if ( -d "$d/$_/lib" )
        }
    }
}

1;
