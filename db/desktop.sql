/*
DROP TABLE users;
DROP TABLE user_data;
DROP TABLE groups;
DROP TABLE access_keys;
DROP TABLE group_keys;
DROP TABLE access_key_exclude;
DROP TABLE user_groups;
*/
DROP TABLE IF EXISTS `desktop`.`db_data` ;
CREATE TABLE db_data (
    data_key   VARCHAR(255) PRIMARY KEY,
    data_value TEXT
    );

INSERT INTO db_data VALUES('sql_version','1.0.0');

DROP TABLE IF EXISTS `desktop`.`users` ;
CREATE TABLE users (
        user_id       VARCHAR(40) PRIMARY KEY,
        user_name     VARCHAR(255) NOT NULL,
        user_pass     VARCHAR(255) NOT NULL,
        UNIQUE(user_id)
    );
INSERT INTO users VALUES('05a1ff3e599011df83253fac66072281','root','foobar');
INSERT INTO users VALUES('3ea1474a5a6c11df8f3df3def6f9cbcc','guest','');

/* general user data table */
DROP TABLE IF EXISTS `desktop`.`user_data` ;
CREATE TABLE user_data (
        user_id      VARCHAR(40) PRIMARY KEY,
        data         TEXT,
        expires      INTEGER UNSIGNED DEFAULT NULL,
        UNIQUE(user_id)
    );

DROP TABLE IF EXISTS `desktop`.`groups` ;
CREATE TABLE groups (
        group_id     VARCHAR(40) PRIMARY KEY,
        group_name   VARCHAR(255) NOT NULL,
        UNIQUE(group_id)
    );
INSERT INTO groups VALUES('ebe1205a5a6311dfb1440b068f8bd838','user');
INSERT INTO groups VALUES('fc1218445a6311df801447cd67d8cf2f','admin');
INSERT INTO groups VALUES('600087225a6511dfbd2343c1b062ee72','guest');

DROP TABLE IF EXISTS `desktop`.`access_keys` ;
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

DROP TABLE IF EXISTS `desktop`.`group_keys` ;
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
DROP TABLE IF EXISTS `desktop`.`access_key_exclude` ;
CREATE TABLE access_key_exclude (
        access_key_id  VARCHAR(40) NOT NULL,
        user_id        VARCHAR(40) NOT NULL,
        UNIQUE(access_key_id,user_id)
    );
/* /test - root */
INSERT INTO access_key_exclude VALUES('f791ea125aed11df88bb075a56fa5553','05a1ff3e599011df83253fac66072281');

DROP TABLE IF EXISTS `desktop`.`user_groups` ;
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

/* apps have a single file or url, and jit load everything else */
DROP TABLE IF EXISTS `desktop`.`apps` ;
CREATE TABLE apps (
        app_id    VARCHAR(40) PRIMARY KEY,
        app_name  VARCHAR(40) NOT NULL,
        app_file  TEXT NOT NULL,
        app_desc  VARCHAR(255) NOT NULL,
        UNIQUE(app_id)
    );

INSERT INTO apps VALUES('b4e000f85ca711df9f47dfe6670e4c36','samples','js/samples.js','Sample Apps');
INSERT INTO apps VALUES('8cf006705cb011df89f4a7889ed35127','admin-users','js/admin-users.js','User Admin');
INSERT INTO apps VALUES('16ae3b3c5fb011df802bcb8955b62d7f','languages','js/app.js','Language Support');

DROP TABLE IF EXISTS `desktop`.`user_apps` ;
CREATE TABLE user_apps (
        user_id   VARCHAR(40) NOT NULL,
        app_id    VARCHAR(40) NOT NULL,
        UNIQUE(user_id,app_id)
    );

DROP TABLE IF EXISTS `desktop`.`group_apps` ;
CREATE TABLE group_apps (
        group_id  VARCHAR(40) NOT NULL,
        app_id    VARCHAR(40) NOT NULL,
        UNIQUE(group_id,app_id)
    );

/* user - sample */
INSERT INTO group_apps VALUES('ebe1205a5a6311dfb1440b068f8bd838','b4e000f85ca711df9f47dfe6670e4c36');
/* user - languages */
INSERT INTO group_apps VALUES('ebe1205a5a6311dfb1440b068f8bd838','16ae3b3c5fb011df802bcb8955b62d7f');
/* guest - sample */
INSERT INTO group_apps VALUES('3ea1474a5a6c11df8f3df3def6f9cbcc','b4e000f85ca711df9f47dfe6670e4c36');
/* guest - languages */
INSERT INTO group_apps VALUES('3ea1474a5a6c11df8f3df3def6f9cbcc','16ae3b3c5fb011df802bcb8955b62d7f');
/* admin - user admin */
INSERT INTO group_apps VALUES('fc1218445a6311df801447cd67d8cf2f','8cf006705cb011df89f4a7889ed35127');

DROP TABLE IF EXISTS `desktop`.`themes` ;
CREATE TABLE themes (
        theme_id    VARCHAR(40) PRIMARY KEY,
        theme_file  TEXT NOT NULL,
        theme_desc  VARCHAR(255) NOT NULL,
        UNIQUE(theme_id)
    );

INSERT INTO themes VALUES('852bc8165fb711dfbca93bc171e9abdc','themes/slate-theme/css/xtheme-slate.css','Slate');
INSERT INTO themes VALUES('ed2dfd445fb711dfba4c3f131a9643dc','lib/[ext_version]/resources/css/xtheme-gray.css','Ext Gray');
INSERT INTO themes VALUES('fd23989e5fb711df98dab77dd90a2596','lib/[ext_version]/resources/css/xtheme-blue.css','Ext Blue');
INSERT INTO themes VALUES('03ceb6385fb811dfa954ef1dd51f978a','lib/[ext_version]/resources/css/xtheme-access.css','Ext Access');

DROP TABLE IF EXISTS `desktop`.`user_themes` ;
CREATE TABLE user_themes (
    user_id    VARCHAR(40) NOT NULL,
    theme_id   VARCHAR(40) NOT NULL,
    UNIQUE(user_id,theme_id)
);

INSERT INTO user_themes VALUES('05a1ff3e599011df83253fac66072281','852bc8165fb711dfbca93bc171e9abdc');
INSERT INTO user_themes VALUES('3ea1474a5a6c11df8f3df3def6f9cbcc','ed2dfd445fb711dfba4c3f131a9643dc');

