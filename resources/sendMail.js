const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const log = require('../resources/log');


/**
 *  emailASerEnviado = {
        subject: string,
        html: string,
        to: [string],
        from: string
    };
 */
async function sendMail(emailASerEnviado) {

    const oauth2Client = new OAuth2(
        "613846042740-kesqojpdqnuubbvlalk0q03l5qvh9kim.apps.googleusercontent.com",
        "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",
        "https://developers.google.com/oauthplayground"
    );
    
    oauth2Client.setCredentials({
        refresh_token: "1//04qHOdBGI5GmOCgYIARAAGAQSNwF-L9Iraqaw55ZNoQ1_ATMBHYV1P4Bqaxlta1_dsIH1cGdS_hwxOT-hq_ThSAyqosEHyZnkbKc"
    });

    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) {
                reject("Failed to create access token :(");
            }
            resolve(token);
        });
    });

    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: 'smtp.gmail.com',
        port: 25,
        secure: false,
        auth: {
            type: "OAuth2",
            user: "noreply.envioemail@gmail.com",
            accessToken,
            clientId: "613846042740-kesqojpdqnuubbvlalk0q03l5qvh9kim.apps.googleusercontent.com",
            clientSecret: "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",
            refreshToken: "1//04qHOdBGI5GmOCgYIARAAGAQSNwF-L9Iraqaw55ZNoQ1_ATMBHYV1P4Bqaxlta1_dsIH1cGdS_hwxOT-hq_ThSAyqosEHyZnkbKc"
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    transporter.sendMail(emailASerEnviado, response => {
        if (response) {
            log.print('Falha. ' + response);
            return false
        } else {
            log.print('Email enviado com sucesso. ');
            return true
        }
    })
}

module.exports = {
    sendMail
}