let URL_PRODUTO = 'https://produto.mercadolivre.com.br/'

Promise = require('bluebird'); 
const fs = require('fs');
const log = require('../resources/log');
const emailMaker = require('../resources/email-maker');


let con = null
function setConnection(conParam) {
    con = conParam;
}


async function carregarArquivoUrls() {
    return new Promise(async (resolve, reject) => {
        fs.readFile('./urls.txt', 'utf8' , (err, data) => {
            if (err) { 
                log.print(err); 
                resolve ({'status': false, 'data': []})
            }            
            resolve ({'status': true, 'data': data})
        })
    })
}

async function carregarArquivoEmail() {
    return new Promise(async (resolve, reject) => {
        fs.readFile('./email.txt', 'utf8' , (err, data) => {
            if (err) { 
                log.print(err); 
                resolve ({'status': false, 'data': []})
            }            
            resolve ({'status': true, 'data': data})
        })
    })
}


/**
 * Termo:
 * return {
        'id' : ID,
        'descricao' : DESCRICAO
    }
 * @returns Object
 */
async function todosTermos() {
    var sql = "SELECT ID, DESCRICAO FROM TERMO";
    let results = await con.awaitQuery(sql)
    
    await log.print('Buscando todos os termos cadastrados => Encontrados: ' + results.length)

    return results.map((ret) => {                
        return {
            'id' : ret.ID,
            'descricao' : ret.DESCRICAO
        }
    })
}


/**
 * Método responsável por inserir termos de busca.
 * Retorna null se o termo já estiver cadastrado, ou objeto inserido.
 * @param string termo 
 * @returns null | objeto inserido
 */
async function inserirNovoTermoDeBusca(termo) {

    if (await existeTermo(termo) == true) {
        return null;
    }

    var sql = "INSERT INTO TERMO(DESCRICAO) VALUES (?)";
    let results = await con.awaitQuery(sql, [termo])

    console.log(results)
    await log.print("Inserindo novo termo de busca: " + termo)
    return results
}

/**
 * Método responsável por verificar se o código do disco já existe no banco.
 * @param string codigo 
 * @returns bool
 */
 async function existeCodigo(codigo) {
    let url_produto = URL_PRODUTO + codigo.replace('MLB', 'MLB-')
    var sql = "SELECT COUNT(URL) AS QTD FROM DISCO WHERE URL = ?";
    let results = await con.awaitQuery(sql, [url_produto])
        
    if (results == '' || results[0].QTD == 0)
        return false
    return true
}

/**
 * Método responsável por verificar se o termo de busca já existe no banco.
 * @param string termo 
 * @returns bool
 */
async function existeTermo(termo) {        
    var sql = "SELECT COUNT(DESCRICAO) AS QTD FROM TERMO WHERE DESCRICAO = ?";
    let results = await con.awaitQuery(sql, [termo])
    
    if (results == '' || results[0].QTD == 0) {
        return false
    }
    return true
}

/**
 * Método responsável por verificar se o id do termo de busca já existe no banco.
 * @param int id do termo 
 * @returns bool
 */
async function existeIdTermo(id) {
    var sql = "SELECT COUNT(*) AS QTD FROM TERMO WHERE ID = ?";
    let results = await con.awaitQuery(sql, [id])

    if (results == '' || results[0].QTD == 0)
        return false
    return true
}

/**
 * Método responsável por verificar se o termo de busca já existe relacionado a tabela de disco.
 * @param int id termo 
 * @returns bool
 */
async function existeTermoEmDisco(id_termo) {
    var sql = "SELECT COUNT(*) AS QTD FROM DISCO WHERE ID_TERMO = ?";
    let results = await con.awaitQuery(sql, [id_termo])

    if (results == '' || results[0].QTD == 0)
        return false
    return true
}

/**
 * Método responsável por cadastrar um novo disco.
 * @param string codigo, int id termo 
 * @returns objeto inserido
 */
