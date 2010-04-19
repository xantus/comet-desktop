package Mojolicious::Plugin::MultiConfig;

use strict;
use warnings;

use base 'Mojolicious::Plugin';

require File::Basename;
require File::Spec;

use Mojo::JSON;
use Mojo::Template;

sub register {
    my ( $self, $app, $conf ) = @_;

    # This Plugin config
    $conf ||= {};

    # App config
    my $config = { %{ $conf->{config} } } || {};

    $conf->{files} = [ $conf->{file} ] if $conf->{file};

    unless ($conf->{files}) {
        # Basename
        my $file = File::Basename::basename($0);

        # Remove .pl, .p6 and .t extentions
        $file =~ s/(?:\.p(?:l|6))|\.t$//i;

        # Default extension
        $file .= '.json';

        $conf->{files} = [ $file ];
    }

    foreach my $file ( @{ $conf->{files} } ) {
        $self->merge_config( $config, $self->load_config( $app, $file, $conf ) );
    }

    # Stash key
    my $stash_key = $conf->{stash_key} || 'config';

    # Merge
    $config = {%{$conf->{default}}, %$config} if $conf->{default};

    # Add hook
    $app->plugins->add_hook(
        before_dispatch => sub {
            my ($self, $c) = @_;

            # Stash
            $c->stash( $stash_key => $config );
        }
    ) unless $conf->{disable_hook};

    return $config;
}

sub merge_config {
    my ( $self, $config, $merge ) = @_;

    while( my ( $k, $v ) = each( %$merge ) ) {
        # merge 1st level
        if ( ref( $v ) eq 'ARRAY' ) {
            $config->{$k} = [] unless  $config->{$k};
            push( @{$config->{$k}}, @$v );
        } elsif ( ref( $v ) eq 'HASH' ) {
            $config->{$k} = {} unless $config->{$k};
            @{ $config->{$k} }{ keys %$v } = values %$v;
        } else {
            $config->{$k} = $v;
        }
    }
}

sub load_config {
    my ( $self, $app, $file, $conf ) = @_;

    $conf ||= {};

    # Absolute path
    $file = $app->home->rel_file($file)
      unless File::Spec->file_name_is_absolute($file);

    # Read config file
    my $config = {};
    my $template = $conf->{template} || {};
    if (-e $file) { $config = $self->_read_config($file, $template, $app, $conf) }

    # Check for default
    else {

        # All missing
        die qq/Config file "$file" missing, maybe you need to create it?\n/
          unless $conf->{default};

        # Debug
        $app->log->debug(
            qq/Config file "$file" missing, using default config./);
    }

    return $config;
}

sub _read_config {
    my ($self, $file, $template, $app, $conf) = @_;

    # Debug
    $app->log->debug(qq/Reading config file "$file"./);

    # Slurp UTF-8 file
    open FILE, "<:encoding(UTF-8)", $file
      or die qq/Couldn't open config file "$file": $!/;
    my $encoded = do { local $/; <FILE> };
    close FILE;

    my $json   = Mojo::JSON->new;

    # Instance
    my $prepend = 'my $app = shift;';
    $prepend .= 'my $_self = shift;';
    $prepend .= 'my $_json = shift;';
    $prepend .= 'my $_files = shift;';

    # Be less strict
    $prepend .= q/no strict 'refs'; no warnings 'redefine';/;

    # Helper
    $prepend .= "sub app; *app = sub { \$app };";

    # Include helper
    $prepend .= "sub include; *include = sub { return unless \@_; push( \@{\$_files}, \@_ ); };";

    $prepend .= "sub inline; *inline = sub { return \$_json->encode( \$_self->load_config( \$app, \$_[0] ) ); };";

    # Be strict again
    $prepend .= q/use strict; use warnings;/;

    # Render
    my $mt = Mojo::Template->new($template);
    $mt->prepend($prepend);
    $encoded = $mt->render($encoded, $app, $self, $json, $conf->{files});
    my $config = $json->decode($encoded);
    my $error  = $json->error;
    die qq/Couldn't parse config file "$file": $error : $encoded/ if !$config && $error;

    return $config;
}

1;
__END__

=head1 NAME

Mojolicious::Plugin::MultiConfig - JSON Configuration Plugin for multiple files (merged)

=head1 SYNOPSIS

    # myapp.json
    {
        "foo"       : "bar",
        "music_dir" : "<%= app->home->rel_dir('music') %>"
    }

    # Mojolicious
    $self->plugin('json_config');

    # Mojolicious::Lite
    plugin 'json_config';

    # Reads myapp.json by default and puts the parsed version into the stash
    my $config = $self->stash('config');

    # Everything can be customized with options
    my $config = plugin json_config => {
        files      => [
            '/etc/myapp.conf',
            '/etc/myapp_plugins.conf'
        ],
        stash_key => 'conf',
        disable_hook => 1, # disable stash plugin hook
    };

=head1 DESCRIPTION

L<Mojolicous::Plugin::MultiConfig> is a JSON configuration plugin that
preprocesses it's input with L<Mojo::Template>.

The application object can be accessed via C<$app> or the C<app> helper.

=head1 OPTIONS

=head2 C<default>

    # Mojolicious::Lite
    plugin multi_config => {default => {foo => 'bar'}};

=head2 C<file>

    # Mojolicious::Lite
    plugin multi_config => {files => [ 'myapp.conf' ]};
    plugin multi_config => {file => '/etc/foo.json' }; # single file

By default C<myapp.json> is searched in the application home directory.

=head2 C<stash_key>

    # Mojolicious::Lite
    plugin multi_config => {stash_key => 'conf'};

=head2 C<template>

    # Mojolicious::Lite
    plugin multi_config => {template => {line_start => '.'}};

=head1 METHODS

L<Mojolicious::Plugin::MultiConfig> inherits all methods from
L<Mojolicious::Plugin> and implements the following new ones.

=head2 C<register>

    $plugin->register;

Register plugin hooks in L<Mojolicious> application.

=head1 SEE ALSO

L<Mojolicious>, L<Mojolicious::Guides>, L<http://mojolicious.org>.

=cut
