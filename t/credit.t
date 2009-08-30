#!/usr/bin/perl

use strict;
use warnings;

use Mojo::Client;
use Mojo::Transaction;
use Test::More tests => 5;

use_ok('CometDesktop');

# Prepare client and transaction
my $client = Mojo::Client->new;
my $tx     = Mojo::Transaction->new_get('/');

# Process request
$client->process_app('CometDesktop', $tx);

# Test response
is($tx->res->code, 200);
is($tx->res->headers->content_type, 'text/html');
my $data = $tx->res->content->file->slurp;
like($data, qr/David Davis/i);
like($data, qr/xantus/i);
