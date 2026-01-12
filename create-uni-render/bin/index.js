#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = process.argv.slice(2)
const DEFAULT_PROJECT_NAME = 'my-uni-render-project'
let projectName = args[0] || DEFAULT_PROJECT_NAME

// 模板仓库地址
const TEMPLATE_REPO = 'https://gitee.com/alamhubb/uni-render-template.git'

// 如果使用默认名称且目录已存在，尝试添加数字后缀
if (!args[0] && existsSync(join(process.cwd(), projectName))) {
    let counter = 1
    while (existsSync(join(process.cwd(), `${projectName}-${counter}`))) {
        counter++
    }
    projectName = `${projectName}-${counter}`
    console.log(`⚠️  默认项目名 "${DEFAULT_PROJECT_NAME}" 已存在，使用 "${projectName}" 代替。\n`)
}

const targetDir = join(process.cwd(), projectName)

if (existsSync(targetDir)) {
    console.error(`❌ 错误：目录 "${projectName}" 已存在。`)
    process.exit(1)
}

console.log(`\n🚀 正在创建 UniApp Render 项目: ${projectName}\n`)

try {
    // 检查是否安装了 git
    try {
        execSync('git --version', { stdio: 'ignore' })
    } catch {
        console.error('❌ 错误：未检测到 git，请先安装 git。')
        console.error('   下载地址：https://git-scm.com/downloads')
        process.exit(1)
    }

    // 克隆模板仓库
    console.log('📦 正在下载模板...')
    execSync(`git clone --depth 1 ${TEMPLATE_REPO} "${targetDir}"`, {
        stdio: 'inherit'
    })

    // 删除 .git 目录
    const gitDir = join(targetDir, '.git')
    if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true })
    }

    // 更新 package.json 中的项目名
    const pkgPath = join(targetDir, 'package.json')
    if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        pkg.name = projectName
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    }

    console.log('\n✅ 项目创建成功！\n')
    console.log('下一步：')
    console.log(`  cd ${projectName}`)
    console.log('  npm install')
    console.log('  npm run dev:h5')
    console.log('')
} catch (error) {
    console.error('\n❌ 创建项目失败：', error.message)

    // 清理失败的目录
    if (existsSync(targetDir)) {
        try {
            rmSync(targetDir, { recursive: true, force: true })
        } catch { }
    }

    process.exit(1)
}
