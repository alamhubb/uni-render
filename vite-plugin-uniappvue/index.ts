/**
 * vite-plugin-uniappvue
 * 
 * Vite 插件 - 为 uniapp-vue Custom Renderer 提供支持
 * 
 * 功能：
 * 1. 设置 Vue alias 指向 uniapp-vue
 * 2. 自动将纯 .ts/.js 渲染函数文件转换为带 RenderNode 的 Vue 组件
 * 3. 处理空 WXML，替换为 render.wxml 引用
 */

import type { Plugin, ResolvedConfig } from 'vite'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { sync as globSync } from 'glob'
import { relative, dirname, basename, join } from 'path'
import { SlimeParser, SlimeCstToAstUtils, registerSlimeCstToAstUtil } from 'slime-parser'
import { SlimeGenerator, type SlimeGeneratorResult } from 'slime-generator'
import {
    SlimeAstCreateUtils,
    SlimeAstTypeName,
    type SlimeProgram,
    type SlimeImportDeclaration,
    type SlimeExportDefaultDeclaration,
    type SlimeObjectExpression,
    type SlimeProperty,
    type SlimeFunctionExpression,
    type SlimeReturnStatement,
    type SlimeCallExpression,
    type SlimeIdentifier
} from 'slime-ast'

export interface UniappVueOptions {
    debug?: boolean
    mpDist?: string
    srcDir?: string
}

export function uniappVue(options: UniappVueOptions = {}): Plugin {
    const {
        debug = false,
        mpDist = 'dist/dev/mp-weixin',
        srcDir = 'src'
    } = options

    const log = (...args: any[]) => {
        if (debug) {
            console.log('[vite-plugin-uniappvue]', ...args)
        }
    }

    const uniappVuePackage = 'uniapp-vue'

    return {
        name: 'vite-plugin-uniappvue',
        enforce: 'pre',

        config(config) {
            log('Configuring Vue alias...')
            config.resolve = config.resolve || {}
            config.resolve.alias = config.resolve.alias || {}
            const alias = config.resolve.alias as Record<string, string>
            alias['vue'] = uniappVuePackage
            log('Vue alias set to:', uniappVuePackage)
            return config
        },

        configResolved(resolvedConfig: ResolvedConfig) {
            log('Config resolved')
        },

        transform(code, id) {
            // 只处理 pages 目录下的 .ts/.js 文件
            if (!id.includes('/pages/') && !id.includes('\\pages\\')) {
                return null
            }

            if (!id.endsWith('.ts') && !id.endsWith('.js')) {
                return null
            }

            // 检查同目录下是否有 .vue 文件
            const dir = dirname(id)
            const baseName = basename(id).replace(/\.(ts|js)$/, '')
            const vueFilePath = join(dir, `${baseName}.vue`)

            if (existsSync(vueFilePath)) {
                log(`跳过 ${id} - 存在对应的 .vue 文件`)
                return null
            }

            log(`转换 ${id} - 使用 slime-parser AST 处理`)

            try {
                const result = transformRenderFunction(code, id)

                if (result) {
                    console.log(`[vite-plugin-uniappvue] ✓ 已转换: ${relative(process.cwd(), id)}`)
                    return {
                        code: result.code,
                        map: null
                    }
                }
            } catch (e: any) {
                console.warn(`[vite-plugin-uniappvue] 转换失败 ${id}: ${e.message}`)
            }

            return null
        },

        async writeBundle() {
            if (!existsSync(mpDist)) {
                log(`Output directory ${mpDist} not found, skipping WXML processing`)
                return
            }

            log('Processing WXML files in', mpDist)
            const wxmlFiles = globSync(`${mpDist}/pages/**/*.wxml`)
            let processedCount = 0

            for (const filePath of wxmlFiles) {
                const content = readFileSync(filePath, 'utf-8').trim()
                const isEmpty =
                    content === '' ||
                    content === '<view></view>' ||
                    content === '<view class="content"></view>' ||
                    /^<view[^>]*>\s*<\/view>$/.test(content)

                if (isEmpty) {
                    const newContent = `<block>
  <import src="/templates/render.wxml"/>
  <template is="render" data="{{vnodeTree}}" />
</block>`
                    writeFileSync(filePath, newContent, 'utf-8')
                    processedCount++
                    log(`✓ ${relative(mpDist, filePath)} - 已添加 Custom Renderer 支持`)
                }
            }

            if (processedCount > 0) {
                console.log(`[vite-plugin-uniappvue] 已为 ${processedCount} 个页面添加 Custom Renderer 支持`)
            }
        }
    }
}

/**
 * 使用 slime-parser 转换纯渲染函数文件
 */
function transformRenderFunction(code: string, filePath: string): SlimeGeneratorResult | null {
    registerSlimeCstToAstUtil(SlimeCstToAstUtils)

    const parser = new SlimeParser(code)
    const cst = parser.Program('module')

    if (!cst) {
        return null
    }

    const ast = SlimeCstToAstUtils.toFileAst(cst) as SlimeProgram

    if (!ast || !ast.body) {
        return null
    }

    // 查找 export default
    const exportDefault = findExportDefault(ast)
    if (!exportDefault) {
        return null
    }

    // 查找并包装 setup 方法中的渲染函数
    const setupMethod = findSetupMethod(exportDefault)
    if (!setupMethod) {
        return null
    }

    // 检查是否有渲染函数返回
    if (!hasRenderFunctionInSetup(setupMethod)) {
        return null
    }

    // 添加 uniapp-vue 导入
    addUniappVueImport(ast)

    // 包装渲染函数
    wrapRenderFunctionInSetup(setupMethod)

    // 生成代码
    const tokens = parser.parsedTokens
    const result = SlimeGenerator.generator(ast, tokens)

    return result
}

