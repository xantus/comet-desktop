use FindBin;
use lib "$FindBin::Bin/lib";

$ENV{MOJO_HOME} = "$FindBin::Bin/../" unless exists $ENV{MOJO_HOME};

use Bootstrapper; # in bin/lib

use Mojo::Server::PSGI;

my $psgi = Mojo::Server::PSGI->new(app_class => 'CometDesktop');
my $app = sub { $psgi->run(@_) };