async function inserirNovoDisco(codigo, id_termo, thumb, title, price) {
    let url = 'https://produto.mercadolivre.com.br/' + codigo.replace('MLB', 'MLB-')
    var sql = "INSERT INTO DISCO(URL, ID_TERMO, THUMB, TITLE, PRICE) VALUES (?, ?, ?, ?, ?)";
    let results = await con.awaitQuery(sql, [url, id_termo, thumb, title, price])
    return url
}

async function removerTermoDeBusca(id_termo) {
    let excluiu = false;
    
    if (await existeTermoEmDisco(id_termo)) {
        await log.print("Removendo discos onde o id_termo é: " + id_termo);
        let results = await con.awaitQuery('DELETE FROM DISCO WHERE ID_TERMO = (?)', [id_termo])
        console.log(results)
        excluiu = true;
    }

    if (existeIdTermo(id_termo)) {
        await log.print("Removendo termo id: " + id_termo)
        let results = await con.awaitQuery('DELETE FROM TERMO WHERE ID = (?)', [id_termo])
        console.log(results)
        excluiu = true;
    }

    return excluiu        
}

async function buscaEmail() {
    var sql = "SELECT EMAIL AS EMAIL FROM EMAIL";
    let results = await con.awaitQuery(sql)
    return (results == '' || results == 'undefined' ) ? null : results[0].EMAIL
}

async function salvarEmail(email) {

    await log.print('Salvando email: ' + email)

    var sql = "SELECT COUNT(*) AS QTD FROM EMAIL";
    let results = await con.awaitQuery(sql, [])
        
    if (results[0] == '' || results[0].QTD == 0) {
        await con.awaitQuery('INSERT INTO EMAIL(EMAIL) VALUES (?)', [email])
        await log.print('Inserindo email: ' + email)
    } else {
        await con.awaitQuery('UPDATE EMAIL SET EMAIL = ?', [email])
        await log.print('Atualizando email para: ' + email)
    }
}

async function temDadosNoArquivoUrl() {
    try {
        let content = fs.readFileSync('./urls.txt');
        if (content == null || content == '') 
            return false
        return true
    } catch (err) {return false}
}

async function gravarNoArquivoEmail(data) {
    fs.appendFile('./email.txt', (data + "\n"), (err) => {
        if (err)  {log.print(err)};
    });
}

async function gravarNoArquivoNovaUrl(data) {
    fs.appendFile('./urls.txt', (data + "\n"), (err) => {
        if (err)  {log.print(err)};
    });
}

function apagarArquivoUrl() {
    try {
        log.print('Apagando arquivo de urls')
        fs.unlinkSync('./urls.txt')
    } catch(err) { log.print(err) }
}

function apagarArquivoEmail() {
    try {
        log.print('Apagando arquivo de email')
        fs.unlinkSync('./email.txt')
    } catch(err) { log.print(err) }
}

async function tratarRegistro(disco) {

    try {
        if (typeof(data) != "undefined" && typeof(data.length) != "undefined") {
            let data = disco.data[0]
            for (var i = 0; i < data.length; i++) {
                let reg = data[i]
                if (false === await existeCodigo(reg.id)) {
                    let url = await inserirNovoDisco(reg.id, disco.id_termo, reg.thumb, reg.title, reg.price)
                    await gravarNoArquivoNovaUrl(
                        emailMaker.montarAmostraDisco (reg.id, reg.thumb, reg.title, reg.price, url)
                    );
                } else {
                    await log.print("Nenhum disco novo encontrado para o termo: " + disco.termo)
                }
            }
        }
    } catch (error) {
        await log.print('tratarRegistro')
        await log.print(error)
    }
}





module.exports = {
    carregarArquivoUrls,
    carregarArquivoEmail,
    todosTermos,
    existeCodigo,
    existeTermo,
    existeIdTermo,
    existeTermoEmDisco,
    inserirNovoDisco,
    inserirNovoTermoDeBusca,
    removerTermoDeBusca,
    buscaEmail,
    salvarEmail,
    gravarNoArquivoNovaUrl,
    tratarRegistro,
    setConnection,
    apagarArquivoUrl,
    apagarArquivoEmail,
    temDadosNoArquivoUrl,
    gravarNoArquivoEmail
}