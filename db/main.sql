
CREATE TABLE session (
        sid          VARCHAR(40) PRIMARY KEY,
        data         TEXT,
        expires      INTEGER UNSIGNED NOT NULL,
        UNIQUE(sid)
    );
CREATE TABLE users (
        user_id       VARCHAR(40) PRIMARY KEY,
        email         VARCHAR(255) NOT NULL,
        password      VARCHAR(255) NOT NULL,
        UNIQUE(user_id)
    );
INSERT INTO users VALUES('test','test@cometdesktop.com','testing');
