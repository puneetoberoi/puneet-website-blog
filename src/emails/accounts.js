const sgmail = require('@sendgrid/mail')

const sendgridAPI = "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"
sgmail.setApiKey(sendgridAPI)

// sgmail.send({
//     to: 'jasibr4@gmail.com',
//     from: 'jasibr4@gmail.com',
//     subject: 'This is my first email',
//     text: 'I hope wmk on everyone and let everyone grow in their fields'
// })

const sendWelcomeEmail =  (name) => {
    sgmail.send({
        to: 'jasibr4@gmail.com',
        from: 'jasibr4@gmail.com',
        subject: 'This is my first email',
        text: `Welcome to the app, ${name}.`
    })
}


module.exports = {sendWelcomeEmail}