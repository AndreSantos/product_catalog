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
    text: ``,
    html: `
      <ul>
        <li><a href="${item.url}">Item</a></li>
        <li><a href="https://www.vinted.pt/catalog?search_text=lego%20${set}&order=price_low_to_high">Sets in vinted</a></li>
        <li><a href="https://www.bricklink.com/v2/catalog/catalogitem.page?S=${set}-1#O={"ii":0}"'>Bricklink</a></li>
        <li>Title: ${item.title}</li>
        <li>Description: ${item.description}</li>
      </ul>
      <img width="400" src="https://img.bricklink.com/ItemImage/SN/0/${set}-1.png" />
      <hr />
      <img width="400" src="${item.photos[0]}" />
    `
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}