/**
 * 查找 export default 声明
 */
function findExportDefault(ast: SlimeProgram): any | null {
    for (const stmt of ast.body) {
        if (stmt.type === SlimeAstTypeName.ExportDefaultDeclaration) {
            return stmt
        }
    }
    return null
}

/**
 * 查找 setup 方法
 */
function findSetupMethod(exportDefault: any): any | null {
    const declaration = exportDefault.declaration

    if (!declaration || declaration.type !== SlimeAstTypeName.ObjectExpression) {
        return null
    }

    const objExpr = declaration as SlimeObjectExpression

    for (const prop of objExpr.properties || []) {
        if (prop.type === SlimeAstTypeName.Property) {
            const property = prop as SlimeProperty
            const key = property.key as SlimeIdentifier

            if (key && key.type === SlimeAstTypeName.Identifier && key.name === 'setup') {
                return property.value
            }
        }
    }

    return null
}

/**
 * 检查 setup 方法中是否有渲染函数返回
 */
function hasRenderFunctionInSetup(setupMethod: any): boolean {
    if (!setupMethod || setupMethod.type !== SlimeAstTypeName.FunctionExpression) {
        return false
    }

    const funcExpr = setupMethod as SlimeFunctionExpression
    const body = funcExpr.body

    if (!body || !body.body) {
        return false
    }

    // 查找 return 语句
    for (const stmt of body.body) {
        if (stmt.type === SlimeAstTypeName.ReturnStatement) {
            const returnStmt = stmt as SlimeReturnStatement
            const argument = returnStmt.argument

            // 检查是否是箭头函数
            if (argument &&
                (argument.type === SlimeAstTypeName.ArrowFunctionExpression ||
                    argument.type === SlimeAstTypeName.FunctionExpression)) {
                return true
            }
        }
    }

    return false
}

/**
 * 添加 uniapp-vue 导入
 */
function addUniappVueImport(ast: SlimeProgram): void {
    // 检查是否已有导入
    for (const stmt of ast.body) {
        if (stmt.type === SlimeAstTypeName.ImportDeclaration) {
            const imp = stmt as SlimeImportDeclaration
            if (imp.source?.value === 'uniapp-vue') {
                return
            }
        }
    }

    // 创建导入声明
    const importDecl = SlimeAstCreateUtils.createImportDeclaration()
    importDecl.source = SlimeAstCreateUtils.createStringLiteral('uniapp-vue')
    importDecl.specifiers = [
        createImportSpecifier('useVnodeTree'),
        createImportSpecifier('RenderNode')
    ]

    ast.body.unshift(importDecl)
}

function createImportSpecifier(name: string): any {
    const spec = SlimeAstCreateUtils.createImportSpecifier()
    spec.imported = SlimeAstCreateUtils.createIdentifier(name)
    spec.local = SlimeAstCreateUtils.createIdentifier(name)
    return spec
}

/**
 * 包装 setup 方法中的渲染函数
 * 将 return () => h(...) 改为 return { vnodeTree: useVnodeTree(() => h(...)), RenderNode }
 */
function wrapRenderFunctionInSetup(setupMethod: any): void {
    if (setupMethod.type !== SlimeAstTypeName.FunctionExpression) {
        return
    }

    const funcExpr = setupMethod as SlimeFunctionExpression
    const body = funcExpr.body

    if (!body || !body.body) {
        return
    }

    // 查找并修改 return 语句
    for (let i = 0; i < body.body.length; i++) {
        const stmt = body.body[i]

        if (stmt.type === SlimeAstTypeName.ReturnStatement) {
            const returnStmt = stmt as SlimeReturnStatement
            const argument = returnStmt.argument

            if (argument &&
                (argument.type === SlimeAstTypeName.ArrowFunctionExpression ||
                    argument.type === SlimeAstTypeName.FunctionExpression)) {

                // 创建 useVnodeTree 调用
                const useVnodeTreeCall = SlimeAstCreateUtils.createCallExpression()
                useVnodeTreeCall.callee = SlimeAstCreateUtils.createIdentifier('useVnodeTree')
                useVnodeTreeCall.arguments = [argument]

                // 创建返回对象
                const returnObj = SlimeAstCreateUtils.createObjectExpression()

                // vnodeTree: useVnodeTree(...)
                const vnodeTreeProp = SlimeAstCreateUtils.createProperty()
                vnodeTreeProp.key = SlimeAstCreateUtils.createIdentifier('vnodeTree')
                vnodeTreeProp.value = useVnodeTreeCall
                vnodeTreeProp.shorthand = false
                vnodeTreeProp.computed = false

                // RenderNode: RenderNode
                const renderNodeProp = SlimeAstCreateUtils.createProperty()
                renderNodeProp.key = SlimeAstCreateUtils.createIdentifier('RenderNode')
                renderNodeProp.value = SlimeAstCreateUtils.createIdentifier('RenderNode')
                renderNodeProp.shorthand = true
                renderNodeProp.computed = false

                returnObj.properties = [vnodeTreeProp, renderNodeProp]

                // 替换 return 语句的参数
                returnStmt.argument = returnObj
            }
        }
    }
}

export default uniappVue
