const router = require('koa-router')();
const userModel = require('../lib/mysql.js')
const md5 = require('md5')
const checkNotLogin = require('../middlewares/check.js').checkNotLogin
const checkLogin = require('../middlewares/check.js').checkLogin

router.get('/signin', async(ctx, next) => {
    await checkNotLogin(ctx)
    await ctx.render('signin', {
        session: ctx.session,
    })
})

router.post('/signin', async(ctx, next) => {
    // console.log(ctx.request.body)
    let name = ctx.request.body.name
    let pass = ctx.request.body.password

    await userModel.findUserData(name)
        .then(result => {
            let res = result;
            if (name === res[0]['name'] && md5(pass) === res[0]['pass']) {
                ctx.body = {
                    status: 1,
                    data: [],
                    msg: '登陆成功'
                }
                // console.log(res[0]['name'])
                ctx.session.user = res[0]['name']
                ctx.session.id = res[0]['id']
            } else {
                ctx.body = {
                    status: 0,
                    data: [],
                    msg: '用户名或密码错误'
                }
            }
        })
})
module.exports = router