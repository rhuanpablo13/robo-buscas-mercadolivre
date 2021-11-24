const sendMail = require('./sendMail')
const log = require('./log');


async function enviarEmailTeste(to) {    
    log.print('Enviando email de teste')

    var emailASerEnviado = {
        from: "noreply.envioemail@gmail.com",
        to: to,
        subject: 'Testando envio de emails do seu Robô de Buscas do Mercado Livre :)',
        text: 'Um Oi do seu Robozinho de Buscas!! :) ',
    };
    await sendMail.sendMail(emailASerEnviado)
}


async function enviarEmail(from, to, subject, content) {    
    log.print('Enviando email')

    var emailASerEnviado = {
        from: from,
        to: to,
        subject: subject,
        html: content,
    };

    await sendMail.sendMail(emailASerEnviado)
}


module.exports = {
    enviarEmail,
    enviarEmailTeste
}
