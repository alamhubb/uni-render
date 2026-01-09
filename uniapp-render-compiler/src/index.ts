/**
 * uniapp-render-compiler
 * 
 * 使用 Slime XML + Slime AST 转换 Vue SFC 文件
 * 
 * 逻辑：
 * - 有 template → 不处理
 * - 没有 template → 转换
 */

import { XmlParser } from 'slime-xml'
import { SlimeParser, SlimeCstToAst } from 'slime-parser'
import { SlimeGenerator } from 'slime-generator'
import { SlimeAstTypeName } from 'slime-ast'

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
        // 1. 使用 XML Parser 解析 Vue SFC
        const parser = new XmlParser(vueCode)
        const cst = parser.Document()

        if (!cst || !cst.children || cst.children.length === 0) {
            return null
        }

        // 2. 从 XML CST 中提取 SFC 块
        const blocks = extractSFCBlocksFromCST(vueCode, cst)

        if (!blocks || !blocks.script.content) {
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
        console.warn(`[uniapp-render-compiler] 转换失败: ${e.message}`)
        return null
    }
}

/**
 * 从 XML CST 中提取 SFC 块
 */
function extractSFCBlocksFromCST(vueCode: string, cst: any): SFCBlock | null {
    const result: SFCBlock = {
        hasTemplate: false,
        script: { attrs: '', content: '' },
        styles: []
    }

    if (!cst.children) return null

    for (const child of cst.children) {
        if (!child || child.name !== 'element') continue

        const element = child.children
        if (!element) continue

        const tagName = getTagName(element)

        if (tagName === 'template') {
            // 检查 template 是否有内容
            const content = extractTextContent(element, vueCode)
            result.hasTemplate = content.trim().length > 0
        } else if (tagName === 'script') {
            result.script.content = extractTextContent(element, vueCode)
            result.script.attrs = extractAttributesString(element)
        } else if (tagName === 'style') {
            const fullStyle = extractFullTag(element, vueCode)
            if (fullStyle) {
                result.styles.push(fullStyle)
            }
        }
    }

    return result
}

/**
 * 获取标签名
 */
function getTagName(element: any): string {
    if (!element.Name || !element.Name[0]) return ''
    return element.Name[0].image || ''
}

/**
 * 提取文本内容
 */
function extractTextContent(element: any, vueCode: string): string {
    if (!element.content || element.content.length === 0) {
        return ''
    }

    let content = ''

    for (const contentItem of element.content) {
        if (!contentItem.children) continue

        const chardata = contentItem.children.chardata
        if (chardata && chardata.length > 0) {
            for (const cd of chardata) {
                if (cd.children && cd.children.TEXT) {
                    content += cd.children.TEXT.map((t: any) => t.image).join('')
                }
                if (cd.children && cd.children.SEA_WS) {
                    content += cd.children.SEA_WS.map((t: any) => t.image).join('')
                }
            }
        }

        if (contentItem.children.SEA_WS) {
            content += contentItem.children.SEA_WS.map((t: any) => t.image).join('')
        }
    }

    return content
}

/**
 * 提取属性字符串
 */
function extractAttributesString(element: any): string {
    if (!element.attribute || element.attribute.length === 0) {
        return ''
    }

    const attrs: string[] = []

    for (const attr of element.attribute) {
        if (!attr.children) continue

        const name = attr.children.Name ? attr.children.Name[0].image : ''

        if (attr.children.STRING) {
            const value = attr.children.STRING[0].image
            attrs.push(`${name}=${value}`)
        } else if (name) {
            attrs.push(name)
        }
    }

    return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

/**
 * 提取完整标签
 */
function extractFullTag(element: any, vueCode: string): string {
    const openToken = element.OPEN?.[0]
    const closeToken = element.CLOSE?.[0] || element.SLASH_CLOSE?.[0]

    if (!openToken || !closeToken) return ''

    const start = openToken.startOffset
    const end = closeToken.endOffset !== undefined
        ? closeToken.endOffset + 1
        : closeToken.startOffset + closeToken.image.length

    return vueCode.substring(start, end)
}

/**
 * 使用 Slime 转换 script
 */
function transformScript(scriptContent: string): string | null {
    try {
        const parser = new SlimeParser(scriptContent)
        const cst = parser.Program()

        if (!cst || !parser.parsedTokens || parser.parsedTokens.length === 0) {
            return null
        }

        const ast = SlimeCstToAst.toProgram(cst) as any
        if (!ast) return null

        // 替换 from 'vue' → from 'uniapp-render'
        for (const statement of ast.body) {
            if (statement.type === SlimeAstTypeName.ImportDeclaration) {
                if (statement.source && statement.source.value === 'vue') {
                    statement.source.value = 'uniapp-render'
                }
            }
        }

        const result = SlimeGenerator.generator(ast, parser.parsedTokens)
        return result.code
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
