const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-1' });

const documentClient = new AWS.DynamoDB.DocumentClient();

const moment = require('moment');

async function checkDocOPDDays(date, time, startTime, endTime, doctorId, doctor) {

    //checking working days
    var params = {
        TableName: "MedBot_Doctor",
        //IndexName: 'Dept_based_Doctors',
        KeyConditionExpression: "(#doctId = :DId and #tenant = :TId)", // or (#doctName = :Doct and #tenant = :TId)",
        ExpressionAttributeNames: {
            "#doctId": "doctorId",
            "#tenant": "tenantId",
            //"#doctName": "doctorName"
        },
        ExpressionAttributeValues: {
            ":DId": doctorId,
            ":TId": 1,
            //":Doct": doctor
        }
    };

    let data = await documentClient.query(params).promise();

    const workingDays = data.Items[0].doctorOpdDays;
    console.log(workingDays);

    //getting the "DAY" of appointment
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var appointmentDay = days[startTime.getDay()];
    console.log("appointmentDay = " + appointmentDay);


    //checking if doctor works on that day and extracting 
    let workingHours;
    
    workingDays.forEach(function(day) {
        console.log("Checking Day");
        for (const [key, value] of Object.entries(day)) {
            if (key === appointmentDay) {
                console.log(`Doctor is available on ${key}`);
                workingHours = value;
                break;
            }
            else {
                console.log(`Doctor is NOT available on ${key}`);
                
            }
        }
    });

    let docAvailable;
    workingHours.forEach(hour => {
        let sT = moment(hour['startTime'], 'hh:mm');
        let eT = moment(hour['endTime'], 'hh:mm');
        let Tz = moment(time.split('T')[1].split('+')[0] , 'hh:mm:ss');
        console.log("Checking time");
        docAvailable = Tz.isBetween(sT, eT);
        //console.log(docAvailable);
        if (docAvailable == true) {
            console.log("Doc AVail");
        }
    });

    //console.log(docAvailable);
    return docAvailable;
}

module.exports = { checkDocOPDDays };