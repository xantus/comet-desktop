
CREATE TABLE user_data (
        user_id      VARCHAR(40) PRIMARY KEY,
        data         TEXT,
        expires      INTEGER UNSIGNED DEFAULT NULL,
        UNIQUE(user_id)
    );
CREATE TABLE users (
        user_id       VARCHAR(40) PRIMARY KEY,
        user_name     VARCHAR(255) NOT NULL,
        user_pass     VARCHAR(255) NOT NULL,
        UNIQUE(user_id)
    );
INSERT INTO users VALUES('05a1ff3e599011df83253fac66072281','xantus','foobar');

CREATE TABLE groups (
        group_id     VARCHAR(40) PRIMARY KEY,
        group_name   VARCHAR(255) NOT NULL,
        UNIQUE(group_id)
    );
INSERT INTO groups VALUES('ebe1205a5a6311dfb1440b068f8bd838','user');
INSERT INTO groups VALUES('fc1218445a6311df801447cd67d8cf2f','admin');
INSERT INTO groups VALUES('600087225a6511dfbd2343c1b062ee72','guest');

CREATE TABLE group_keys (
        group_id        VARCHAR(40) NOT NULL,
        group_key_name  VARCHAR(255) NOT NULL,
        UNIQUE(group_key_name,group_id)
    );
/* group_key_names are not uris, they are for hierarchial order (think sorting) */
/* admin */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f','/user/add');
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f','/user/modify');
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f','/user/delete');
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f','/websocket');
/* user */
INSERT INTO group_keys VALUES('ebe1205a5a6311dfb1440b068f8bd838','/websocket');
/* guest */
INSERT INTO group_keys VALUES('600087225a6511dfbd2343c1b062ee72','/websocket');

