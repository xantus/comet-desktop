/*
DROP TABLE users;
DROP TABLE user_data;
DROP TABLE groups;
DROP TABLE access_keys;
DROP TABLE group_keys;
DROP TABLE access_key_exclude;
DROP TABLE user_groups;
*/

CREATE TABLE users (
        user_id       VARCHAR(40) PRIMARY KEY,
        user_name     VARCHAR(255) NOT NULL,
        user_pass     VARCHAR(255) NOT NULL,
        UNIQUE(user_id)
    );
INSERT INTO users VALUES('05a1ff3e599011df83253fac66072281','root','foobar');
INSERT INTO users VALUES('3ea1474a5a6c11df8f3df3def6f9cbcc','guest','');

/* general user data table */
CREATE TABLE user_data (
        user_id      VARCHAR(40) PRIMARY KEY,
        data         TEXT,
        expires      INTEGER UNSIGNED DEFAULT NULL,
        UNIQUE(user_id)
    );

CREATE TABLE groups (
        group_id     VARCHAR(40) PRIMARY KEY,
        group_name   VARCHAR(255) NOT NULL,
        UNIQUE(group_id)
    );
INSERT INTO groups VALUES('ebe1205a5a6311dfb1440b068f8bd838','user');
INSERT INTO groups VALUES('fc1218445a6311df801447cd67d8cf2f','admin');
INSERT INTO groups VALUES('600087225a6511dfbd2343c1b062ee72','guest');

CREATE TABLE access_keys (
        access_key_id    VARCHAR(40) PRIMARY KEY,
        access_key_name  VARCHAR(255) NOT NULL,
        UNIQUE(access_key_id)
    );
/* access_key_name - not uris, they are for hierarchial order (think sorting) */
INSERT INTO access_keys VALUES('7c47cc9a5ac111dfa06b1f487406da94','/user/add');
INSERT INTO access_keys VALUES('b745293c5ac111df8ab8bff649d07ff0','/user/modify');
INSERT INTO access_keys VALUES('bd9e847c5ac111df844f3f9388ef1ea0','/user/delete');
INSERT INTO access_keys VALUES('c3a6279e5ac111df8e82cb989198b275','/websocket');
INSERT INTO access_keys VALUES('c87c144a5ac111dfacb48bc7eef61c9b','/account/change-password');
INSERT INTO access_keys VALUES('f791ea125aed11df88bb075a56fa5553','/test');

CREATE TABLE group_keys (
        group_id       VARCHAR(40) NOT NULL,
        access_key_id  VARCHAR(40) NOT NULL,
        UNIQUE(group_id,access_key_id)
    );
/* admin - /user/add */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f', '7c47cc9a5ac111dfa06b1f487406da94');
/* admin - /user/modify */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f', 'b745293c5ac111df8ab8bff649d07ff0');
/* admin - /user/delete */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f', 'bd9e847c5ac111df844f3f9388ef1ea0');
/* admin - /websocket */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f', 'c3a6279e5ac111df8e82cb989198b275');
/* admin - /account/change-password */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f', 'c87c144a5ac111dfacb48bc7eef61c9b');
/* admin - /test */
INSERT INTO group_keys VALUES('fc1218445a6311df801447cd67d8cf2f', 'f791ea125aed11df88bb075a56fa5553');

/* user - /websocket */
INSERT INTO group_keys VALUES('ebe1205a5a6311dfb1440b068f8bd838', 'c3a6279e5ac111df8e82cb989198b275');
/* user - /account/change-password */
INSERT INTO group_keys VALUES('ebe1205a5a6311dfb1440b068f8bd838', 'c87c144a5ac111dfacb48bc7eef61c9b');

/* guest - /websocket */
INSERT INTO group_keys VALUES('600087225a6511dfbd2343c1b062ee72', 'c3a6279e5ac111df8e82cb989198b275');


/* table to exclude keys from users */
CREATE TABLE access_key_exclude (
        access_key_id  VARCHAR(40) NOT NULL,
        user_id        VARCHAR(40) NOT NULL,
        UNIQUE(access_key_id,user_id)
    );
/* /test - root */
INSERT INTO access_key_exclude VALUES('f791ea125aed11df88bb075a56fa5553','05a1ff3e599011df83253fac66072281');

CREATE TABLE user_groups (
        user_id      VARCHAR(40) NOT NULL,
        group_id     VARCHAR(40) NOT NULL,
        UNIQUE(user_id,group_id)
    );
/* root - user */
INSERT INTO user_groups VALUES('05a1ff3e599011df83253fac66072281','ebe1205a5a6311dfb1440b068f8bd838');
/* root - admin */
INSERT INTO user_groups VALUES('05a1ff3e599011df83253fac66072281','fc1218445a6311df801447cd67d8cf2f');
/* guest - guest */
INSERT INTO user_groups VALUES('3ea1474a5a6c11df8f3df3def6f9cbcc','fc1218445a6311df801447cd67d8cf2f');


