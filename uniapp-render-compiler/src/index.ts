/**
 * uniapp-render-compiler
 * 
 * 使用 @vue/compiler-sfc 解析 Vue SFC 文件
 * 使用 Slime AST 转换 script 内容
 */

import { parse as parseSFC } from '@vue/compiler-sfc'
import * as vueShared from '@vue/shared'
import { SlimeParser, SlimeCstToAst } from 'slime-parser'
import { SlimeGenerator } from 'slime-generator'
import { SlimeAstTypeName } from 'slime-ast'

// 调试：打印 @vue/shared 信息
console.log('[compiler] @vue/shared keys:', Object.keys(vueShared).slice(0, 20))
console.log('[compiler] @vue/shared.genCacheKey:', vueShared.genCacheKey)
console.log('[compiler] @vue/shared has genCacheKey?', 'genCacheKey' in vueShared)

interface SFCBlock {
    hasTemplate: boolean
    script: {
        attrs: string
        content: string
    }
    styles: string[]
}

/**
 * 转换 Vue SFC 文件
 * 
 * @returns 转换后的代码，如果不需要转换返回 null
 */
export function transformVueSFC(vueCode: string): string | null {
    try {
        // 1. 使用 @vue/compiler-sfc 解析 Vue SFC
        const { descriptor } = parseSFC(vueCode, {
            filename: 'anonymous.vue'
        })

        // 2. 提取 blocks
        const blocks: SFCBlock = {
            hasTemplate: !!descriptor.template && descriptor.template.content.trim().length > 0,
            script: {
                attrs: descriptor.script?.lang ? ` lang="${descriptor.script.lang}"` : '',
                content: descriptor.script?.content || ''
            },
            styles: descriptor.styles.map(style => {
                const attrs = style.scoped ? ' scoped' : ''
                return `<style${attrs}>${style.content}</style>`
            })
        }

        if (!blocks.script.content) {
            return null
        }

        // 3. 有 template → 不处理
        if (blocks.hasTemplate) {
            return null
        }

        // 4. 检查是否已使用 uniapp-render
        if (blocks.script.content.includes("from 'uniapp-render'") ||
            blocks.script.content.includes('from "uniapp-render"')) {
            return null
        }

        // 5. 使用 Slime Parser 转换 script
        const transformedScript = transformScript(blocks.script.content)
        if (!transformedScript) {
            return null
        }

        // 6. 构建新的 SFC
        return buildTransformedSFC(blocks, transformedScript)
    } catch (e: any) {
        console.error('[compiler] Full error:', e)
        console.error('[compiler] Stack:', e.stack)
        console.warn(`[uniapp-render-compiler] 转换失败: ${e.message}`)
        return null
    }
}

/**
 * 使用 Slime 转换 script
 * 
 * 策略：
 * 1. 保留用户的 import { defineComponent } from 'vue' 不变
 * 2. 在第一个 import 之前添加 import { defineRenderComponent } from 'uniapp-render'
 * 3. 把 export default defineComponent({...}) 改为 export default defineRenderComponent({...})
 */
function transformScript(scriptContent: string): string | null {
    try {
        const parser = new SlimeParser(scriptContent)
        const cst = parser.Program()

        if (!cst || !parser.parsedTokens || parser.parsedTokens.length === 0) {
            return null
        }

        const cstToAst = new SlimeCstToAst()
        const ast = cstToAst.toProgram(cst) as any
        if (!ast) return null

        // 查找 export default defineComponent(...) 并替换为 defineRenderComponent(...)
        let foundDefineComponent = false
        for (const statement of ast.body) {
            if (statement.type === SlimeAstTypeName.ExportDefaultDeclaration) {
                const declaration = statement.declaration
                // 检查是否是 defineComponent(...) 调用
                if (declaration &&
                    declaration.type === SlimeAstTypeName.CallExpression &&
                    declaration.callee &&
                    declaration.callee.type === SlimeAstTypeName.Identifier &&
                    declaration.callee.name === 'defineComponent') {

                    console.log('[compiler] Found export default defineComponent(...)')
                    // 修改 callee 名称为 defineRenderComponent
                    declaration.callee.name = 'defineRenderComponent'
                    // 同时修改 raw（如果存在），因为 Generator 优先使用 raw
                    if (declaration.callee.raw) {
                        declaration.callee.raw = 'defineRenderComponent'
                    }
                    // 修改 loc.value（如果存在）
                    if (declaration.callee.loc && declaration.callee.loc.value) {
                        declaration.callee.loc.value = 'defineRenderComponent'
                    }
                    foundDefineComponent = true
                }
            }
        }

        if (!foundDefineComponent) {
            console.log('[compiler] No defineComponent found, skipping')
            return null
        }

        // 生成代码
        const result = SlimeGenerator.generator(ast, parser.parsedTokens)

        // 在生成的代码开头添加 defineRenderComponent 导入
        const importLine = "import { defineRenderComponent } from 'uniapp-render';\n"
        const finalCode = importLine + result.code

        console.log('[compiler] Generated code:', finalCode.substring(0, 300))
        return finalCode
    } catch (e: any) {
        console.warn(`[uniapp-render-compiler] 解析失败: ${e.message}`)
        return null
    }
}

/**
 * 构建转换后的 SFC
 */
function buildTransformedSFC(blocks: SFCBlock, transformedScript: string): string {
    const styleParts = blocks.styles.join('\n\n')

    return `<template>
  <render-component :node="node" />
</template>

<script${blocks.script.attrs}>${transformedScript}</script>
${styleParts ? '\n' + styleParts : ''}`
}
