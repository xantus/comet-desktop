use warnings;
use strict;

use lib qw( lib mojo-lib );

use ExtUtils::MakeMaker;

#open(FH, ">>Changes") and close FH;

WriteMakefile(
    NAME          => 'CometDesktop',
    AUTHOR        => 'David Davis <xantus@xantus.org>',
    ABSTRACT      => 'CometDesktop, web desktop',
    VERSION_FROM  => 'lib/CometDesktop.pm', # finds $VERSION
    PREREQ_PM => {
        'Mojo'            => 0.991250,
        'DBIx::Simple'    => 0,
#        'Digest::SHA'    => 0,
#        'Digest::SHA::PurePerl'    => 0,
    },
    dist => {
        COMPRESS  => 'gzip -9f',
        SUFFIX    => 'gz',
#        PREOP     => (
#            'svn-log.perl | tee ./$(DISTNAME)-$(VERSION)/CHANGES > ./CHANGES'
#        ),
    },
);
