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

function vintedLink(sets) {
  return sets.split(' + ').map(set => `<li><a href="https://www.vinted.pt/catalog?search_text=lego%20${set}&order=price_low_to_high">Sets in vinted</a></li>`).join('');
}

function bricklinkLink(sets) {
  return sets.split(' + ').map(set => `<li><a href="https://www.bricklink.com/v2/catalog/catalogitem.page?S=${set}-1#O={"ii":0}"'>Bricklink</a></li>`).join('');
}

function bricklinkPics(sets) {
  return sets.split(' + ').map(set => `<img width="400" src="https://img.bricklink.com/ItemImage/SN/0/${set}-1.png" />`).join('');
}

function itemPics(item) {
  return item.photos.map(pic => `<img width="400" src="${pic}" />`).join('');
}

export function sendMail(sets, item, minPrice) {
  initTransporter();

  const email = getEmailCredentials().user;
  
  const isNewPrefix = item.status.startsWith("Novo") ? 'New ' : '';
  const isPackPrefix = sets.includes('+') ? 'Pack ' : '';
  let titlePrefix = `${isNewPrefix}${isPackPrefix}`;
  titlePrefix = titlePrefix.length > 0 ? ` (${titlePrefix})`: titlePrefix;


  var mailOptions = {
    from: email,
    to: email,
    subject: `Price alert${titlePrefix}: Set ${sets} price: ${item.price}€ (${minPrice}€)`,
    text: ``,
    html: `
      <ul>
        <li><a href="${item.url}">Item</a></li>
        ${vintedLink(sets)}
        ${bricklinkLink(sets)}
        <li>Title: ${item.title}</li>
        <li>Description: ${item.description}</li>
        <li>Condition: ${item.status}</li>
        <li>User discount: ${item.discount}</li>
      </ul>
      ${bricklinkPics(sets)}
      <hr />
      ${itemPics(item)}
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