import { rm } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { existsSync } from "node:fs"
import { emptyDir, __dirname } from "./_utils.js"

async function main () {
	const distPath = joinPath(__dirname, "dist")
	const buildPath = joinPath(__dirname, "build")
	if (existsSync(distPath)) await rm(distPath, { recursive: true })
	if (existsSync(buildPath)) await emptyDir(buildPath)
}

main()
