#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = process.argv.slice(2)
const DEFAULT_PROJECT_NAME = 'my-uni-render-project'
let projectName = args[0] || DEFAULT_PROJECT_NAME

// 如果使用默认名称且目录已存在，尝试添加数字后缀
if (!args[0] && existsSync(join(process.cwd(), projectName))) {
    let counter = 1
    while (existsSync(join(process.cwd(), `${projectName}-${counter}`))) {
        counter++
    }
    projectName = `${projectName}-${counter}`
    console.log(`⚠️  Default project name "${DEFAULT_PROJECT_NAME}" already exists, using "${projectName}" instead.\n`)
}

const targetDir = join(process.cwd(), projectName)

if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists.`)
    process.exit(1)
}

console.log(`\n🚀 Creating UniApp render project: ${projectName}\n`)

// 复制模板
const templateDir = join(__dirname, '..', 'template')
copyDir(templateDir, targetDir)

// 更新 package.json 中的项目名
const pkgPath = join(targetDir, 'package.json')
if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    pkg.name = projectName
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
}

console.log('✅ Project created successfully!\n')
console.log('Next steps:')
console.log(`  cd ${projectName}`)
console.log('  npm install')
console.log('  npm run dev:h5')
console.log('')

function copyDir(src, dest) {
    mkdirSync(dest, { recursive: true })

    for (const file of readdirSync(src)) {
        const srcPath = join(src, file)
        const destPath = join(dest, file)

        if (statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath)
        } else {
            copyFileSync(srcPath, destPath)
        }
    }
}
