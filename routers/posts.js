const router = require('koa-router')();
const userModel = require('../lib/mysql.js')
const moment = require('moment')
const checkNotLogin = require('../middlewares/check.js').checkNotLogin
const checkLogin = require('../middlewares/check.js').checkLogin
const md = require('markdown-it')()

router.get('/', async(ctx, next) => {
    ctx.redirect('/posts')
})

router.get('/posts', async(ctx, next) => {
    let res,
        postsLength,
        name = decodeURIComponent(ctx.request.querystring.split('=')[1])
    if (ctx.request.querystring) {
        await userModel.findDataByUser(name)
            .then(result => {
                postsLength = result.length
            })
        await userModel.findPostByUserPage(name, 1)
            .then(result => {
                res = result
            })
        await ctx.render('selfPosts', {
            session: ctx.session,
            posts: res,
            postsPageLength: Math.ceil(postsLength / 10)
        })
    } else {
        await userModel.findPostByPage(1)
            .then(result => {
                res = result
            })
        await userModel.findAllPost()
            .then(result => {
                postsLength = result.length
            })
            // console.log(ctx.session)
        await ctx.render('posts', {
            session: ctx.session,
            posts: res,
            postsLength: postsLength,
            postsPageLength: Math.ceil(postsLength / 10)
        })
    }
})

// 首页分页，每次输出10条
router.post('/posts/page', async(ctx, next) => {
    let page = ctx.request.body.page;
    await userModel.findPostByPage(page)
            .then(result=>{
                //console.log(result)
                ctx.body = result   
            }).catch(()=>{
            ctx.body = 'error'
        })  
})

// 个人文章分页，每次输出10条
router.post('/posts/self/page', async(ctx, next) => {
    let data = ctx.request.body
    await userModel.findPostByUserPage(data.name,data.page)
            .then(result=>{
                //console.log(result)
                ctx.body = result   
            }).catch(()=>{
            ctx.body = 'error'
        })  
})

// 发表文章页面
router.get('/create', async(ctx, next) => {
    await ctx.render('create', {
        session: ctx.session
    })
})

