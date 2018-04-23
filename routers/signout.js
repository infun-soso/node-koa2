const router = require('koa-router')();

router.get('/signout', async(ctx, next) => {
    ctx.session = null;
    ctx.body = {
        status: 1,
        data: [],
        msg: '登出成功'
    }
})

module.exports = router