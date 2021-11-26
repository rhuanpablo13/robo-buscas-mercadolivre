const fs = require('fs');

function getTime() {
    var dataAtual = new Date();
    var dia = dataAtual.getDate();
    var mes = (dataAtual.getMonth() + 1);
    var ano = dataAtual.getFullYear();
    var horas = dataAtual.getHours();
    var minutos = dataAtual.getMinutes();
    return dia + "-" + mes + "-" + ano + " " + horas + ":" + minutos;
}

async function print(data, time = true, quebraLinha = false) {
    let line = '';
    
    if (time) {
        line = getTime() + '\t' + data + "\n";
    }

    console.log(line)

    if (quebraLinha) {
        line = "\n" + line + "\n";
    }

    fs.appendFile('log.txt', line, (err) => {
        if (err) console.log(err)        
    });
        
}

module.exports = {
    print
}