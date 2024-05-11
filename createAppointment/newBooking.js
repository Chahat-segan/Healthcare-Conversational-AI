const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-1' });

const documentClient = new AWS.DynamoDB.DocumentClient();


async function Books(date, startTime, endTime, doctorId, count) {

    let appID = (++count) + '-' +'D' + doctorId + '-' + (date.split('T')[0]) ;
    console.log("creating appID: " + appID);

    var input = {
        "doctorId": doctorId,
        "date": date.split('T')[0],
        "startTime": startTime.toISOString(),
        "endTime": endTime.toISOString(),
        //"status" : "",
        "isBooked": true,
        "patientDetails": {
            "phoneNumber": "9824242424",
            "patientName": "Mr. xyz"
        },
        "appointmentID": appID
    };

    var parameters = {
        TableName: "AppointmentDB",
        Item: input
    };

    await documentClient.put(parameters).promise();
}

module.exports = { Books };