package CometDesktopX::User;

use strict;
use warnings;

use Digest::SHA1 qw( sha1_hex );
use Scalar::Util 'weaken';

use base 'Mojo::Base';

__PACKAGE__->attr([qw/
    ctx
    session_id
    logged_in
    user_id
    user_name

    _groups_cache
    _key_group_cache
/]);

sub new {
    my $class = shift;

    my $self = bless({
        logged_in => 0,
    }, $class || ref( $class ) );

    return $self;
}

sub init {
    my ( $self, $ctx ) = @_;

    $self->ctx( $ctx );

    weaken $ctx;

    if ( my $uid = $self->ctx->session( 'uid' ) ) {
        unless ( $self->load_by_uid( $uid ) ) {
            $self->ctx->session( uid => '' );
        }
    }
}

sub logout {
    my $self = shift;
    return unless ( $self->logged_in );

    $self->logged_in( 0 );
    $self->user_id( undef );
    $self->user_name( undef );
    $self->ctx->session( uid => '', logout => time() );

    return 1;
}

sub login_user {
    my ( $self, $user_name_in, $pw_token, $token ) = @_;

    # XXX lets figure out a way to not store password in plain text
    # but preserve the ability to use a hash based check

    my ( $user_id, $user_name, $user_pass ) = $self->ctx->db->query(qq|
        SELECT user_id, user_name, user_pass
        FROM users
        WHERE user_name=? LIMIT 1
    |, lc $user_name_in )->list;

    # user does not exist
    return unless $user_id;

    if ( $pw_token && sha1_hex( $token .':'. $user_pass ) eq $pw_token ) {
        $self->logged_in( 1 );
        $self->user_id( $user_id );
        $self->user_name( $user_name );
        $self->ctx->session( uid => $user_id, username => $user_name, logout => '' );
        return 1;
    }

    # incorrect password

    return;
}

sub load_user {
    my ( $self, $user_name_in ) = @_;

    my ( $user_id, $user_name ) = $self->ctx->db->query(qq|
        SELECT user_id, user_name
        FROM users
        WHERE user_name=? LIMIT 1
    |, lc $user_name_in )->list;

    # user does not exist
    return unless $user_id;

    $self->logged_in( 1 );
    $self->user_id( $user_id );
    $self->user_name( $user_name );
    $self->ctx->session( uid => $user_id, username => $user_name, logout => '' );

    return 1;
}

sub load_by_uid {
    my ( $self, $user_id ) = @_;

    return unless $user_id;

    my ( $user_name ) = $self->ctx->db->query(qq|
        SELECT user_name
            FROM users
        WHERE user_id=?
        LIMIT 1
    |, $user_id )->list;

    return unless defined $user_name;

#    $self->ctx->db->query( 'UPDATE users SET last_access=NOW() WHERE user_id=?', $self->user_id );

    $self->logged_in( 1 );
    $self->user_id( $user_id );
    $self->user_name( $user_name );
    $self->ctx->session( uid => $user_id, username => $user_name, logout => '' );
    $self->perms;

    return 1;
}

sub generate_sid {
    Digest::SHA1->new->add( $$, time, rand( time ) )->hexdigest;
}

sub has_group {
    my ( $self, $group ) = @_;
    return unless ( $self->logged_in );

    return 1 if ( $self->perms->{ $group } );

    return;
}

sub has_key {
    my ( $self, $key ) = @_;
    return unless ( $self->logged_in );

    # TODO

    return 1;
}

sub perms {
    my $self = shift;

    return $self->{perms} if $self->{perms};

    my $groups = $self->ctx->db->query(qq|
        SELECT g.group_id, g.group_name
            FROM user_groups AS ug
                JOIN groups AS g
                    ON ug.group_id=g.group_id
        WHERE ug.user_id=?
    |, $self->user_id )->map;

    # permissions without the excluded keys
    my $list = [
        grep { !delete $_->{excluded} } @{
            $self->ctx->db->query(qq|
                SELECT g.group_id, ak.access_key_name, akx.access_key_id AS excluded
                FROM user_groups AS ug
                    JOIN groups AS g
                        ON ug.group_id=g.group_id
                    JOIN group_keys AS gk
                        ON ug.group_id=gk.group_id
                    JOIN access_keys AS ak
                        ON gk.access_key_id=ak.access_key_id
                    LEFT JOIN access_key_exclude AS akx
                        ON akx.access_key_id=ak.access_key_id
                        AND akx.user_id=ug.user_id
                WHERE ug.user_id=?
            |, $self->user_id )->hashes
        }
    ];

    my $access = {};
    foreach ( @{$list} ) {
        if ( $access->{ $_->{access_key_name} } ) {
            push( @{ $access->{ $_->{access_key_name} } }, $_->{group_id} );
        } else {
            $access->{ $_->{access_key_name} } = [ $_->{group_id} ];
        }
    }

    # groups = { 'fc1218445a6311df801447cd67d8cf2f' => 'admin', 'ebe1205a5a6311dfb1440b068f8bd838' => 'user' }
    # access = { '/account/change-password' => [ 'ebe1205a5a6311dfb1440b068f8bd838', 'fc1218445a6311df801447cd67d8cf2f' ] }
    my $perms = {
        groups => $groups,
        access => $access,
    };

    warn Data::Dumper->Dump([$perms],['perms']);

    return $self->{perms} = $perms;
}

sub app_files {
    my $self = shift;
    return [] unless ( $self->logged_in );

    my @files = map {
        {
            id => $_->{app_id},
            path => 'apps/'.$_->{app_name}.'/',
            file => $_->{app_file}
        }
    } @{
        $self->ctx->db->query(qq|
            SELECT DISTINCT a.app_id, a.app_name, a.app_file
            FROM apps AS a
            LEFT JOIN user_apps as ua
                ON ua.user_id=?
                AND ua.app_id=a.app_id
            JOIN user_groups AS ug
                ON ug.user_id=?
            LEFT JOIN group_apps as ga
                ON ga.app_id=a.app_id
                AND ga.group_id=ug.group_id
        |, $self->user_id, $self->user_id )->hashes
    };

    # XXX
    unshift( @files, {
        id => 'core-suport',
        path => 'core/',
        file => 'support.js',
    });

    my ( $theme_id, $theme_file ) = $self->ctx->db->query(qq|
        SELECT t.theme_id, t.theme_file
        FROM user_themes as ut
            JOIN themes as t
                ON t.theme_id=ut.theme_id
        WHERE ut.user_id=?
        LIMIT 1
    |, $self->user_id )->list;

    if ( $theme_id ) {
        push( @files, {
            id => 'theme-'.$theme_id,
            path => '',
            file => $theme_file,
        });
    }

    return \@files;
}

1;
