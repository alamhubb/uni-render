#!/usr/bin/env node

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = process.argv.slice(2)
const projectName = args[0]

if (!projectName) {
    console.log('Usage: npx create-uniapp-render <project-name>')
    console.log('')
    console.log('Example:')
    console.log('  npx create-uniapp-render my-app')
    process.exit(1)
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
