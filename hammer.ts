import { shell } from './src/system/index'

export async function start(input: string) {
    await shell([
        'hammer watch hammer.ts --dist dist/inner',
        'hammer watch hammer.ts --dist dist/outer'
    ])
    console.log('hello world', input)
}
