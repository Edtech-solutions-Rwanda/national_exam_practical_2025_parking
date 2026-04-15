CREATE DATABASE PSSMS;
USE PSSMS;

CREATE TABLE user(
userid INT AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(100) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL
);

CREATE TABLE car(
platenumber VARCHAR(20) PRIMARY KEY,
drivername VARCHAR(100) NOT NULL,
phonenumber VARCHAR(20) NOT NULL
);

CREATE TABLE parkingslot(
slotnumber INT PRIMARY KEY,
slotstatus ENUM('available','occupied') DEFAULT 'available'
);

CREATE TABLE parkingrecord(
recordid INT AUTO_INCREMENT PRIMARY KEY,
platenumber VARCHAR(20) NOT NULL,
slotnumber INT NOT NULL,
entrytime DATETIME NOT NULL,
exittime DATETIME,
duration float,
FOREIGN KEY (platenumber) REFERENCES car(platenumber),
FOREIGN KEY (slotnumber) REFERENCES parkingslot(slotnumber)
);

CREATE TABLE payment(
paymentid INT AUTO_INCREMENT PRIMARY KEY,
recordid INT NOT NULL,
amountpaid INT NOT NULL,
paymentdate date NOT NULL,
FOREIGN KEY (recordid) REFERENCES parkingrecord(recordid)
);