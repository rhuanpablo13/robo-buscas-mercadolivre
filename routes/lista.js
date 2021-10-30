const express = require('express');
const router = express.Router();
const passport = require('passport');

const resources = require('../resources/resources');
const log = require('../resources/log');


/* GET lista page. */
router.get('/', async (req, res, next) => {
    
    log.print("Iniciando...")

    let todosOsTermos = await resources.todosTermos();
    let email = await resources.buscaEmail();

    if (todosOsTermos == null) {
        res.render('lista', {
            msg: '',
            items: [],
            email: email
        });
    } else {
        res.render('lista', {
            msg: '',
            items: todosOsTermos,
            email: email
        });
    }

});


/* POST lista page */
router.post('/adicionar', async (req, res, next) => {

    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'   
    });

    let termo = req.body.termo;
    if (termo !== '') {
        let retorno = await inserirNovoTermoDeBusca(termo)
        if (retorno == null) {
            res.status(401).send({
                error: 'Termo já está cadastrado'
            })
            return;
        }
        let id = retorno[0].insertId;
        
        log.print("Novo termo: " + termo)

        res.status(200).send(
            `<li id="${id}">
                <label>${termo}</label>
                <input type="hidden" value='{"id": ${id}, "disco": "${termo}"}' name='discos'/>
                <button type="reset" class="close" id="${id}" onclick="excluir(this);"><i class="fa fa-close"></i></button>
            </li>`
        );
    }
});


/* DELETE lista page */
router.delete('/deletar', async (req, res, next) => {

    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'   
    });

    let id = parseInt(req.body.id);
    let retorno = await removerTermoDeBusca(id)
    if (retorno == -1) {
        console.log.print('erro ao excluir')
        res.status(401).send({
            error: 'Erro ao excluir termo'
        })
    }
    res.sendStatus(201).send('')
});


/* POST lista page */
router.post('/salvar', async (req, res, next) => {

    passport.authenticate('local', {
        failureRedirect: '/login?fail=true'
    });

    let email = req.body.email;
    if (email == null || email == 'undefined' || email == '') {
        res.status(500).send({
            error: 'Informe seu email'
        })
        return;
    }

    await salvarEmail(email);

    log.print('Salvando e saindo...')

    res.status(200).send({
        success: 'Okay! Tudo salvo por aqui... Agora é só aguardar os emails :)'
    })
    
    await executarRobo()
});


/* POST lista page */
router.post('/testeEmail', async (req, res, next) => {

    passport.authenticate('local', () => {
        res.redirect ('/login?fail=true')
    });

    let email = req.body.email;
    if (email == null || email == 'undefined' || email == '') {
        res.status(500).send({
            error: 'Informe seu email para teste'
        })
        return;
    }

    await enviarEmailTeste(email)
    .then(response => {
        if (response) {
            res.status(200).send({
                success: 'Email de teste enviado com sucesso! :)'
            })
            return;
        }
        res.status(500).send({
            error: 'Houve uma falha ao enviar para este email... :('
        })
    })
    .catch(err => console.log.print(err))
    
});

module.exports = router;