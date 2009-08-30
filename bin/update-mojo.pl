#!/usr/bin/perl

use strict;
use warnings;

my @cleanup;
if ( !-d 'temp' ) {
    mkdir( 'temp' );
    push(@cleanup, 'rmdir temp');
}

my $file = 'temp/mojo.tar.gz';

system("rm $file") if ( -s $file == 0 );

system("wget http://github.com/kraih/mojo/tarball/master -O $file") if ( !-e $file );

my $data = `tar -tzf $file`;
push(@cleanup, "rm $file");

#/kraih-mojo-a81013582c7ceb17ed9d761d767366d821783128/
my ( $hash ) = ( $data =~ m~^(kraih-mojo-[^/]+)/~ );

die "error finding hash in tar file" unless $hash;

if ( !-e $hash ) {
    system("ln -s mojo $hash");
    push(@cleanup, "rm $hash");
}

system("tar zxvf $file");

my $t = `svn stat mojo`;
my %done;
while ( $t =~ s/^(\?)\s+(\S+)//m ) {
    next unless $2;
    my $f = $2;
    print "adding file: $f\n";
    
    my $path = '';
    foreach ( split( '/', $f ) ) {
        $path .= ( $path eq '' ) ? $_ : "/$_";
        next if $done{$path}++;
#        print "path: $path\n";
        `svn add $path 2>&1`;
    }
}

foreach (reverse @cleanup) { system($_); }

print "done. check svn stat, and commit now\n";
