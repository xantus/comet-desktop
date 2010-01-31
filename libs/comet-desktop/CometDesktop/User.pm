package CometDesktop::User;

use strict;
use warnings;

use Digest::SHA1 qw( sha1_hex );

use base 'Mojo::Base';

__PACKAGE__->attr([qw/
    db
    session_id
    logged_in
    user_id
    group_id
    first_name
    last_name
    email_address
    password
    active
    inactive
    session_duration
    total_duration

    session_gen_secret
    login_secret
    extra_security
    session_secret
/]);

sub new {
    my $class = shift;

    my $self = bless({
        user_data => {},
        logged_in => 0,
        session_duration => 0,
        total_duration => 0,
        extra_security => 0,
        session_gen_secret => 'z23@(asDf7z!fAz79)65#D',
        login_secret => '7f*k6hj1!D97azZ&4',
        session_secret => '*47f!4cVh9ajYa#fOc',
    }, $class || ref( $class ) );
    
    return $self;
}

sub init {
    my $self = shift;
    my $sid = $self->session_cookie();
    if ( $sid ) {
        my $data = $self->load_session( $sid );
        if ( defined $data ) {
            $self->user_data( $data );
            $self->logged_in( 1 );
            $self->session_id( $sid );
        }
    }
}

sub login {
    my ( $self, $user, $pass ) = @_;

    my ( $user_id, $email ) = $self->db->query(
        'SELECT user_id, email FROM users WHERE email = ? AND password = ? LIMIT 1',
        $user, $pass
    )->list;

    if ( $user_id ) {
        $self->logged_in( 1 );
        $self->user_id( $user_id );
        return $user_id;
    }
}

sub logout {
    my $self = shift;
    return unless ( $self->logged_in );

#    $self->db->query(
#        'DELETE FROM session WHERE sid = ?',
#        $sid
#    );
    
    $self->user_data( {} );
    $self->logged_in( 0 );

    return 1;
}

sub load_user {
    my ( $self, $user_id ) = @_;

    return unless $user_id;
    
    my ( $valid ) = $self->db->query(
        'SELECT 1 FROM users WHERE user_id = ? LIMIT 1',
        $user_id
    )->list;

    return unless $valid;

    $self->logged_in( 1 );
    $self->user_id( $user_id );
    
    return 1;
}

sub inactivate_session {
    my $self = shift;
    return unless ( $self->logged_in );

    # TODO log the duration
    $self->db->query(
        'UPDATE sessions SET inactive=1,session_duration=? WHERE id=?',
        $self->session_duration, $self->session_id
    );
    
    $self->db->query(
        'UPDATE members SET total_time=? WHERE id=?',
        ( $self->total_duration + $self->session_duration ), $self->user_id
    );

    return 1;
}

sub ___load_user {
    my ( $self, $user, $pass, $token ) = @_;

    unless ( $user && $pass && $token ) {
        warn "user pass and token required";
        return;
    }

    my ( $verify, $ttime );
    ( $verify, $pass ) = split( ':', $pass, 2 );
    unless ( $verify && $pass ) {
        warn "verify and pass not split";
        return;
    }
    ( $ttime, $token ) = split( '~', $token, 2 );
    unless ( $token && $ttime ) {
        warn "ttime and token not split";
        return;
    }
    unless ( $ttime =~ m/^\d+$/ ) {
        warn "ttime is not numeric";
        return;
    }
    
    my $time = CORE::time();

    # check token time against time
    if ( $time - $ttime > 1200 ) {
        warn "ttime has expired";
        return { invalid_token => 1 };
    }
    
    # check token against time and secret key
    my $check1 = sha1_hex( $ttime.':'.$self->login_secret );
    unless ( $check1 eq $token ) {
        warn "token doesn't verify against secret and ttime";
        return;
    }

    # check login against the token
    my $check = sha1_hex( $token.':'.$pass );

    warn "time:$time ttime:$ttime token:$token sha:$pass check:$check check1:$check1 ver:$verify";
    unless ( $verify eq $check ) {
        warn "check doesn't verify against token and pass";
        return;
    }

    my $data = $self->db->query(qq|
        SELECT m.*, mg.groups_id as groups_id
        FROM members AS m
        JOIN members_has_groups as mg
            ON m.id=mg.members_id
            AND mg.active='true'
        WHERE m.email_address=?
        AND m.password=?
    |, $user, $pass )->hash;

    $self->db->query(
        'UPDATE members SET last_access=NOW() WHERE id=?', $data->{id}
    );

    return ( $data->{id} ) ? $data : undef;
}

sub load_session {
    my ( $self, $sid ) = @_;

    my $data = $self->db->query(qq|
        SELECT m.*, mg.groups_id as groups_id, s.session_duration
        FROM sessions AS s
        JOIN members AS m
        ON m.id=s.members_id
        JOIN members_has_groups as mg
            ON m.id=mg.members_id
            AND mg.active='true'
        WHERE s.id=?|, $sid )->hash;

    if ( $data->{id} ) {
        $data->{inactive} = 0;
        if ( defined $ENV{HTTP_X_SESSION_DURATION} && $ENV{HTTP_X_SESSION_DURATION} =~ m/^\d+$/ ) {
            $self->db->query(qq|
                UPDATE sessions
                    SET last_active=NOW(),
                    inactive=0,
                    useragent=?,
                    session_duration=?
                WHERE id=?
            |,$ENV{HTTP_USER_AGENT},$ENV{HTTP_X_SESSION_DURATION},$sid);
        } else {
            $self->db->query(qq|
                UPDATE sessions
                    SET last_active=NOW(),
                    inactive=0,
                    useragent=?
                WHERE id=?
            |,$ENV{HTTP_USER_AGENT},$sid);
        }
        $self->db->query( 'UPDATE members SET last_access=NOW() WHERE id=?', $data->{id} );
    }

    return ( $data->{id} ) ? $data : undef;
}

sub generate_sid {
    my $self = shift;
    return sha1_hex( int(rand(10000000000)).':'.$self->session_gen_secret.':'.$self->user_id.':'.( $ENV{HTTP_USER_AGENT} || '' ) );
}

sub session_id_tokenized {
    my $self = shift;
    my $sid = $self->session_id;
    return undef unless $sid;
    if ( $self->extra_security ) {
        return sha1_hex( $sid.':'.$self->session_secret.':'.( $ENV{HTTP_USER_AGENT} || '' ) ).'/'.$sid;
    } else {
        return sha1_hex( $sid.':'.$self->session_secret ).'/'.$sid;
    }
}

sub user_data {
    my ( $self, $data ) = @_;
    
    return;

    if ( ref $data ) {
        $self->{user_data} = $data;
        # group_id 1 is admin
        @{$self}{qw(
            user_id
            group_id
            first_name
            last_name
            email_address
            password
            inactive
            session_duration
            total_duration
        )} = @{$data}{qw(
            id
            groups_id
            first_name
            last_name
            email_address
            password
            inactive
            session_duration
            total_time
        )};
        $self->is_admin( defined $data->{groups_id} && $data->{groups_id} == 1 ? 1 : 0 );
        $self->is_guest( defined $data->{groups_id} && $data->{groups_id} == 3 ? 1 : 0 );
    }

    return $self->{user_data};
}

1;
