import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';

function getEmailCredentials() {
  const emailCredentials = readFileSync('../../secret/emailcredentials.txt', 'utf8');
  return {
    user: emailCredentials.split("/")[0],
    pass: emailCredentials.split("/")[1],
  };
}

let transporter;
function initTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: getEmailCredentials()
    });
  }
}

export function sendMail(set, item, minPrice) {
  initTransporter();

  const email = getEmailCredentials().user;

  var mailOptions = {
    from: email,
    to: email,
    subject: `Price alert: Set ${set} price: ${item.price}€ (${minPrice}€), discount: ${item.discount}`,
    text: `<a href="${item.url}"'>Link</a>`
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}