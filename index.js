const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-1' });

const documentClient = new AWS.DynamoDB.DocumentClient();

const moment = require('moment');

const docAvail = require("./docAvail"); //new
const newBooking = require("./newBooking");
//const slotAvail = require("./slotAvail");

const sendResponse = (status, body) => {
    return {
        'statusCode': status,
        'headers': {
            'Access-Control-Allow-Origin': "*"
        },
        'body': JSON.stringify(body)
    };
};

exports.handler = async(event) => {

    let myOutputContexts = event;
    let globalParameter;

    //setting a sample response
    let myResponse = {
        "fulfillmentMessages": [{
            "text": {
                "text": [
                    "Response from Doctor Slot"
                ]
            }
        }],
        "outputContexts": myOutputContexts
    };

    //extracting global parameters
    myOutputContexts.forEach((temp) => {
        if (temp.name.endsWith('global') == true) {
            globalParameter = temp.parameters;
        }
    });

    //setting values for timezone
    const timeZone = 'Asia/Kolkata';
    const timeZoneOffset = '+05:30';

    const date = globalParameter['docDate'];
    const time = globalParameter['docTime'];
    const doctorId = globalParameter["doctorId"];
    const doctor = globalParameter["doctor"];

    const startTime = new Date(Date.parse(date.split('T')[0] + 'T' + time.split('T')[1].split('+')[0] + timeZoneOffset));
    const endTime = new Date(new Date(startTime).setMinutes(startTime.getMinutes() + 15));
    const appointmentTimeString = startTime.toLocaleString(
        'en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: timeZone }
    );
    console.log(appointmentTimeString);

    let check = true;
    let docAvailable = await docAvail.checkDocOPDDays(date, time, startTime, endTime, doctorId, doctor)
        .then(() => {
            check = true;
            //call for checking db for a slot
            myResponse.fulfillmentMessages[0].text.text[0] = `YES, ${doctor} is available on ${appointmentTimeString}. Let me find slots...`;
        }).catch(() => {
            check = false;
            myResponse.fulfillmentMessages[0].text.text[0] = `I'm sorry, ${doctor} is NOT available on ${appointmentTimeString}. Please select another day/time.`;
        });

    if (check == true) {
        let success = await createCalendarEvent(date, startTime, endTime, doctorId, doctor);
        console.log("Booking success: " + success);
        if (success == true) {
            console.log("true");
            myResponse.fulfillmentMessages[0].text.text[1] = `Appointment Successfully made for ${appointmentTimeString}!`;
        }
        else {
            console.log("false");
            myResponse.fulfillmentMessages[0].text.text[1] = `The slot on ${appointmentTimeString} is already Booked. Please select another day/time.`;
        }
    }

    // //console.log(success);
    return sendResponse(200, myResponse);

};

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
