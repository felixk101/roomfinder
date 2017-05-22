drop table IF EXISTS bookings;
drop table IF EXISTS events; 
drop table IF EXISTS rooms;
drop table IF EXISTS buildings;

create table rooms
(
    room_name varchar(20) NOT NULL,
    building varchar(3),
    PRIMARY KEY (room_name)
);

create table bookings
(
	room_name varchar(256) NOT NULL,
    start_date datetime NOT NULL,
    end_date datetime NOT NULL,
    FOREIGN KEY (room_name) REFERENCES rooms(room_name)
);


