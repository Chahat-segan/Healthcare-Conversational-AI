const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-1' });

const documentClient = new AWS.DynamoDB.DocumentClient();

const moment = require('moment');

const newBooking = require("./newBooking");

async function createCalendarEvent(date, startTime, endTime, doctorId, doctor) {

    // checking working days
    var params = {
        TableName: "AppointmentDB",
        IndexName: 'docDateIndex',
        KeyConditionExpression: "#doctId = :DId and #date = :date",
        ExpressionAttributeNames: {
            "#doctId": "doctorId",
            "#date": "date",
        },
        ExpressionAttributeValues: {
            ":DId": doctorId,
            ":date": date.split('T')[0]
        }
    };

    let data = await documentClient.query(params).promise();
    //console.log("All Appointments");
    //console.log(data.Items);

    let appointments = data.Items;
    let success = "to do";
    let slotBooked = false;


    console.log("no. of appointments: " + appointments.length);
    if (appointments.length == 0) {
        console.log("adding to db..");
        await newBooking.Books(date, startTime, endTime, doctorId, appointments.length);
        success = true;
    }
    else {

        console.log("checking slots");
        appointments.forEach(slot => {
            // console.log("Slot");
            // console.log(slot);
            let sT = moment(slot['startTime']);
            let eT = moment(slot['endTime']);
            let time = startTime.toISOString();
            let Tz = moment(time);
            //let Tz = moment(time.split('T')[1].split('+')[0], 'hh:mm:ss');

            console.log(sT, eT, Tz);
            console.log(startTime, endTime);

            //console.log(Tz.isBetween(sT, eT, null, '[]'));

            if (Tz.isBetween(sT, eT, undefined, '[)') == true) {
                slotBooked = true;
            }
            console.log("slot booked = " + slotBooked);
        });
        //console.log(slotBooked);
        if (slotBooked == true) {
            console.log("This slot is already booked. Please try booking at another time.");
            success = false;
        }
        else {
            await newBooking.Books(date, startTime, endTime, doctorId, appointments.length);
            console.log("Appointment Successfully created.");
            success = true;
        }
    }

    return success;
}

module.exports = { createCalendarEvent };