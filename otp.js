'use strict';
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const sendgrid = require('@sendgrid/mail');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

module.exports.generate = async (event) => {
  const { email } = JSON.parse(Buffer.from(event.body).toString());

  const sessionId = uuidv4();
  const otp = Math.floor(100000 + Math.random() * 900000);

  const putParams = {
    TableName: process.env.DYNAMODB_OTP_TABLE,
    Item: { sessionId, otp },
  };

  const emailData = {
    to: email,
    from: 'elliots.bot.chooser@gmail.com',
    subject: 'Your BotChooser login code',
    text: `Here is your BotChooser login code: ${otp}`,
    html: `Here is your BotChooser login code: <strong>${otp}<strong>`,
  };

  try {
    await dynamoDb.put(putParams).promise();
    await sendgrid.send(emailData);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error }, null, 2),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sessionId }, null, 2),
  };
};

module.exports.validate = async (event) => {
  const { sessionId, otp } = JSON.parse(Buffer.from(event.body).toString());

  const getParams = {
    TableName: process.env.DYNAMODB_OTP_TABLE,
    Key: { ['sessionId']: sessionId },
  };
  const { Item: sessionEntry } = await dynamoDb.get(getParams).promise();

  if (Number(otp) !== Number(sessionEntry.otp)) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Could not validate otp' }, null, 2),
    };
  }

  try {
    await dynamoDb.delete(getParams).promise();
  } catch (error) {
    return { statusCode: 500 };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ token: uuidv4() }, null, 2),
  };
};
