package CometDesktopX::Session;

use strict;
use warnings;

use MojoX::Session;
#use MojoX::Session::Transport::Cookie;
use MojoX::Session::Store::DBI;

use base 'MojoX::Session';

sub new {
    my $class = shift;
    $class->SUPER::new(
#        transport => MojoX::Session::Transport::Cookie->new,
        store => MojoX::Session::Store::DBI->new,
        expires_delta => 60 * 60 * 60 * 365,
        @_
    );
}

1;
