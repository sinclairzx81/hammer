export async function clean() {
    await folder('target').delete().exec()
}

export async function start(target = 'target/watch') {
    const options = 'reference/index.html --outDir target/reference --watch'
    await file(`${target}/cli.js`).create().exec()
    await Promise.all([
        shell(`tsc --project src/tsconfig.json --outDir ${target} --watch`).exec(),
        shell(`smoke-run ${target} -x node ${target}/cli.js ${options}`).exec(),
    ])
}

export async function build(target = 'target/build') {
    await folder(`${target}`).delete().exec()
    await file(`${target}/index.js`).create().exec()
    await shell(`tsc --project src/tsconfig.json --outDir ${target}`).exec()
    await folder(`${target}`).add('src/hammer').exec()
    await folder(`${target}`).add('package.json').exec()
    await folder(`${target}`).add('license').exec()
    await folder(`${target}`).add('readme.md').exec()
    await shell(`cd ${target} && npm pack`).exec()
}

export async function install_cli(target = 'target/build') {
    await build()
    const package = JSON.parse(await file('./package.json').read('utf-8'))
    await shell(`cd ${target} && npm install sinclair-hammer-${package['version']}.tgz -g`).exec()
}