// 发表文章
router.post('/create', async(ctx, next) => {
    let title = ctx.request.body.title,
        content = ctx.request.body.content,
        id = ctx.session.id,
        name = ctx.session.user,
        time = moment().format('YYYY-MM-DD HH:mm:ss'),
        avator,
        // 现在使用markdown不需要单独转义
        newContent = content.replace(/[<">']/g, (target) => { 
            return {
                '<': '&lt;',
                '"': '&quot;',
                '>': '&gt;',
                "'": '&#39;'
            }[target]
        }),
        newTitle = title.replace(/[<">']/g, (target) => {
            return {
                '<': '&lt;',
                '"': '&quot;',
                '>': '&gt;',
                "'": '&#39;'
            }[target]
        });

        await userModel.findUserData(ctx.session.user)
            .then(result => {
                avator = result[0]['avator']
            })
        await userModel.insertPost([name, newTitle, md.render(content), newContent, id, time, avator])
            .then(() => {
                ctx.body = {
                    status: 1,
                    data: [],
                    msg: '发布成功'
                }
            }).catch((error) => {
                ctx.body = {
                    status: 0,
                    data: [],
                    msg: 'error'
                }
            })
    })

    // 单篇文章页
    router.get('/posts/:postId', async(ctx, next) => {
        let comment_res,
            res,
            pageOne,
            res_pv
        await userModel.findDataById(ctx.params.postId)
            .then(result => {
                res = result
                res_pv = parseInt(result[0]['pv'])
                res_pv += 1
            })
        await userModel.updatePostPv([res_pv, ctx.params.postId])
        await userModel.findCommentByPage(1, ctx.params.postId)
            .then(result => {
                pageOne = result
            })
        await userModel.findCommentById(ctx.params.postId)
            .then(result => {
                comment_res = result
            })
        await ctx.render('sPost', {
            session: ctx.session,
            posts: res[0],
            commentLength: comment_res.length,
            commentPageLength: Math.ceil(comment_res.length / 10),
            pageOne: pageOne
        })
    })
    // 编辑单篇文章页面
    router.get('/posts/:postId/edit', async(ctx, next) => {
        let name = ctx.session.user,
            postId = ctx.params.postId,
            res;
        await userModel.findDataById(postId)
            .then(result => {
                res = result[0]
                //console.log('修改文章', res)
            })
        await ctx.render('edit', {
            session: ctx.session,
            postsContent: res.md,
            postsTitle: res.title
        })

    })

    // post 编辑单篇文章
    router.post('/posts/:postId/edit', async(ctx, next) => {
        let title = ctx.request.body.title,
            content = ctx.request.body.content,
            id = ctx.session.id,
            postId = ctx.params.postId,
            // 现在使用markdown不需要单独转义
            newTitle = title.replace(/[<">']/g, (target) => {
                return {
                    '<': '&lt;',
                    '"': '&quot;',
                    '>': '&gt;',
                    "'": '&#39;'
                }[target]
            }),
            newContent = content.replace(/[<">']/g, (target) => {
                return {
                    '<': '&lt;',
                    '"': '&quot;',
                    '>': '&gt;',
                    "'": '&#39;'
                }[target]
            });
        await userModel.updatePost([newTitle, md.render(content), content, postId])
            .then(() => {
                ctx.body = true
            }).catch(() => {
                ctx.body = false
            })
    })
    // 删除文章
    router.post('/posts/:postId/remove', async(ctx, next) => {
        let postId = ctx.params.postId
        // 删除所有评论
        await userModel.deleteAllPostComment(postId)
        await userModel.deletePost(postId)
            .then(res => {
                ctx.body = {
                    status: 1,
                    data: [],
                    msg: '删除成功'
                }
            }).catch(err => {
                ctx.body = {
                    status: 0,
                    data: [],
                    msg: '删除失败'
                }
            })
    })

    // 发表评论
    router.post('/:postId', async(ctx, next) => {
        let name = ctx.session.user,
            content = ctx.request.body.content,
            postId = ctx.params.postId,
            res_comments,
            time = moment().format('YYYY-MM-DD HH:mm:ss'),
            avator
        await userModel.findUserData(ctx.session.user)
            .then(res => {
                avator = res[0]['avator']
            })
        await userModel.insertComment([name, md.render(content), time, postId, avator])
        await userModel.findDataById(postId)
            .then(result => {
                res_comments = parseInt(result[0]['comments'])
                res_comments += 1
            })
        await userModel.updatePostComment([res_comments, postId])
            .then(() => {
                ctx.body = {
                    status: 1,
                    data: [],
                    msg: '评论成功'
                }
            }).catch(() => {
                ctx.body = {
                    status: 0,
                    data: [],
                    msg: 'error'
                }
            })
    })

    // 删除评论
    router.post('/posts/:postId/comment/:commentId/remove', async(ctx, next) => {
        let postId = ctx.params.postId,
            commentId = ctx.params.commentId,
            res_comments
        await userModel.findDataById(postId)
            .then(result => {
                res_comments = parseInt(result[0]['comments'])
                res_comments -= 1
            })
        await userModel.updatePostComment([res_comments, postId])
            
        await userModel.deleteComment(commentId)
            .then(() => {
                ctx.body = {
                    status: 1,
                    data: [],
                    msg: '删除成功'
                }
            }).catch(err => {
                ctx.body = {
                    status: 0,
                    data: [],
                    msg: '删除失败'
                }
            })
    })
    // 评论分页
    router.post('/posts/:postId/commentPage', async function(ctx){
        let postId = ctx.params.postId,
            page = ctx.request.body.page;
        await userModel.findCommentByPage(page, postId)
            .then(res=>{
                ctx.body = res
            }).catch(()=>{
                ctx.body = 'error'
            })  
    })
module.exports = router