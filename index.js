const express = require('express');
const cors = require('cors')
const nodemailer = require('nodemailer');
const Ical = require('ical-generator');
const bodyParser = require('body-parser');
const app = express();
const port = 1524; // change

const Config = require('./config.js');
if (! Object.values(Config.organizer).every(x => x.length > 1)) throw 'incomplete config';
if (! Object.values(Config.attendee).every(x => x.length > 1)) throw 'incomplete config';

app.use(cors())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }));
const router = express.Router();
app.use(router);

const ROOT = '/spurwing-hooks'; // change

router.use((req, res, next)=>{
  next()
});

router.get(ROOT + '/appointment', (req, res) => {
    const To = [{
      name: Config.attendee.name,
      email: Config.attendee.email,
    },{
      name: req.query.name,
      email: req.query.email,
    }]
    if (!req.query.name || !req.query.email) {
      res.send('error: nope')
      return;
    }
    // console.log(req.query)
    let StartDate = new Date(req.query.start);
    let EndDate = new Date(req.query.end);
    let Summary = 'Spurwing Appointment with ' + req.query.name; // change
    let Subject = Summary; // change
    let Html = `Appointment with ${req.query.name} on ${req.query.start}.<br>` + Config.email.html; // change
    sendMail(To, StartDate, EndDate, Subject, Html, Summary, null)

    res.send({success:1})
});

app.listen(port, () => console.log(`Spurwing-hooks listening on port ${port}!`))


function getIcal(starttime, endtime, summary, description, location, url, Attendees) {
  const cal = Ical({
    domain: "spurwing.io", // change
    name: 'Spurwing Appointment Call', // change
  });

  const attendees = [];
  for (const at of Attendees) {
    attendees.push({
        mailto : at.email,
        email : at.email,
        name : at.name,
        status : 'needs-action',
        rsvp : true,
        type : 'individual',
    })
  }

  cal.createEvent({
    start: starttime, end: endtime,
    summary: summary,
    description: description,
    location: location,
    url: url,
    organizer: {
      name: Config.organizer.name,
      email: Config.organizer.email,
    },
    status: 'confirmed',
    attendees: attendees,
  });
  cal.method('REQUEST');
  return cal;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: Config.organizer.email,
    pass: Config.organizer.smtp_pass,
  }
});

function sendMail(Attendees, StartDate, EndDate, Subject, Html, Summary, Description) {
  let ical = getIcal(StartDate, EndDate, Summary, Description, null, null, Attendees);
  
  const mailOptions = {
    from: Config.organizer.email,
    to:   Attendees.map(x => x.email),
    subject: Subject,
    text: Html.replace(/<[^>]*>?/gm, ''),
    html: Html,
    icalEvent: {
      content: ical.toString()
    }
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) console.log(error);
    else console.log('Email sent: ' + info.response);
  });
}
